import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface TestCase {
  id: string;
  name: string;
  description: string;
  category: string;
  context: Record<string, unknown>;
  messages: Array<{ role: string; content: string }>;
  assertions: {
    mustInclude?: string[];
    mustNotInclude?: string[];
    mustCallTool?: string;
    maxQuestionMarks?: number;
    description?: string;
  };
}

interface TestResult {
  testId: string;
  testName: string;
  passed: boolean;
  errors: string[];
  response?: string;
  toolsCalled?: string[];
  duration: number;
}

// Check if response includes required phrases
function checkMustInclude(response: string, phrases: string[]): string[] {
  const errors: string[] = [];
  const responseLower = response.toLowerCase();
  
  for (const phrase of phrases) {
    if (!responseLower.includes(phrase.toLowerCase())) {
      errors.push(`Missing required phrase: "${phrase}"`);
    }
  }
  
  return errors;
}

// Check if response excludes forbidden phrases
function checkMustNotInclude(response: string, phrases: string[]): string[] {
  const errors: string[] = [];
  const responseLower = response.toLowerCase();
  
  for (const phrase of phrases) {
    if (responseLower.includes(phrase.toLowerCase())) {
      errors.push(`Contains forbidden phrase: "${phrase}"`);
    }
  }
  
  return errors;
}

// Check maximum question marks
function checkMaxQuestionMarks(response: string, max: number): string[] {
  const questionCount = (response.match(/\?/g) || []).length;
  
  if (questionCount > max) {
    return [`Response has ${questionCount} question marks, max allowed is ${max}`];
  }
  
  return [];
}

// Check if a specific tool was called
function checkToolCalled(toolsCalled: string[], requiredTool: string): string[] {
  if (!toolsCalled.includes(requiredTool)) {
    return [`Required tool "${requiredTool}" was not called. Tools called: ${toolsCalled.join(", ") || "none"}`];
  }
  
  return [];
}

// Run a single test case
async function runTest(test: TestCase, supabaseUrl: string, serviceRoleKey: string): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  let response = "";
  let toolsCalled: string[] = [];
  
  try {
    // Call the studio-concierge function with the test messages
    // Format messages array: test.messages is already in [{role, content}] format
    const formattedMessages = test.messages.map((m: {role: string; content: string}) => ({
      role: m.role,
      content: m.content
    }));
    
    const conciergeResponse = await fetch(`${supabaseUrl}/functions/v1/studio-concierge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        messages: formattedMessages,
        context: {
          mode: "explore",
          ...test.context,
        },
        conversationId: `test_${test.id}_${Date.now()}`,
      }),
    });
    
    if (!conciergeResponse.ok) {
      errors.push(`Concierge API error: ${conciergeResponse.status}`);
    } else {
      // Read streamed response - handles OpenAI-style SSE format
      const reader = conciergeResponse.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        let buffer = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines from buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              
              // Skip [DONE] marker
              if (dataStr === "[DONE]") continue;
              
              try {
                const data = JSON.parse(dataStr);
                
                // OpenAI/Lovable AI format: {"choices":[{"delta":{"content":"..."}}]}
                if (data.choices?.[0]?.delta?.content) {
                  response += data.choices[0].delta.content;
                }
                
                // Handle tool calls from delta
                if (data.choices?.[0]?.delta?.tool_calls) {
                  for (const tc of data.choices[0].delta.tool_calls) {
                    if (tc.function?.name && !toolsCalled.includes(tc.function.name)) {
                      toolsCalled.push(tc.function.name);
                    }
                  }
                }
                
                // Also support custom format if used
                if (data.type === "content" && data.content) {
                  response += data.content;
                } else if (data.type === "tool_call" && data.name) {
                  if (!toolsCalled.includes(data.name)) {
                    toolsCalled.push(data.name);
                  }
                }
              } catch {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }
      }
    }
    
    // Run assertions
    if (test.assertions.mustInclude) {
      errors.push(...checkMustInclude(response, test.assertions.mustInclude));
    }
    
    if (test.assertions.mustNotInclude) {
      errors.push(...checkMustNotInclude(response, test.assertions.mustNotInclude));
    }
    
    if (test.assertions.maxQuestionMarks !== undefined) {
      errors.push(...checkMaxQuestionMarks(response, test.assertions.maxQuestionMarks));
    }
    
    if (test.assertions.mustCallTool) {
      errors.push(...checkToolCalled(toolsCalled, test.assertions.mustCallTool));
    }
    
  } catch (error) {
    errors.push(`Test execution error: ${error instanceof Error ? error.message : String(error)}`);
  }
  
  const duration = Date.now() - startTime;
  
  return {
    testId: test.id,
    testName: test.name,
    passed: errors.length === 0,
    errors,
    response: response.substring(0, 500),
    toolsCalled,
    duration,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    const { testIds, category, runAll } = await req.json().catch(() => ({}));
    
    // Fetch test cases
    let query = supabase
      .from("concierge_test_cases")
      .select("*")
      .eq("is_active", true);
    
    if (testIds && testIds.length > 0) {
      query = query.in("id", testIds);
    } else if (category) {
      query = query.eq("category", category);
    }
    
    const { data: testCases, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch test cases: ${error.message}`);
    }
    
    if (!testCases || testCases.length === 0) {
      return new Response(
        JSON.stringify({ message: "No test cases found", results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`[Test Runner] Running ${testCases.length} test(s)`);
    
    // Run tests
    const results: TestResult[] = [];
    
    for (const test of testCases) {
      console.log(`[Test Runner] Running: ${test.name}`);
      const result = await runTest(test as TestCase, supabaseUrl, supabaseKey);
      results.push(result);
      
      // Update test case with result
      await supabase
        .from("concierge_test_cases")
        .update({
          last_run_at: new Date().toISOString(),
          last_passed: result.passed,
          last_result: result,
          run_count: test.run_count + 1,
          pass_count: test.pass_count + (result.passed ? 1 : 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", test.id);
      
      console.log(`[Test Runner] ${test.name}: ${result.passed ? "PASSED" : "FAILED"}`);
    }
    
    const passedCount = results.filter(r => r.passed).length;
    const failedCount = results.filter(r => !r.passed).length;
    
    return new Response(
      JSON.stringify({
        summary: {
          total: results.length,
          passed: passedCount,
          failed: failedCount,
          passRate: `${Math.round((passedCount / results.length) * 100)}%`,
        },
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    
  } catch (error) {
    console.error("[Test Runner] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

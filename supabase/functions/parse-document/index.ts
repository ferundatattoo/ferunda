// =============================================================================
// PARSE DOCUMENT - Extract text from PDF/DOCX files
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Buffer } from "node:buffer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Maximum text to extract (to not overwhelm the prompt)
const MAX_EXTRACTED_CHARS = 8000;

interface ParseRequest {
  fileUrl: string;
  mimeType: string;
  fileName?: string;
}

interface ParseResponse {
  success: boolean;
  extractedText?: string;
  pageCount?: number;
  wordCount?: number;
  error?: string;
}

// =============================================================================
// PDF EXTRACTION (using pdf.js via CDN)
// =============================================================================

async function extractPdfText(fileBuffer: ArrayBuffer): Promise<{ text: string; pageCount: number }> {
  // Use pdf-parse library for Deno
  const pdfParse = (await import("npm:pdf-parse@1.1.1")).default;
  
  try {
    const data = await pdfParse(Buffer.from(fileBuffer));
    const text = data.text?.trim() || '';
    const pageCount = data.numpages || 1;
    
    console.log(`[ParseDocument] PDF extracted: ${pageCount} pages, ${text.length} chars`);
    
    return { text, pageCount };
  } catch (error) {
    console.error('[ParseDocument] PDF parse error:', error);
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =============================================================================
// DOCX EXTRACTION (using mammoth)
// =============================================================================

async function extractDocxText(fileBuffer: ArrayBuffer): Promise<{ text: string }> {
  const mammoth = (await import("npm:mammoth@1.6.0")).default;
  
  try {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(fileBuffer) });
    const text = result.value?.trim() || '';
    
    console.log(`[ParseDocument] DOCX extracted: ${text.length} chars`);
    
    return { text };
  } catch (error) {
    console.error('[ParseDocument] DOCX parse error:', error);
    throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", service: "parse-document", timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const startTime = Date.now();

  try {
    const body: ParseRequest = await req.json();
    const { fileUrl, mimeType, fileName } = body;

    if (!fileUrl || !mimeType) {
      return new Response(
        JSON.stringify({ success: false, error: "fileUrl and mimeType are required" } as ParseResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ParseDocument] Processing: ${fileName || 'unknown'} (${mimeType})`);

    // Download the file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.status}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileSizeMB = fileBuffer.byteLength / (1024 * 1024);
    console.log(`[ParseDocument] Downloaded: ${fileSizeMB.toFixed(2)}MB`);

    // Sanity check
    if (fileSizeMB > 15) {
      return new Response(
        JSON.stringify({ success: false, error: "File too large (max 15MB)" } as ParseResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let extractedText = '';
    let pageCount: number | undefined;

    // Route based on mime type
    if (mimeType === 'application/pdf') {
      const result = await extractPdfText(fileBuffer);
      extractedText = result.text;
      pageCount = result.pageCount;
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      const result = await extractDocxText(fileBuffer);
      extractedText = result.text;
    } else {
      return new Response(
        JSON.stringify({ success: false, error: `Unsupported file type: ${mimeType}` } as ParseResponse),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Truncate if too long
    const wasTruncated = extractedText.length > MAX_EXTRACTED_CHARS;
    if (wasTruncated) {
      extractedText = extractedText.substring(0, MAX_EXTRACTED_CHARS) + '\n\n[... content truncated ...]';
    }

    // Word count
    const wordCount = extractedText.split(/\s+/).filter(w => w.length > 0).length;

    const latency = Date.now() - startTime;
    console.log(`[ParseDocument] Complete in ${latency}ms: ${wordCount} words${wasTruncated ? ' (truncated)' : ''}`);

    const response: ParseResponse = {
      success: true,
      extractedText,
      pageCount,
      wordCount,
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('[ParseDocument] Error:', error);
    
    const response: ParseResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return new Response(
      JSON.stringify(response),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

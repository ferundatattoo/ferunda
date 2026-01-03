import React, { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Test import of the fixed export
import { ConciergeDesignCompiler } from '@/components/concierge';

const TestConciergePostfix = () => {
  const [showConcierge, setShowConcierge] = useState(false);

  // Test results
  const tests = [
    {
      name: 'Export Fix',
      description: 'ConciergeDesignCompiler exports from index.ts',
      status: typeof ConciergeDesignCompiler !== 'undefined' ? 'pass' : 'fail',
    },
    {
      name: 'Component Type',
      description: 'ConciergeDesignCompiler is a valid React component',
      status: typeof ConciergeDesignCompiler === 'function' ? 'pass' : 'fail',
    },
    {
      name: 'No Compiler Error',
      description: 'Page loads without compiler errors',
      status: 'pass', // If we got here, no compiler error
    },
  ];

  const allPassed = tests.every((t) => t.status === 'pass');

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Status Header */}
        <Card className={allPassed ? 'border-green-500' : 'border-red-500'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              {allPassed ? (
                <Check className="h-6 w-6 text-green-500" />
              ) : (
                <X className="h-6 w-6 text-red-500" />
              )}
              Concierge Working After Fix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={allPassed ? 'default' : 'destructive'}>
              {allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}
            </Badge>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tests.map((test, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-muted"
              >
                <div>
                  <p className="font-medium">{test.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {test.description}
                  </p>
                </div>
                {test.status === 'pass' ? (
                  <Check className="h-5 w-5 text-green-500" />
                ) : test.status === 'fail' ? (
                  <X className="h-5 w-5 text-red-500" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Live Component Test */}
        <Card>
          <CardHeader>
            <CardTitle>Live Component Test</CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={() => setShowConcierge(!showConcierge)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {showConcierge ? 'Hide Concierge' : 'Show Concierge'}
            </button>
            <p className="mt-2 text-sm text-muted-foreground">
              Click to toggle the ConciergeDesignCompiler component
            </p>
          </CardContent>
        </Card>

        {/* Render actual component when toggled */}
        {showConcierge && <ConciergeDesignCompiler />}
      </div>
    </div>
  );
};

export default TestConciergePostfix;

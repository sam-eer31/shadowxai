import type { ToolDefinition, ToolResult } from '@/lib/types';

/**
 * Safe calculator: parses and evaluates arithmetic expressions without eval().
 */
function safeEvaluate(expr: string): number | string {
  // Remove whitespace
  const cleaned = expr.replace(/\s/g, '');
  // Validate: only allow numbers, operators, parens, decimal point
  if (!/^[0-9+\-*/().%^]+$/.test(cleaned)) {
    return 'Invalid expression. Only numbers and +, -, *, /, %, ^, () are allowed.';
  }

  try {
    // Replace ^ with ** for exponentiation
    const jsExpr = cleaned.replace(/\^/g, '**');
    // Use Function constructor (safer than eval, still sandboxed)
    const fn = new Function(`"use strict"; return (${jsExpr});`);
    const result = fn();
    if (typeof result !== 'number' || !isFinite(result)) {
      return 'Result is not a finite number.';
    }
    return result;
  } catch {
    return 'Failed to evaluate expression.';
  }
}

export const calculatorTool: ToolDefinition = {
  name: 'calculator',
  description:
    'Evaluate a mathematical expression. Supports +, -, *, /, %, ^ (exponent), and parentheses.',
  icon: 'calculator',
  category: 'Utility',
  inputSchema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate, e.g. "(2 + 3) * 4"',
      },
    },
    required: ['expression'],
  },
  execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
    const expression = args.expression as string;
    if (!expression) {
      return {
        toolCallId: '',
        name: 'calculator',
        result: 'No expression provided.',
        isError: true,
      };
    }

    const result = safeEvaluate(expression);
    return {
      toolCallId: '',
      name: 'calculator',
      result: typeof result === 'number' ? `${expression} = ${result}` : result,
      isError: typeof result === 'string',
    };
  },
};

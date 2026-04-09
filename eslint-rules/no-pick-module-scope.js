/**
 * ESLint rule: no-pick-module-scope
 * Detects pick() calls at module scope (top-level const/let/var assignments).
 * pick() reads _lang at call time — module-level calls freeze in the initial language.
 * Enforces JW-31: bilingual strings must be defined inside render functions or useMemo.
 */

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow pick() calls at module scope where language is frozen (JW-31)',
      category: 'Best Practices',
      recommended: 'error',
    },
    messages: {
      noPickModuleScope:
        'pick() at module scope freezes in the initial language. Move it inside a render function or useMemo.',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        // Only match calls to `pick`
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'pick') {
          return;
        }

        // Walk up to check if we're at module scope
        let current = node.parent;
        while (current) {
          // If we hit a function/arrow/method, we're NOT at module scope — safe
          if (
            current.type === 'FunctionDeclaration' ||
            current.type === 'FunctionExpression' ||
            current.type === 'ArrowFunctionExpression'
          ) {
            return;
          }
          current = current.parent;
        }

        // If we get here, pick() is at module scope
        context.report({
          node,
          messageId: 'noPickModuleScope',
        });
      },
    };
  },
};

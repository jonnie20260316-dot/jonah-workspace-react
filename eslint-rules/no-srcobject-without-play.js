/**
 * ESLint rule: no-srcobject-without-play
 * Detects .srcObject = expr patterns where .play() is not called on the same variable
 * Prevents VIDEO-SRCOBJECT-1 bug pattern
 */

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Detect video.srcObject assignment without subsequent .play() call (VIDEO-SRCOBJECT-1)',
      category: 'Best Practices',
      recommended: 'warn'
    },
    messages: {
      needsPlay:
        'Assigning srcObject to {{ element }} requires a .play() call afterward to resume playback'
    }
  },

  create(context) {
    const sourceCode = context.sourceCode
    const assignmentMap = new Map() // Track srcObject assignments

    return {
      AssignmentExpression(node) {
        // Look for pattern: something.srcObject = expr
        if (
          node.left.type === 'MemberExpression' &&
          node.left.property.name === 'srcObject' &&
          node.left.object.type === 'Identifier'
        ) {
          const varName = node.left.object.name
          const lineNum = node.loc.start.line
          assignmentMap.set(varName, lineNum)
        }
      },

      BlockStatement(node) {
        // After processing a block, check if any srcObject assignments lack .play()
        const assignmentLines = Array.from(assignmentMap.entries())

        for (const [varName, assignLine] of assignmentLines) {
          // Look for .play() call on the same variable after assignment
          const tokens = sourceCode.getTokens(node)
          let foundPlayCall = false

          for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i]
            // Check for varName.play()
            if (
              token.value === varName &&
              i + 2 < tokens.length &&
              tokens[i + 1].value === '.' &&
              tokens[i + 2].value === 'play'
            ) {
              if (tokens[i + 2].loc.start.line > assignLine) {
                foundPlayCall = true
                break
              }
            }
          }

          // If assignment found but no play() in same scope, warn
          // Only warn if we can't find it (avoid false positives for callbacks)
          if (!foundPlayCall && assignmentMap.has(varName)) {
            // Get the actual assignment node to report
            const srcObjNode = Array.from(
              context.sourceCode.ast.body.flatMap(
                n =>
                  (n.body || []).filter(
                    s =>
                      s.type === 'ExpressionStatement' &&
                      s.expression.type === 'AssignmentExpression' &&
                      s.expression.left.property?.name === 'srcObject'
                  ) || []
              )
            )[0]

            if (srcObjNode) {
              context.report({
                node: srcObjNode.expression,
                messageId: 'needsPlay',
                data: { element: varName }
              })
            }
          }
        }

        // Clear assignments when exiting block
        assignmentMap.clear()
      }
    }
  }
}

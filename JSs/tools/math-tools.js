/**
 * Math Tools - Actual mathematical calculation functions
 */

const MathTools = {
    calculate: function(input, params = {}) {
        try {
            // Extract mathematical expression from input
            let expression = this.extractExpression(input);
            
            if (!expression) {
                return {
                    success: false,
                    error: "No mathematical expression found"
                };
            }

            // Clean and validate expression
            expression = this.cleanExpression(expression);
            
            // Perform calculation
            const result = this.safeEval(expression);
            
            return {
                success: true,
                expression: expression,
                result: result,
                formatted: this.formatResult(result)
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                expression: input
            };
        }
    },

    extractExpression: function(input) {
        if (typeof input !== 'string') {
            input = String(input);
        }

        // Try to find mathematical expressions in text
        // Look for patterns like: "5 + 3", "calculate 10 * 2", "what is 100 / 4"
        
        // Remove common words
        let cleaned = input.toLowerCase()
            .replace(/what\s+is/gi, '')
            .replace(/calculate/gi, '')
            .replace(/compute/gi, '')
            .replace(/solve/gi, '')
            .replace(/equals?/gi, '')
            .replace(/\?/g, '');

        // Extract numbers and operators
        const mathPattern = /[\d+\-*/().\s]+/g;
        const matches = cleaned.match(mathPattern);
        
        if (matches) {
            // Take the longest match
            return matches.reduce((a, b) => a.length > b.length ? a : b).trim();
        }

        // If no pattern found, assume entire input is expression
        return input.trim();
    },

    cleanExpression: function(expr) {
        // Remove any characters that aren't numbers, operators, parentheses, or decimal points
        return expr.replace(/[^0-9+\-*/().\s]/g, '').trim();
    },

    safeEval: function(expression) {
        // Safe evaluation without using eval()
        // Only allows basic arithmetic operations
        
        // Replace operators with methods
        const tokens = this.tokenize(expression);
        return this.evaluateTokens(tokens);
    },

    tokenize: function(expr) {
        const tokens = [];
        let current = '';
        
        for (let i = 0; i < expr.length; i++) {
            const char = expr[i];
            
            if (char === ' ') {
                continue;
            }
            
            if ('+-*/()'.includes(char)) {
                if (current) {
                    tokens.push(parseFloat(current));
                    current = '';
                }
                tokens.push(char);
            } else {
                current += char;
            }
        }
        
        if (current) {
            tokens.push(parseFloat(current));
        }
        
        return tokens;
    },

    evaluateTokens: function(tokens) {
        // Simple expression evaluator using operator precedence
        // This implements a basic calculator
        
        // Handle parentheses first
        while (tokens.includes('(')) {
            const start = tokens.lastIndexOf('(');
            let end = start;
            let depth = 1;
            
            for (let i = start + 1; i < tokens.length; i++) {
                if (tokens[i] === '(') depth++;
                if (tokens[i] === ')') {
                    depth--;
                    if (depth === 0) {
                        end = i;
                        break;
                    }
                }
            }
            
            const subExpr = tokens.slice(start + 1, end);
            const subResult = this.evaluateTokens(subExpr);
            tokens.splice(start, end - start + 1, subResult);
        }
        
        // Handle multiplication and division
        for (let i = 1; i < tokens.length - 1; i++) {
            if (tokens[i] === '*' || tokens[i] === '/') {
                const left = tokens[i - 1];
                const right = tokens[i + 1];
                const result = tokens[i] === '*' ? left * right : left / right;
                tokens.splice(i - 1, 3, result);
                i--;
            }
        }
        
        // Handle addition and subtraction
        for (let i = 1; i < tokens.length - 1; i++) {
            if (tokens[i] === '+' || tokens[i] === '-') {
                const left = tokens[i - 1];
                const right = tokens[i + 1];
                const result = tokens[i] === '+' ? left + right : left - right;
                tokens.splice(i - 1, 3, result);
                i--;
            }
        }
        
        return tokens[0];
    },

    formatResult: function(result) {
        if (typeof result !== 'number') {
            return String(result);
        }
        
        // Format large numbers with commas
        if (Math.abs(result) >= 1000) {
            return result.toLocaleString('en-US', {
                maximumFractionDigits: 10
            });
        }
        
        // Format decimals nicely
        if (result % 1 !== 0) {
            return result.toFixed(10).replace(/\.?0+$/, '');
        }
        
        return String(result);
    },

    // Additional math functions
    percentage: function(value, total) {
        return (value / total) * 100;
    },

    average: function(numbers) {
        return numbers.reduce((a, b) => a + b, 0) / numbers.length;
    },

    factorial: function(n) {
        if (n <= 1) return 1;
        return n * this.factorial(n - 1);
    }
};

// Export for use in main engine
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MathTools;
}

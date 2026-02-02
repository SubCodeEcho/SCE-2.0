/**
 * Text Tools - Actual text manipulation functions
 */

const TextTools = {
    capitalizeText: function(input, params = {}) {
        const text = this.extractText(input);
        const mode = params.mode || 'all'; // all, first, words
        
        let result;
        switch(mode) {
            case 'first':
                result = text.charAt(0).toUpperCase() + text.slice(1);
                break;
            case 'words':
                result = text.replace(/\b\w/g, c => c.toUpperCase());
                break;
            case 'all':
            default:
                result = text.toUpperCase();
                break;
        }
        
        return {
            success: true,
            result: result,
            original: text,
            mode: mode
        };
    },

    lowercaseText: function(input, params = {}) {
        const text = this.extractText(input);
        return {
            success: true,
            result: text.toLowerCase(),
            original: text
        };
    },

    countText: function(input, params = {}) {
        const text = this.extractText(input);
        
        const words = text.trim().split(/\s+/).filter(w => w.length > 0);
        const characters = text.length;
        const charactersNoSpaces = text.replace(/\s/g, '').length;
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
        const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
        const lines = text.split('\n').length;
        
        return {
            success: true,
            words: words.length,
            characters: characters,
            charactersNoSpaces: charactersNoSpaces,
            sentences: sentences,
            paragraphs: paragraphs,
            lines: lines,
            averageWordLength: charactersNoSpaces / words.length || 0
        };
    },

    reverseText: function(input, params = {}) {
        const text = this.extractText(input);
        const mode = params.mode || 'characters'; // characters, words, lines
        
        let result;
        switch(mode) {
            case 'words':
                result = text.split(' ').reverse().join(' ');
                break;
            case 'lines':
                result = text.split('\n').reverse().join('\n');
                break;
            case 'characters':
            default:
                result = text.split('').reverse().join('');
                break;
        }
        
        return {
            success: true,
            result: result,
            original: text,
            mode: mode
        };
    },

    extractText: function(input) {
        // Extract actual text content from various input formats
        if (typeof input === 'string') {
            return input;
        } else if (input && input.text) {
            return input.text;
        } else if (input && input.content) {
            return input.content;
        }
        return String(input);
    }
};

// Export for use in main engine
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextTools;
}

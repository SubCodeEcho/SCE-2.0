/**
 * Enhanced Client-Side AI Engine v2
 * Features: Real tool execution, training without backend, storage management
 */

class ClientSideAI {
    constructor() {
        this.conversations = new Map();
        this.currentConversationId = null;
        this.toolsConfig = null;
        this.loadedTools = {};
        this.trainingData = {
            patterns: [],
            responses: [],
            corrections: []
        };
        this.userProfile = {
            stylePreferences: {
                responseLength: 'medium', // short, medium, long
                tone: 'friendly',
                favoriteTopics: [],
                commonQuestions: []
            },
            interactionHistory: [],
            storageLimit: 50 * 1024 * 1024, // 50MB default (can be changed by user)
            storageUsed: 0
        };
        
        this.initialize();
    }

    async initialize() {
        await this.loadToolsConfig();
        await this.loadTools();
        this.loadFromStorage();
        this.loadTrainingData();
    }

    // Load tools configuration from JSON
    async loadToolsConfig() {
        try {
            const response = await fetch('tools-config.json');
            this.toolsConfig = await response.json();
            console.log('✅ Tools config loaded:', this.toolsConfig.tools.length, 'tools');
        } catch (error) {
            console.error('❌ Failed to load tools config:', error);
            this.toolsConfig = { tools: [], settings: {} };
        }
    }

    // Dynamically load tool scripts
    async loadTools() {
        const uniqueScripts = new Set();
        
        // Collect unique script paths
        this.toolsConfig.tools.forEach(tool => {
            if (tool.enabled) {
                uniqueScripts.add(tool.scriptPath);
            }
        });

        // Load each script
        for (const scriptPath of uniqueScripts) {
            try {
                await this.loadScript(scriptPath);
                console.log('✅ Loaded tool script:', scriptPath);
            } catch (error) {
                console.error('❌ Failed to load script:', scriptPath, error);
            }
        }
    }

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    // Compress data using pako
    compress(data) {
        try {
            const jsonString = JSON.stringify(data);
            const compressed = pako.gzip(jsonString);
            return btoa(String.fromCharCode.apply(null, compressed));
        } catch (error) {
            console.error('Compression error:', error);
            return null;
        }
    }

    // Decompress data
    decompress(compressedData) {
        try {
            const binary = atob(compressedData);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
            }
            const decompressed = pako.ungzip(bytes, { to: 'string' });
            return JSON.parse(decompressed);
        } catch (error) {
            console.error('Decompression error:', error);
            return null;
        }
    }

    // Classify intent and find matching tool
    classifyIntent(input) {
        const lowerInput = input.toLowerCase();
        let bestMatch = null;
        let maxScore = 0;

        // Check each enabled tool
        for (const tool of this.toolsConfig.tools) {
            if (!tool.enabled) continue;

            let score = 0;
            for (const keyword of tool.keywords) {
                if (lowerInput.includes(keyword.toLowerCase())) {
                    score += 10;
                }
            }

            if (score > maxScore) {
                maxScore = score;
                bestMatch = tool;
            }
        }

        return {
            tool: bestMatch,
            confidence: maxScore / 100,
            requiresGeneralResponse: maxScore === 0 || maxScore < 5
        };
    }

    // Execute tool function
    async executeToolFunction(tool, input) {
        try {
            // Get the tool module
            const moduleName = tool.scriptPath.split('/').pop().replace('.js', '');
            const toolModule = window[this.getModuleName(moduleName)];

            if (!toolModule) {
                throw new Error(`Tool module ${moduleName} not loaded`);
            }

            // Execute the function
            const functionName = tool.function;
            if (typeof toolModule[functionName] !== 'function') {
                throw new Error(`Function ${functionName} not found in ${moduleName}`);
            }

            const result = toolModule[functionName](input);
            return result;

        } catch (error) {
            console.error('Tool execution error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    getModuleName(scriptName) {
        // Convert script name to module name (e.g., 'text-tools' -> 'TextTools')
        return scriptName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');
    }

    // Main processing function
    async processInput(userInput) {
        // Check training data first for exact matches
        const trainedResponse = this.checkTrainingData(userInput);
        if (trainedResponse) {
            return {
                response: trainedResponse,
                source: 'training',
                toolUsed: 'learned',
                compressionRatio: this.calculateCompressionRatio(trainedResponse.length)
            };
        }

        // Classify intent
        const intent = this.classifyIntent(userInput);

        // Update user profile
        this.updateUserProfile(userInput);

        // Execute tool if found
        if (!intent.requiresGeneralResponse && intent.tool) {
            const toolResult = await this.executeToolFunction(intent.tool, userInput);
            
            if (toolResult.success) {
                const response = this.formatToolResponse(intent.tool, toolResult);
                return {
                    response: response,
                    toolUsed: intent.tool.id,
                    toolResult: toolResult,
                    compressionRatio: this.calculateCompressionRatio(response.length)
                };
            } else {
                return {
                    response: `I tried to use the ${intent.tool.name} but encountered an error: ${toolResult.error}`,
                    toolUsed: intent.tool.id,
                    error: true,
                    compressionRatio: 0
                };
            }
        }

        // Generate general response
        return this.generateGeneralResponse(userInput);
    }

    // Format tool response into natural language
    formatToolResponse(tool, result) {
        const maxLength = this.getMaxResponseLength();
        let response = '';

        switch(tool.id) {
            case 'text_capitalize':
                response = `Done! Here's the capitalized text:\n\n${result.result}`;
                break;

            case 'text_lowercase':
                response = `Here's the lowercase version:\n\n${result.result}`;
                break;

            case 'text_count':
                response = `Text analysis:\n\n` +
                    `📊 Words: ${result.words}\n` +
                    `📝 Characters: ${result.characters} (${result.charactersNoSpaces} without spaces)\n` +
                    `📄 Sentences: ${result.sentences}\n` +
                    `📋 Paragraphs: ${result.paragraphs}\n` +
                    `📏 Lines: ${result.lines}\n` +
                    `⚖️ Avg word length: ${result.averageWordLength.toFixed(2)} characters`;
                break;

            case 'calculator':
                response = `📊 Calculation Result:\n\n` +
                    `Expression: ${result.expression}\n` +
                    `Answer: ${result.formatted}`;
                break;

            case 'text_reverse':
                response = `Reversed text:\n\n${result.result}`;
                break;

            case 'json_format':
                if (result.valid) {
                    response = `✅ Valid JSON formatted:\n\n${result.result}`;
                } else {
                    response = `❌ Invalid JSON: ${result.error}`;
                }
                break;

            default:
                response = JSON.stringify(result, null, 2);
        }

        return this.truncateToLength(response, maxLength);
    }

    getMaxResponseLength() {
        const lengths = this.toolsConfig.settings.responseLengthOptions;
        const pref = this.userProfile.stylePreferences.responseLength;
        return lengths[pref] || lengths.medium;
    }

    truncateToLength(text, maxWords) {
        const words = text.split(/\s+/);
        if (words.length <= maxWords) {
            return text;
        }
        return words.slice(0, maxWords).join(' ') + '...';
    }

    // Training: Learn from user corrections
    trainFromCorrection(userInput, wrongResponse, correctResponse) {
        this.trainingData.corrections.push({
            input: userInput.toLowerCase(),
            wrong: wrongResponse,
            correct: correctResponse,
            timestamp: Date.now()
        });

        // Also add as pattern
        this.trainingData.patterns.push({
            input: userInput.toLowerCase(),
            response: correctResponse,
            weight: 10 // High weight for corrections
        });

        this.saveTrainingData();
        console.log('📚 Learned from correction');
    }

    // Training: Learn from explicit teaching
    trainFromExample(input, expectedOutput) {
        this.trainingData.patterns.push({
            input: input.toLowerCase(),
            response: expectedOutput,
            weight: 5,
            timestamp: Date.now()
        });

        this.saveTrainingData();
        console.log('📚 Learned new pattern');
    }

    // Check if we have learned this pattern
    checkTrainingData(input) {
        const lowerInput = input.toLowerCase().trim();
        
        // Exact match
        for (const pattern of this.trainingData.patterns) {
            if (pattern.input === lowerInput) {
                return pattern.response;
            }
        }

        // Fuzzy match (similar inputs)
        const similarity = 0.8;
        for (const pattern of this.trainingData.patterns) {
            if (this.calculateSimilarity(lowerInput, pattern.input) > similarity) {
                return pattern.response;
            }
        }

        return null;
    }

    calculateSimilarity(str1, str2) {
        // Simple Levenshtein distance similarity
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        return (longer.length - this.editDistance(longer, shorter)) / longer.length;
    }

    editDistance(str1, str2) {
        const costs = [];
        for (let i = 0; i <= str1.length; i++) {
            let lastValue = i;
            for (let j = 0; j <= str2.length; j++) {
                if (i === 0) {
                    costs[j] = j;
                } else if (j > 0) {
                    let newValue = costs[j - 1];
                    if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
                        newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                    }
                    costs[j - 1] = lastValue;
                    lastValue = newValue;
                }
            }
            if (i > 0) costs[str2.length] = lastValue;
        }
        return costs[str2.length];
    }

    // Generate general response
    generateGeneralResponse(input) {
        const maxLength = this.getMaxResponseLength();
        const responses = this.createContextualResponse(input);
        const selectedResponse = responses[Math.floor(Math.random() * responses.length)];
        
        return {
            response: this.truncateToLength(selectedResponse, maxLength),
            toolUsed: 'general',
            compressionRatio: this.calculateCompressionRatio(selectedResponse.length)
        };
    }

    createContextualResponse(input) {
        const lowerInput = input.toLowerCase();

        if (lowerInput.match(/^(hi|hello|hey|greetings)/)) {
            return [
                `Hello! I'm your AI assistant. I can execute actual tools for text manipulation, calculations, and more. Try asking me to capitalize text or solve math problems!`
            ];
        }

        if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
            const tools = this.toolsConfig.tools.filter(t => t.enabled).map(t => t.name).join(', ');
            return [
                `I can help with: ${tools}. I also learn from your corrections and improve over time! Response length: ${this.userProfile.stylePreferences.responseLength}.`
            ];
        }

        return [
            `I understand you're asking about: "${input}". I couldn't find a specific tool for this, but I'm learning! You can teach me by showing me what the correct response should be.`
        ];
    }

    // Update user profile
    updateUserProfile(input) {
        this.userProfile.interactionHistory.push({
            timestamp: Date.now(),
            inputLength: input.length,
            topics: this.extractTopics(input)
        });

        if (this.userProfile.interactionHistory.length > 100) {
            this.userProfile.interactionHistory = this.userProfile.interactionHistory.slice(-100);
        }

        this.saveUserProfile();
    }

    extractTopics(input) {
        const topics = [];
        const keywords = {
            text: ['text', 'word', 'string', 'capitalize', 'lowercase'],
            math: ['calculate', 'math', 'number', 'compute'],
            code: ['code', 'function', 'javascript', 'program'],
            data: ['json', 'format', 'data', 'parse']
        };

        for (const [topic, words] of Object.entries(keywords)) {
            if (words.some(word => input.toLowerCase().includes(word))) {
                topics.push(topic);
            }
        }

        return topics;
    }

    calculateCompressionRatio(originalSize) {
        const compressed = originalSize * 0.3;
        return ((1 - compressed / originalSize) * 100).toFixed(1);
    }

    // Storage Management with IndexedDB
    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('ClientSideAI', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('conversations')) {
                    db.createObjectStore('conversations', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('training')) {
                    db.createObjectStore('training', { keyPath: 'id' });
                }
            };
        });
    }

    // Save conversation to IndexedDB (bypasses 5MB localStorage limit)
    async saveConversationToIDB(conversationId, messages) {
        try {
            const db = await this.initIndexedDB();
            const compressed = this.compress(messages);
            
            const transaction = db.transaction(['conversations'], 'readwrite');
            const store = transaction.objectStore('conversations');
            
            await store.put({
                id: conversationId,
                data: compressed,
                timestamp: Date.now()
            });
            
            console.log('💾 Saved to IndexedDB:', conversationId);
            return true;
        } catch (error) {
            console.error('IndexedDB save error:', error);
            return false;
        }
    }

    // Load conversation from IndexedDB
    async loadConversationFromIDB(conversationId) {
        try {
            const db = await this.initIndexedDB();
            const transaction = db.transaction(['conversations'], 'readonly');
            const store = transaction.objectStore('conversations');
            
            return new Promise((resolve, reject) => {
                const request = store.get(conversationId);
                request.onsuccess = () => {
                    if (request.result) {
                        const messages = this.decompress(request.result.data);
                        resolve(messages);
                    } else {
                        resolve(null);
                    }
                };
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('IndexedDB load error:', error);
            return null;
        }
    }

    // Delete conversation
    async deleteConversation(conversationId) {
        try {
            const db = await this.initIndexedDB();
            const transaction = db.transaction(['conversations'], 'readwrite');
            const store = transaction.objectStore('conversations');
            await store.delete(conversationId);
            
            // Also remove from memory
            this.conversations.delete(conversationId);
            
            console.log('🗑️ Deleted conversation:', conversationId);
            return true;
        } catch (error) {
            console.error('Delete error:', error);
            return false;
        }
    }

    // Get all conversation IDs from IndexedDB
    async getAllConversationsFromIDB() {
        try {
            const db = await this.initIndexedDB();
            const transaction = db.transaction(['conversations'], 'readonly');
            const store = transaction.objectStore('conversations');
            
            return new Promise((resolve, reject) => {
                const request = store.getAllKeys();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error('IndexedDB get all error:', error);
            return [];
        }
    }

    // Storage management methods
    saveUserProfile() {
        const compressed = this.compress(this.userProfile);
        if (compressed) {
            localStorage.setItem('userProfile', compressed);
        }
    }

    loadFromStorage() {
        const compressed = localStorage.getItem('userProfile');
        if (compressed) {
            const profile = this.decompress(compressed);
            if (profile) {
                this.userProfile = { ...this.userProfile, ...profile };
            }
        }
    }

    saveTrainingData() {
        const compressed = this.compress(this.trainingData);
        if (compressed) {
            localStorage.setItem('trainingData', compressed);
        }
    }

    loadTrainingData() {
        const compressed = localStorage.getItem('trainingData');
        if (compressed) {
            const data = this.decompress(compressed);
            if (data) {
                this.trainingData = data;
            }
        }
    }

    // Clear all training data
    clearTrainingData() {
        this.trainingData = {
            patterns: [],
            responses: [],
            corrections: []
        };
        localStorage.removeItem('trainingData');
        console.log('🧹 Training data cleared');
    }

    getStorageEstimate() {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            total += localStorage.getItem(key).length;
        }
        return {
            used: total,
            usedKB: (total / 1024).toFixed(2),
            usedMB: (total / 1024 / 1024).toFixed(2),
            limit: this.userProfile.storageLimit,
            limitMB: (this.userProfile.storageLimit / 1024 / 1024).toFixed(2),
            percentage: ((total / this.userProfile.storageLimit) * 100).toFixed(2)
        };
    }

    // Create new conversation
    createConversation() {
        const id = `conv_${Date.now()}`;
        this.currentConversationId = id;
        this.conversations.set(id, {
            id: id,
            title: 'New Conversation',
            messages: [],
            created: Date.now()
        });
        return id;
    }

    // Add message to conversation
    async addMessage(role, content, metadata = {}) {
        if (!this.currentConversationId) {
            this.createConversation();
        }

        const conversation = this.conversations.get(this.currentConversationId);
        const message = {
            role,
            content,
            timestamp: Date.now(),
            ...metadata
        };

        conversation.messages.push(message);

        if (conversation.messages.length === 1 && role === 'user') {
            conversation.title = content.substring(0, 50) + (content.length > 50 ? '...' : '');
        }

        // Save to IndexedDB instead of localStorage
        await this.saveConversationToIDB(this.currentConversationId, conversation.messages);

        return message;
    }

    // Get all conversations
    async getAllConversations() {
        const ids = await this.getAllConversationsFromIDB();
        const conversations = [];

        for (const id of ids) {
            const messages = await this.loadConversationFromIDB(id);
            if (messages && messages.length > 0) {
                conversations.push({
                    id,
                    title: messages[0].content.substring(0, 50),
                    preview: messages[messages.length - 1].content.substring(0, 100),
                    messageCount: messages.length
                });
            }
        }

        return conversations.sort((a, b) => b.id.localeCompare(a.id));
    }

    // Switch conversation
    async switchConversation(conversationId) {
        const messages = await this.loadConversationFromIDB(conversationId);
        if (messages) {
            this.currentConversationId = conversationId;
            this.conversations.set(conversationId, {
                id: conversationId,
                messages: messages,
                title: messages[0]?.content.substring(0, 50) || 'Conversation'
            });
            return messages;
        }
        return null;
    }

    // Update response length preference
    setResponseLength(length) {
        if (['short', 'medium', 'long'].includes(length)) {
            this.userProfile.stylePreferences.responseLength = length;
            this.saveUserProfile();
            console.log('✅ Response length set to:', length);
        }
    }

    // Update storage limit
    setStorageLimit(limitMB) {
        this.userProfile.storageLimit = limitMB * 1024 * 1024;
        this.saveUserProfile();
        console.log('✅ Storage limit set to:', limitMB, 'MB');
    }
}

// Initialize
const aiEngine = new ClientSideAI();

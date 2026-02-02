/**
 * Main Application Controller
 * Handles UI interactions and integrates with AI engine
 */

class App {
    constructor() {
        this.aiEngine = aiEngine;
        this.currentMessages = [];
        this.initializeElements();
        this.attachEventListeners();
        this.loadConversations();
        this.updateStorageInfo();
        
        // Auto-resize textarea
        this.setupAutoResize();
    }

    initializeElements() {
        this.elements = {
            sidebar: document.getElementById('sidebar'),
            menuToggle: document.getElementById('menuToggle'),
            newChatBtn: document.getElementById('newChatBtn'),
            chatList: document.getElementById('chatList'),
            chatMessages: document.getElementById('chatMessages'),
            userInput: document.getElementById('userInput'),
            sendBtn: document.getElementById('sendBtn'),
            processingIndicator: document.getElementById('processingIndicator'),
            storageUsed: document.getElementById('storageUsed')
        };
    }

    attachEventListeners() {
        // Menu toggle for mobile
        this.elements.menuToggle.addEventListener('click', () => {
            this.elements.sidebar.classList.toggle('open');
        });

        // New chat button
        this.elements.newChatBtn.addEventListener('click', () => {
            this.createNewChat();
        });

        // Send message
        this.elements.sendBtn.addEventListener('click', () => {
            this.sendMessage();
        });

        // Enter to send (Shift+Enter for new line)
        this.elements.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Close sidebar on mobile when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768) {
                if (!this.elements.sidebar.contains(e.target) && 
                    !this.elements.menuToggle.contains(e.target)) {
                    this.elements.sidebar.classList.remove('open');
                }
            }
        });
    }

    setupAutoResize() {
        this.elements.userInput.addEventListener('input', () => {
            this.elements.userInput.style.height = 'auto';
            this.elements.userInput.style.height = 
                Math.min(this.elements.userInput.scrollHeight, 200) + 'px';
        });
    }

    createNewChat() {
        const conversationId = this.aiEngine.createConversation();
        this.currentMessages = [];
        this.clearChatDisplay();
        this.loadConversations();
        this.setActiveChat(conversationId);
        this.elements.userInput.focus();
        
        // Add subtle animation
        this.showWelcomeMessage();
    }

    showWelcomeMessage() {
        this.elements.chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="welcome-icon">🤖</div>
                <h2>New Conversation</h2>
                <p>Ready to assist you with compressed memory and intelligent tool routing</p>
                <div class="feature-tags">
                    <span class="tag">Local Storage</span>
                    <span class="tag">Compressed Memory</span>
                    <span class="tag">Tool Integration</span>
                    <span class="tag">Style Learning</span>
                </div>
            </div>
        `;
    }

    async sendMessage() {
        const input = this.elements.userInput.value.trim();
        
        if (!input) return;

        // Disable input during processing
        this.setInputState(false);
        this.showProcessingIndicator(true);

        // Clear input and reset height
        this.elements.userInput.value = '';
        this.elements.userInput.style.height = 'auto';

        // Add user message to display
        this.addMessageToDisplay('user', input);

        // Process with AI engine
        try {
            const startTime = Date.now();
            const result = await this.aiEngine.processInput(input);
            const processingTime = Date.now() - startTime;

            // Simulate realistic processing delay (minimum 500ms for UX)
            const delay = Math.max(500, 1000 - processingTime);
            await new Promise(resolve => setTimeout(resolve, delay));

            // Add AI response to display
            this.addMessageToDisplay('ai', result.response, {
                toolUsed: result.toolUsed,
                compressionRatio: result.compressionRatio
            });

            // Save messages to AI engine
            this.aiEngine.addMessage('user', input);
            this.aiEngine.addMessage('assistant', result.response, {
                toolUsed: result.toolUsed,
                compressionRatio: result.compressionRatio
            });

        } catch (error) {
            console.error('Error processing message:', error);
            this.addMessageToDisplay('ai', 
                'I encountered an error processing your request. Please try again.');
        } finally {
            this.setInputState(true);
            this.showProcessingIndicator(false);
            this.updateStorageInfo();
            this.loadConversations(); // Update sidebar
        }
    }

    addMessageToDisplay(role, content, metadata = {}) {
        // Remove welcome message if it exists
        const welcomeMsg = this.elements.chatMessages.querySelector('.welcome-message');
        if (welcomeMsg) {
            welcomeMsg.remove();
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;

        let metaHtml = '';
        if (role === 'ai' && metadata.compressionRatio) {
            metaHtml = `
                <div class="message-meta">
                    <span class="compression-badge">
                        📦 ${metadata.compressionRatio}% compressed
                    </span>
                    ${metadata.toolUsed ? `<span>🔧 ${metadata.toolUsed}</span>` : ''}
                </div>
            `;
        }

        messageDiv.innerHTML = `
            <div class="message-content">
                ${this.formatMessage(content)}
            </div>
            ${metaHtml}
        `;

        this.elements.chatMessages.appendChild(messageDiv);
        this.currentMessages.push({ role, content, metadata });

        // Smooth scroll to bottom
        this.scrollToBottom();
    }

    formatMessage(content) {
        // Basic formatting: preserve line breaks and add basic markdown-like formatting
        return content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>');
    }

    scrollToBottom() {
        requestAnimationFrame(() => {
            this.elements.chatMessages.scrollTop = this.elements.chatMessages.scrollHeight;
        });
    }

    setInputState(enabled) {
        this.elements.userInput.disabled = !enabled;
        this.elements.sendBtn.disabled = !enabled;
        if (enabled) {
            this.elements.userInput.focus();
        }
    }

    showProcessingIndicator(show) {
        if (show) {
            this.elements.processingIndicator.classList.add('active');
        } else {
            this.elements.processingIndicator.classList.remove('active');
        }
    }

    loadConversations() {
        const conversations = this.aiEngine.getAllConversations();
        this.elements.chatList.innerHTML = '';

        if (conversations.length === 0) {
            this.elements.chatList.innerHTML = `
                <div style="padding: 1rem; text-align: center; color: var(--text-secondary); font-size: 0.9rem;">
                    No conversations yet.<br>Start a new chat!
                </div>
            `;
            return;
        }

        conversations.forEach(conv => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            if (conv.id === this.aiEngine.currentConversationId) {
                chatItem.classList.add('active');
            }

            chatItem.innerHTML = `
                <div class="chat-item-title">${conv.title}</div>
                <div class="chat-item-preview">${conv.preview}...</div>
            `;

            chatItem.addEventListener('click', () => {
                this.loadConversation(conv.id);
            });

            this.elements.chatList.appendChild(chatItem);
        });
    }

    loadConversation(conversationId) {
        const messages = this.aiEngine.switchConversation(conversationId);
        
        if (messages) {
            this.clearChatDisplay();
            this.currentMessages = [];

            messages.forEach(msg => {
                this.addMessageToDisplay(
                    msg.role === 'user' ? 'user' : 'ai',
                    msg.content,
                    msg
                );
            });

            // Update active state in sidebar
            this.setActiveChat(conversationId);

            // Close sidebar on mobile
            if (window.innerWidth <= 768) {
                this.elements.sidebar.classList.remove('open');
            }
        }
    }

    setActiveChat(conversationId) {
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });

        // Find and activate the corresponding chat item
        const chatItems = Array.from(document.querySelectorAll('.chat-item'));
        const activeIndex = this.aiEngine.getAllConversations()
            .findIndex(c => c.id === conversationId);
        
        if (activeIndex >= 0 && chatItems[activeIndex]) {
            chatItems[activeIndex].classList.add('active');
        }
    }

    clearChatDisplay() {
        this.elements.chatMessages.innerHTML = '';
        this.showWelcomeMessage();
    }

    updateStorageInfo() {
        const storageSize = this.aiEngine.getStorageEstimate();
        this.elements.storageUsed.textContent = storageSize;

        // Add visual feedback for storage changes
        this.elements.storageUsed.style.transition = 'color 0.3s ease';
        this.elements.storageUsed.style.color = 'var(--primary-color)';
        setTimeout(() => {
            this.elements.storageUsed.style.color = '';
        }, 300);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    
    // Add smooth entrance animation
    document.querySelector('.app-container').style.opacity = '0';
    requestAnimationFrame(() => {
        document.querySelector('.app-container').style.transition = 'opacity 0.5s ease';
        document.querySelector('.app-container').style.opacity = '1';
    });

    // Initialize with a new chat if no conversations exist
    if (aiEngine.getAllConversations().length === 0) {
        app.createNewChat();
    }

    console.log('🤖 Client-Side AI Initialized');
    console.log('📦 Compression: Active');
    console.log('🔧 Tools: Image Format, Text Process, Calculator, Code Helper');
    console.log('💾 Storage: Local (IndexedDB + LocalStorage)');
});

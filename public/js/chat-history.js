// Chat History Management
class ChatHistoryManager {
    constructor() {
        this.currentSessionId = null;
        this.apiBasePath = '/main'; // Add this base path
        this.questionSessionMap = new Map(JSON.parse(localStorage.getItem('questionSessionMap') || '[]'));
        this.answerTypeMap = new Map(); // Add this to store answer types
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Listen for new chat button clicks
        document.querySelector('.new-chat-btn')?.addEventListener('click', () => {
            this.startNewChat();
        });

        // Listen for history item clicks
        document.querySelector('.history-items')?.addEventListener('click', (e) => {
            const historyItem = e.target.closest('.history-item');
            if (historyItem) {
                this.loadChatSession(historyItem.dataset.sessionId);
            }
        });

        // Initialize history on page load
        this.refreshHistoryList();
    }

    async startNewChat(subject, chapter, question) {
        try {
            const userId = localStorage.getItem('user_id');
            if (!userId) {
                throw new Error('User ID not found in localStorage');
            }

            const response = await fetch(`${this.apiBasePath}/api/chat/history.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    subject: subject || 'General',
                    chapter: chapter || 'General',
                    questions: [question] || []
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            if (data.success) {
                this.currentSessionId = data.session_id;
                await this.refreshHistoryList();
                console.log(data.existing ? 'Using existing session:' : 'New session created:', this.currentSessionId);
                return data; // Return full response including 'existing' flag
            }
            throw new Error(data.error || 'Failed to create session');
        } catch (error) {
            console.error('Error starting new chat:', error);
            throw error;
        }
    }

    removeQuestion(question) {
        this.questionSessionMap.delete(question);
        // Update localStorage when removing question
        localStorage.setItem('questionSessionMap', JSON.stringify([...this.questionSessionMap]));
        if (this.currentSessionId === this.questionSessionMap.get(question)) {
            this.currentSessionId = null;
        }
    }

    async addMessage(message, sender = 'user') {
        if (!this.currentSessionId) {
            console.warn('No active chat session');
            return;
        }

        try {
            console.log('Adding message to session:', this.currentSessionId);
            const response = await fetch(`${this.apiBasePath}/api/chat/history.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: this.currentSessionId,
                    sender,
                    message
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to add message');
            }
            
            console.log('Message added successfully');
        } catch (error) {
            console.error('Error adding message:', error);
            throw error;
        }
    }

    async loadChatSession(sessionId) {
        try {
            const response = await fetch(`${this.apiBasePath}/api/chat/history.php?session_id=${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                this.currentSessionId = sessionId;
                // Clear existing chat messages
                const chatMessages = document.querySelector('.chat-messages');
                if (chatMessages) {
                    chatMessages.innerHTML = '';
                }
                // Add messages to chat
                data.conversation.forEach(msg => {
                    // Assuming you have an addMessage function in your chat UI
                    window.addMessage(msg.sender, msg.message);
                });
            }
        } catch (error) {
            console.error('Error loading chat session:', error);
        }
    }

    async refreshHistoryList() {
        try {
            const userId = localStorage.getItem('user_id');
            const response = await fetch(
                `${this.apiBasePath}/api/chat/history.php?user_id=${userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                const historyContainer = document.querySelector('.history-items');
                if (!historyContainer) return;

                historyContainer.innerHTML = data.history.map(chat => `
                    <div class="history-item" data-session-id="${chat.id}" 
                         data-subject="${chat.subject}" data-chapter="${chat.chapter}">
                        <i class="fas fa-message"></i>
                        <div class="history-item-content">
                            <span class="history-text">${chat.question_identifier}</span>
                            <div class="history-tags">
                                <span class="subject-tag">${chat.subject}</span>
                                <span class="chapter-tag">${chat.chapter}</span>
                            </div>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error refreshing history:', error);
        }
    }

    // Add method to store answer type
    setAnswerType(questionId, type) {
        this.answerTypeMap.set(questionId, type);
    }

    // Add method to get answer type
    getAnswerType(questionId) {
        return this.answerTypeMap.get(questionId);
    }
}

// Initialize chat history manager
const chatHistory = new ChatHistoryManager();

// Export for use in other files
window.chatHistory = chatHistory; 
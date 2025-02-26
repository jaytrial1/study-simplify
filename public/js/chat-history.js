// Chat History Management
class ChatHistoryManager {
    constructor() {
        this.currentSessionId = null;
        this.apiBasePath = '/main'; // Add this base path
        this.questionSessionMap = new Map(JSON.parse(localStorage.getItem('questionSessionMap') || '[]'));
        this.answerTypeMap = new Map(); // Add this to store answer types
        this.historyContainer = document.querySelector('.history-items');
        this.searchInput = document.querySelector('.history-search');
        this.subjectFilter = document.querySelector('.subject-filter');
        this.chapterFilter = document.querySelector('.chapter-filter');
        this.clearFiltersBtn = document.querySelector('.clear-filters-btn');
        
        // Store the complete subject-chapter mapping
        this.subjectChapterMap = new Map();
        this.allSubjects = new Set();
        this.allChapters = new Set();
        
        this.setupEventListeners();
        this.loadHistory();
    }

    setupEventListeners() {
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

        // Search input handler with debounce
        this.searchInput?.addEventListener('input', debounce(() => {
            this.loadHistory();
        }, 300));

        // Subject filter handler
        this.subjectFilter?.addEventListener('change', () => {
            const selectedSubject = this.subjectFilter.value;
            if (!selectedSubject) {
                // If "All Subjects" selected, show all chapters
                this.updateChapterDropdown('');
            } else {
                // Show chapters for selected subject
                this.updateChapterDropdown(selectedSubject);
            }
            this.loadHistory();
        });

        // Chapter filter handler
        this.chapterFilter?.addEventListener('change', () => {
            this.loadHistory();
        });
        
        // Clear filters
        this.clearFiltersBtn?.addEventListener('click', () => {
            this.subjectFilter.value = '';
            this.chapterFilter.value = '';
            this.searchInput.value = '';
            this.updateChapterDropdown('');
            this.loadHistory();
        });
    }

    updateChapterDropdown(selectedSubject) {
        if (!this.chapterFilter) return;

        const currentChapter = this.chapterFilter.value;
        this.chapterFilter.innerHTML = '<option value="">All Chapters</option>';

        let chaptersToShow;
        if (selectedSubject) {
            // Show chapters for selected subject
            chaptersToShow = this.subjectChapterMap.get(selectedSubject) || new Set();
        } else {
            // Show all chapters when no subject is selected
            chaptersToShow = this.allChapters;
        }

        // Convert to array, sort, and add all options
        Array.from(chaptersToShow).sort().forEach(chapter => {
            const option = new Option(chapter, chapter);
            if (chapter === currentChapter) {
                option.selected = true;
            }
            this.chapterFilter.add(option);
        });

        // If current chapter isn't in the new list, reset to "All Chapters"
        if (currentChapter && !chaptersToShow.has(currentChapter)) {
            this.chapterFilter.value = '';
        }
    }

    updateFilters(historyData) {
        // Clear existing data
        this.subjectChapterMap.clear();
        this.allSubjects.clear();
        this.allChapters.clear();

        // Build subject-chapter mapping and collect all unique values
        historyData.forEach(item => {
            this.allSubjects.add(item.subject);
            if (item.chapter) {
                this.allChapters.add(item.chapter);
            }
            
            if (!this.subjectChapterMap.has(item.subject)) {
                this.subjectChapterMap.set(item.subject, new Set());
            }
            if (item.chapter) {
                this.subjectChapterMap.get(item.subject).add(item.chapter);
            }
        });

        // Update subject dropdown while preserving selection
        if (this.subjectFilter) {
            const currentSubject = this.subjectFilter.value;
            const subjectOptions = Array.from(this.allSubjects).sort();
            
            // Keep current options if they exist
            if (this.subjectFilter.options.length <= 1) {
                this.subjectFilter.innerHTML = '<option value="">All Subjects</option>';
                subjectOptions.forEach(subject => {
                    const option = new Option(subject, subject);
                    if (subject === currentSubject) {
                        option.selected = true;
                    }
                    this.subjectFilter.add(option);
                });
            }
        }

        // Update chapter dropdown based on current subject
        const selectedSubject = this.subjectFilter?.value || '';
        this.updateChapterDropdown(selectedSubject);
    }

    async startNewChat(subject, chapter, question) {
        try {
            const userId = localStorage.getItem('user_id');
            if (!userId) {
                throw new Error('User ID not found in localStorage');
            }

            // Debug log to see what values we're receiving
            console.log('StartNewChat params:', { subject, chapter, question, userId });

            const requestBody = {
                user_id: userId,
                subject: subject,
                chapter: chapter,
                questions: [question],
                conversation: []
            };

            console.log('Request body:', requestBody);

            const response = await fetch(`${this.apiBasePath}/api/chat/history.php`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const responseData = await response.json();
            console.log('Server response:', responseData);

            if (!response.ok) {
                throw new Error(responseData.error || `Server error: ${response.status}`);
            }

            if (responseData.success) {
                this.currentSessionId = responseData.session_id;
                await this.loadHistory();
                return {
                    session_id: responseData.session_id,
                    existing: responseData.existing || false
                };
            }
            throw new Error(responseData.error || 'Failed to start new chat');
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

    async loadHistory() {
        try {
            const userId = localStorage.getItem('user_id');
            const searchTerm = this.searchInput?.value || '';
            const subject = this.subjectFilter?.value || '';
            const chapter = this.chapterFilter?.value || '';

            const response = await fetch(
                `/main/api/chat/history.php?user_id=${userId}&search=${searchTerm}&subject=${subject}&chapter=${chapter}`
            );
            const data = await response.json();

            if (data.success) {
                this.updateFilters(data.history);
                this.displayHistory(data.history);
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    displayHistory(history) {
        if (!this.historyContainer) return;
        
        const searchTerm = this.searchInput?.value.toLowerCase() || '';
        
        this.historyContainer.innerHTML = history.length ? '' : 
            '<div class="no-history">No chat history found</div>';

        history.forEach(item => {
            // Filter only by question text
            const questionText = item.question_identifier.toLowerCase();
            if (searchTerm && !questionText.includes(searchTerm)) {
                return; // Skip this item if it doesn't match search
            }

            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.dataset.subject = item.subject;
            historyItem.dataset.chapter = item.chapter;
            
            historyItem.innerHTML = `
                <i class="fas fa-message"></i>
                <div class="history-item-content">
                    <span class="history-text">${item.question_identifier}</span>
                    <div class="history-tags">
                        <span class="subject-tag">${item.subject}</span>
                        <span class="chapter-tag">${item.chapter}</span>
                    </div>
                </div>
            `;

            historyItem.addEventListener('click', () => {
                this.loadChatSession(item.id);
            });

            this.historyContainer.appendChild(historyItem);
        });
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

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize the chat history manager
document.addEventListener('DOMContentLoaded', () => {
    new ChatHistoryManager();
});

// Export for use in other files
window.chatHistory = new ChatHistoryManager(); 
/**
 * Follow-up Prompts Manager
 * Handles dynamic loading and displaying of follow-up prompt options
 */
class FollowUpManager {
    constructor() {
        // Detect server environment
        const isLocalServer = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' || 
                           window.location.hostname.includes('192.168.') || 
                           window.location.hostname.includes('10.0.');
        
        console.log("Server detection in follow-up-prompts.js:", isLocalServer ? "LOCAL SERVER" : "PRODUCTION SERVER");
        
        // Set API base path based on environment
        this.apiBasePath = isLocalServer ? '/main' : '';
        console.log("API base path in follow-up-prompts.js:", this.apiBasePath);
        
        this.prompts = [];
        this.initialized = false;
        this.lastAiMessageId = null;
        this.userId = localStorage.getItem('user_id');
    }

    /**
     * Initialize the follow-up manager by loading available prompts
     */
    async init() {
        try {
            if (!this.userId) {
                console.error('User ID not found in localStorage');
                return;
            }
            
            console.log('Fetching follow-up prompts with user ID:', this.userId);
            
            // Try up to 3 times with a delay between attempts
            let attempts = 0;
            const maxAttempts = 3;
            
            while (attempts < maxAttempts) {
                attempts++;
                try {
                    const response = await fetch(`${this.apiBasePath}/api/follow-up/get_prompts.php?user_id=${this.userId}`);
                    
                    // Log the raw response for debugging
                    const responseText = await response.text();
                    console.log(`Follow-up prompt API response (attempt ${attempts}):`, responseText);
                    
                    // Try to parse the JSON
                    let data;
                    try {
                        data = JSON.parse(responseText);
                    } catch (parseError) {
                        console.error('Error parsing follow-up prompts response:', parseError);
                        if (attempts < maxAttempts) {
                            console.log(`Retrying in 1 second (attempt ${attempts}/${maxAttempts})...`);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            continue;
                        } else {
                            throw new Error('Failed to parse server response');
                        }
                    }
                    
                    if (data.error) {
                        console.error('Error from server:', data.error);
                        if (data.debug) {
                            console.log('Debug info:', data.debug);
                        }
                        
                        if (attempts < maxAttempts) {
                            console.log(`Retrying in 1 second (attempt ${attempts}/${maxAttempts})...`);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            continue;
                        } else {
                            throw new Error(data.error);
                        }
                    }
                    
                    this.prompts = data.prompts || [];
                    if (this.prompts.length === 0 && data.debug) {
                        console.warn('No prompts found. Debug info:', data.debug);
                    } else {
                        this.initialized = true;
                        console.log(`Loaded ${this.prompts.length} follow-up prompts successfully`);
                    }
                    
                    // Success, break out of retry loop
                    break;
                } catch (fetchError) {
                    console.error(`Attempt ${attempts} failed:`, fetchError);
                    
                    if (attempts < maxAttempts) {
                        console.log(`Retrying in 1 second (attempt ${attempts}/${maxAttempts})...`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    } else {
                        throw fetchError; // Rethrow after max attempts
                    }
                }
            }
        } catch (error) {
            console.error('Error initializing follow-up manager:', error);
        }
    }

    /**
     * Show follow-up prompt options after receiving an AI response
     * @param {HTMLElement|string} aiMessageIdOrElement - ID of the AI message or the element itself
     * @param {string} previousResponse - The text of the AI's response
     */
    showFollowUpOptions(aiMessageIdOrElement, previousResponse) {
        if (!this.initialized || this.prompts.length === 0) {
            console.warn('Follow-up manager not initialized or no prompts available');
            return;
        }
        
        this.lastAiMessageId = aiMessageIdOrElement;
        
        // Find the AI message element - handle both element and ID string
        let aiMessage;
        if (typeof aiMessageIdOrElement === 'string') {
            // It's an ID string
            aiMessage = document.querySelector(`[data-message-id="${aiMessageIdOrElement}"]`);
        } else if (aiMessageIdOrElement instanceof HTMLElement) {
            // It's already an element
            aiMessage = aiMessageIdOrElement;
        } else {
            console.error('Invalid message identifier:', aiMessageIdOrElement);
            return;
        }
        
        if (!aiMessage) {
            console.error('Could not find AI message element:', aiMessageIdOrElement);
            return;
        }
        
        // Check if follow-up panel already exists
        if (aiMessage.nextElementSibling && aiMessage.nextElementSibling.classList.contains('follow-up-panel')) {
            return; // Panel already exists
        }
        
        // Create follow-up panel
        const followUpPanel = document.createElement('div');
        followUpPanel.className = 'follow-up-panel';
        followUpPanel.innerHTML = `
            <h4>What would you like to know next?</h4>
            <div class="follow-up-options"></div>
        `;
        
        // Add follow-up options
        const optionsContainer = followUpPanel.querySelector('.follow-up-options');
        this.prompts.forEach(prompt => {
            const promptButton = document.createElement('button');
            promptButton.className = 'follow-up-option';
            promptButton.textContent = prompt.title;
            promptButton.dataset.promptId = prompt.id;
            
            promptButton.addEventListener('click', () => {
                this.handleFollowUpSelection(prompt.id);
                followUpPanel.remove(); // Remove panel after selection
            });
            
            optionsContainer.appendChild(promptButton);
        });
        
        // Insert panel after AI message
        aiMessage.after(followUpPanel);
    }

    /**
     * Handle follow-up prompt selection
     * @param {string} promptId - ID of the selected prompt
     */
    handleFollowUpSelection(promptId) {
        // Set the selected prompt in the message input
        const messageInput = document.getElementById('userInput');
        if (!messageInput) {
            console.error('Message input not found');
            return;
        }
        
        // Use the prompt ID as the message (the backend will load the actual template)
        messageInput.value = `@follow_up:${promptId}`;
        
        // Focus on the input field (optional)
        messageInput.focus();
        
        // Optionally, auto-submit the message
        const sendButton = document.getElementById('sendButton');
        if (sendButton) {
            sendButton.click();
        }
    }
}

// Initialize the follow-up manager when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.followUpManager = new FollowUpManager();
    
    // Initialize the manager
    window.followUpManager.init();
}); 
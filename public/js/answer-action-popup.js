// Pop up for answer action (After user right clicks or long press on the answer)


// Initialize the script after the page is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Variables for long press detection
    let longPressTimer;
    const longPressDuration = 500; // 500ms for long press



    // Add this function at the start of your DOMContentLoaded event listener
    function addBotResponseListeners(element) {
        // Prevent text selection
        element.style.userSelect = 'none';
        element.style.webkitUserSelect = 'none';
        element.style.msUserSelect = 'none';

        // Touch events for mobile
        element.addEventListener('touchstart', (e) => {
            longPressTimer = setTimeout(() => {
                const selectedResponseText = element.innerText; // Capture the AI response text
                showAnswerActionPopup(e.touches[0].clientX, e.touches[0].clientY, element);
            }, longPressDuration);
        });

        element.addEventListener('touchend', () => {
            clearTimeout(longPressTimer);
        });

        element.addEventListener('touchmove', () => {
            clearTimeout(longPressTimer);
        });

        // Right click for desktop
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const selectedResponseText = element.innerText; // Capture the AI response text
            showAnswerActionPopup(e.clientX, e.clientY, element);
        });
    }

    // Use a MutationObserver to watch for new bot responses
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Check if it's an element node
                    const botResponses = node.classList?.contains('bot-response') ? 
                        [node] : 
                        Array.from(node.getElementsByClassName('bot-response'));
                    
                    botResponses.forEach(response => {
                        addBotResponseListeners(response);
                    });
                }
            });
        });
    });

    // Start observing the chat messages container
    observer.observe(chatMessages, { childList: true, subtree: true });

    // Also handle any existing bot responses
    document.querySelectorAll('.response.bot-response').forEach(response => {
        addBotResponseListeners(response);
    });

    // Function to show popup
    function showAnswerActionPopup(x, y, clickedElement) {
        // Remove existing popup if any
        const existingPopup = document.querySelector('.answer-action-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        // Create new popup with divider and sections
        const popup = document.createElement('div');
        popup.className = 'answer-action-popup';
        popup.style.display = 'block';
        
        // Start with the save options
        let popupHTML = `
            <div class="action-content">
                <div class="action-section save-section">
                    <h4 class="action-section-title">Save as</h4>
                    <button class="answer-action-button" data-type="Best response">Best response</button>
                    <button class="answer-action-button" data-type="Question Related">Question Related</button>
                </div>
        `;
        
        // Add follow-up options section if follow-up manager is available
        if (window.followUpManager && window.followUpManager.initialized && window.followUpManager.prompts.length > 0) {
            popupHTML += `
                <div class="action-divider"></div>
                <div class="action-section follow-up-section">
                    <h4 class="action-section-title">Follow up</h4>
            `;
            
            // Add each follow-up option as a button
            window.followUpManager.prompts.forEach(prompt => {
                popupHTML += `
                    <button class="answer-action-button follow-up-button" data-prompt-id="${prompt.id}">
                        ${prompt.title}
                    </button>
                `;
            });
            
            popupHTML += `</div>`;
        }
        
        // Close the main container
        popupHTML += `</div>`;
        
        // Set the HTML content
        popup.innerHTML = popupHTML;
        document.body.appendChild(popup);

        // Position the popup near the click/touch point
        const popupContent = popup.querySelector('.action-content');
        if (popupContent) {
            const safeArea = 10; // Reduced padding from viewport edges
            
            // Get viewport dimensions
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Get popup dimensions
            const popupWidth = popupContent.offsetWidth;
            const popupHeight = popupContent.offsetHeight;
            
            // Calculate position to keep popup within viewport
            let posX = x;
            let posY = y;
            
            // Adjust horizontal position if needed
            if (x + popupWidth + safeArea > viewportWidth) {
                posX = x - popupWidth;
            }
            
            // Adjust vertical position if needed
            if (y + popupHeight + safeArea > viewportHeight) {
                posY = y - popupHeight;
            }
            
            // Ensure popup doesn't go outside viewport
            posX = Math.max(safeArea, Math.min(posX, viewportWidth - popupWidth - safeArea));
            posY = Math.max(safeArea, Math.min(posY, viewportHeight - popupHeight - safeArea));
            
            popupContent.style.position = 'fixed';
            popupContent.style.left = `${posX}px`;
            popupContent.style.top = `${posY}px`;
        }

        // Retrieve user ID from local storage
        const userId = localStorage.getItem('user_id') || 'N/A'; // Assuming user ID is stored in local storage

        // Log the user ID for debugging
        console.log('User ID:', userId);

        // Add event listeners for the save buttons
        popup.querySelectorAll('.answer-action-button:not(.follow-up-button)').forEach(button => {
            button.addEventListener('click', () => {
                const selectedType = button.dataset.type;
                console.log('Selected Type:', selectedType);

                // Format the save type to match database ENUM values exactly
                const formattedSaveType = selectedType === 'Question Related' ? 'question_related' : 
                                        selectedType === 'Best response' ? 'Best response' : 
                                        selectedType; // Keep original if not matching known types
                console.log('Formatted Save Type:', formattedSaveType);

                const currentQuestion = Array.from(window.selectedQuestions)[0]; // Get the current question
                const subject = document.getElementById('selectedSubject').innerText;
                const chapter = document.getElementById('selectedChapter').innerText;
                const grade = localStorage.getItem('userGrade') || 'N/A'; // Retrieve from localStorage, default to 'N/A' if not found
                const currentQuestionText = currentQuestion; // Assuming currentQuestion holds the full text

                console.log('Collected Data:', {
                    currentQuestion,
                    subject,
                    chapter,
                    grade,
                    currentQuestionText
                });

                // Get the AI response from the clicked element's formatted content
                const formattedContent = clickedElement.querySelector('.formatted-content');
                
                // Debug logging to identify the structure
                console.log('Clicked element:', clickedElement);
                console.log('Clicked element classes:', clickedElement.className);
                console.log('Clicked element dataset:', clickedElement.dataset);
                
                // Try to find bot response element
                const botResponseElement = clickedElement.closest('.bot-response');
                console.log('Bot Response Element:', botResponseElement);
                
                // Get the AI response text
                const aiResponse = formattedContent ? standardizeFormattedContent(formattedContent.innerHTML, clickedElement) : '';
                console.log('AI Response Length:', aiResponse.length);
                console.log('AI Response Preview:', aiResponse.substring(0, 100) + '...');

                // Get user ID from localStorage
                const userId = localStorage.getItem('user_id');
                console.log('User ID:', userId);

                // Create payload for saving
                const payload = { 
                    user_id: userId,
                    question: currentQuestionText,
                    subject, 
                    chapter, 
                    saveType: formattedSaveType, 
                    grade, 
                    aiResponse
                };

                // console.log('--- Saving Answer Payload ---', JSON.stringify(payload, null, 2));

                // Send data to backend
                fetch(`${window.apiBasePath}/api/saved-answers/save_to_database.php`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(payload)
                })
                .then(response => {
                    console.log('Response Status:', response.status);
                    console.log('Response Headers:', response.headers);
                    return response.json();
                })
                .then(data => {
                    console.log('Response from server:', data);
                    if (data.success) {
                        console.log('Save successful');
                        showToast('Answer saved successfully!', false);
                    } else {
                        console.log('Save failed:', data);
                        // If the answer already exists, show the correct saved type
                        if (data && data.message && data.message.includes('already exists')) {
                            console.log('Answer already exists with type:', data.save_type);
                            // Get the save type and convert it to display format
                            let saveTypeDisplay = "Unknown";
                            if (data.save_type) {
                                if (data.save_type === 'question_related') {
                                    saveTypeDisplay = 'Question Related';
                                } else if (data.save_type === 'Best response') {
                                    saveTypeDisplay = 'Best response'; // Keep exact database format
                                } else {
                                    saveTypeDisplay = data.save_type; // Use as is if not recognized
                                }
                            }
                            
                            // Create a more specific message depending on if it's an exact match
                            let message = data.message.includes('exact') 
                                ? `This exact response has already been saved as "${saveTypeDisplay}"`
                                : `A response to this question has already been saved as "${saveTypeDisplay}"`;
                            
                            console.log('Showing message:', message);
                            // Use the toast notification system
                            createToastMessage(message, false);
                        } else {
                            // Handle other error cases
                            const errorMessage = data && data.message ? data.message : 'An error occurred while saving the answer';
                            console.log('Error message:', errorMessage);
                            showToast(errorMessage, false);
                        }
                    }
                    popup.style.display = 'none';
                })
                .catch(error => {
                    console.error('Error during save operation:', error);
                    showToast('An error occurred while saving the answer', false);
                    popup.style.display = 'none';
                });
            });
        });
        
        // Add event listeners for the follow-up buttons
        popup.querySelectorAll('.follow-up-button').forEach(button => {
            button.addEventListener('click', () => {
                const promptId = button.dataset.promptId;
                console.log('Selected Follow-up:', promptId);
                
                // Handle the follow-up action using the followUpManager
                if (window.followUpManager) {
                    window.followUpManager.handleFollowUpSelection(promptId);
                    popup.style.display = 'none';
                } else {
                    console.error('Follow-up manager not initialized');
                    showToast('Error: Follow-up system not available', true);
                }
            });
        });
    }

    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
        const popup = document.querySelector('.answer-action-popup');
        if (!popup) return;

        const popupContent = popup.querySelector('.action-content');
        if (!popupContent) return;
        
        if (!popupContent.contains(e.target)) {
            popup.style.display = 'none';
        }
    });
});

function showToast(message, withAction = false) {
    // Use the new createToastMessage function for consistency
    if (!withAction) {
        createToastMessage(message, false);
        return;
    }
    
    // For toasts with actions, keep the original implementation
    const toast = document.getElementById('toastNotification');
    
    toast.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <span id="toastMessage">${message}</span>
            <span style="font-size: 0.9em; color: #842029;">Do you want to remove it?</span>
            <div class="toast-buttons">
                <button class="ok-btn" onclick="clearInput()">OK</button>
                <button class="cancel-btn" onclick="hideToast()">Cancel</button>
            </div>
        </div>
    `;

    toast.classList.add('active');

    setTimeout(() => {
        if (toast.classList.contains('active')) {
            toast.classList.remove('active');
        }
    }, 5000); // Display for 5 seconds for action toasts
}

function createToastMessage(message, isError = false) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = 'toast-message' + (isError ? ' error' : '');
    toast.textContent = message;

    // Add to toast container
    const container = document.getElementById('toast-container');
    if (container) {
        container.appendChild(toast);
    } else {
        // If container doesn't exist, create it
        const newContainer = document.createElement('div');
        newContainer.id = 'toast-container';
        document.body.appendChild(newContainer);
        newContainer.appendChild(toast);
    }

    // Automatically remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Add this new function to standardize the format of saved answers
function standardizeFormattedContent(htmlContent, clickedElement) {
    if (!htmlContent) return '';
    
    // Try to find the parent bot-response element to get the original markdown
    let botResponseElement = clickedElement;
    
    // Check if the clicked element is a bot-response or contains one
    if (botResponseElement && !botResponseElement.classList.contains('bot-response')) {
        botResponseElement = botResponseElement.closest('.bot-response');
    }
    
    // If we found the bot response element, check for original markdown
    if (botResponseElement && botResponseElement.dataset && botResponseElement.dataset.originalMarkdown) {
        console.log('Found original markdown in dataset, using it for saving');
        return botResponseElement.dataset.originalMarkdown;
    }
    
    // If we couldn't find the original markdown, look for it in the first response element 
    // This is needed because we might have clicked on a child element
    const responseElement = clickedElement.querySelector('.response.bot-response');
    if (responseElement && responseElement.dataset && responseElement.dataset.originalMarkdown) {
        console.log('Found original markdown in child response element, using it for saving');
        return responseElement.dataset.originalMarkdown;
    }
    
    // Final attempt - look for dataset in the parent
    let parentElement = clickedElement.parentElement;
    while (parentElement) {
        if (parentElement.classList && parentElement.classList.contains('bot-response') && 
            parentElement.dataset && parentElement.dataset.originalMarkdown) {
            console.log('Found original markdown in parent element, using it for saving');
            return parentElement.dataset.originalMarkdown;
        }
        parentElement = parentElement.parentElement;
    }
    
    // Fallback: Create a temporary div to parse the HTML
    console.log('Could not find original markdown, falling back to HTML content');
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Just return the HTML content as fallback
    return tempDiv.innerHTML;
}

class AnswerActionPopup {
    constructor() {
        // Detect server environment
        const isLocalServer = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' || 
                           window.location.hostname.includes('192.168.') || 
                           window.location.hostname.includes('10.0.');
        
        console.log("Server detection in answer-action-popup.js:", isLocalServer ? "LOCAL SERVER" : "PRODUCTION SERVER");
        
        // Set API base path based on environment
        this.apiBasePath = isLocalServer ? '/main' : '';
        console.log("API base path in answer-action-popup.js:", this.apiBasePath);

        this.container = null;
        this.popup = null;
        this.messageElement = null;
        this.questionText = '';
        this.answerText = '';
        this.subject = '';
        this.chapter = '';
        this.messageId = 0;
        this.userId = localStorage.getItem('user_id');
        this.savedType = null;
        
        // Create popup elements
        this.createPopup();
        
        // Add global event to close popup when clicking outside
        document.addEventListener('click', (e) => {
            if (this.popup && 
                this.popup.classList.contains('visible') && 
                !this.popup.contains(e.target) &&
                !e.target.closest('.message')) {
                this.hidePopup();
            }
        });
    }
    
    // ... existing code ...
    
    async saveAnswer(saveType) {
        try {
            const data = {
                user_id: this.userId,
                message_id: this.messageId,
                question: this.questionText,
                answer: this.answerText,
                subject: this.subject,
                chapter: this.chapter,
                save_type: saveType
            };
            
            fetch(`${this.apiBasePath}/api/saved-answers/save_to_database.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    this.showToast('Answer saved successfully!');
                    // Update the button state
                    const saveBtn = this.popup.querySelector('.save-btn');
                    saveBtn.classList.add('saved');
                    saveBtn.querySelector('i').className = 'fas fa-bookmark';
                    
                    // Update saved type
                    this.savedType = saveType;
                    
                    // Update button text
                    const textNode = saveBtn.childNodes[1];
                    textNode.nodeValue = ' ' + (saveType === 'best_response' ? 'Best Response' : 'Question Related');
                    
                    // Update dropdown
                    const items = this.popup.querySelectorAll('.dropdown-content a');
                    items.forEach(item => {
                        if (item.dataset.type === saveType) {
                            item.classList.add('active');
                        } else {
                            item.classList.remove('active');
                        }
                    });
                } else {
                    this.showToast('Error: ' + (result.error || 'Unable to save answer'));
                }
            })
            .catch(error => {
                console.error('Error saving answer:', error);
                this.showToast('Error saving answer. Please try again.');
            });
        } catch (error) {
            console.error('Error in saveAnswer:', error);
            this.showToast('An unexpected error occurred.');
        }
    }
    
    // ... rest of code ...
}
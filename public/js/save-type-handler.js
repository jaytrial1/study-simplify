/**
 * Save Type Handler
 * Manages the updating of save types for saved answers
 */

class SaveTypeHandler {
    constructor() {
        // Detect server environment
        const isLocalServer = window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1' || 
                           window.location.hostname.includes('192.168.') || 
                           window.location.hostname.includes('10.0.');
        
        console.log("Server detection in save-type-handler.js:", isLocalServer ? "LOCAL SERVER" : "PRODUCTION SERVER");
        
        // Set API base path based on environment
        this.apiBasePath = isLocalServer ? '/main' : '';
        console.log("API base path in save-type-handler.js:", this.apiBasePath);

        this.dropdownBtn = document.querySelector('.save-type-dropdown .action-btn');
        this.dropdownContent = document.querySelector('.dropdown-content');
        this.dropdownOptions = document.querySelectorAll('.dropdown-content a');
        this.currentAnswerId = null;
        
        // Wait for DOM to be fully loaded before initializing
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            // If DOM is already loaded, initialize now
            this.init();
        }
    }
    
    /**
     * Initialize the save type handler
     */
    init() {
        console.log('SaveTypeHandler initialized');
        
        // Get the required DOM elements
        this.dropdownBtn = document.querySelector('.save-type-dropdown .action-btn');
        this.dropdownContent = document.querySelector('.dropdown-content');
        this.dropdownOptions = document.querySelectorAll('.dropdown-content a');
        
        console.log('Found elements:', {
            dropdownBtn: !!this.dropdownBtn,
            dropdownContent: !!this.dropdownContent,
            dropdownOptions: this.dropdownOptions?.length || 0
        });
        
        // Set up event listeners for dropdown toggle
        if (this.dropdownBtn) {
            this.dropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dropdownContent.classList.toggle('active');
                console.log('Dropdown toggled', this.dropdownContent.classList.contains('active'));
            });
            
            // Close dropdown when clicking elsewhere
            document.addEventListener('click', () => {
                this.dropdownContent.classList.remove('active');
            });
            
            // Prevent closing when clicking inside dropdown
            this.dropdownContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        } else {
            console.error('Save type dropdown button not found. Cannot initialize dropdown.');
        }
        
        // Set up event listeners for dropdown options
        if (this.dropdownOptions && this.dropdownOptions.length > 0) {
            this.dropdownOptions.forEach(option => {
                option.addEventListener('click', (e) => {
                    e.preventDefault();
                    const newType = e.target.textContent;
                    const dataType = e.target.getAttribute('data-type');
                    
                    console.log('Option clicked:', newType, 'data-type:', dataType);
                    console.log('Current answer ID when option clicked:', this.currentAnswerId);
                    
                    if (this.currentAnswerId) {
                        // Use the data-type attribute if available (more reliable)
                        this.updateSaveType(this.currentAnswerId, newType, dataType);
                    } else {
                        // Try to get answer ID from save button as fallback
                        const saveBtn = document.querySelector('.save-btn');
                        const fallbackId = saveBtn?.getAttribute('data-answer-id');
                        
                        if (fallbackId) {
                            console.log('Using fallback answer ID from save button:', fallbackId);
                            this.currentAnswerId = fallbackId;
                            this.updateSaveType(fallbackId, newType, dataType);
                        } else {
                            console.error('No answer ID set or found. Cannot update save type.');
                            this.showToast('Error: No answer selected', true);
                        }
                    }
                });
            });
        } else {
            console.error('Save type dropdown options not found. Cannot initialize dropdown items.');
        }
    }
    
    /**
     * Set the current answer ID
     * @param {number} id - The ID of the current answer
     */
    setCurrentAnswerId(id) {
        console.log('Setting current answer ID:', id);
        this.currentAnswerId = id;
    }
    
    /**
     * Update the save type button text
     * @param {string} text - The new button text
     */
    updateButtonText(text) {
        if (this.dropdownBtn) {
            this.dropdownBtn.innerHTML = `
                <i class="fas fa-bookmark"></i>
                ${text}
                <i class="fas fa-chevron-down"></i>
            `;
            
            // Update active state in dropdown
            this.dropdownOptions.forEach(option => {
                if (option.textContent === text) {
                    option.classList.add('active');
                } else {
                    option.classList.remove('active');
                }
            });
        }
    }
    
    /**
     * Update the save type in the database
     * @param {number} answerId - The ID of the answer to update
     * @param {string} newType - The new save type (display text)
     * @param {string} dataType - The data-type attribute value (if available)
     */
    async updateSaveType(answerId, newType, dataType) {
        try {
            console.log('Updating save type for answer:', answerId);
            
            // Check if answer ID is valid
            if (!answerId) {
                console.error('Missing answer ID. Cannot update save type.');
                this.showToast('Error: Missing answer ID', true);
                return;
            }
            
            // Make sure answerId is a number
            const id = parseInt(answerId, 10);
            if (isNaN(id)) {
                console.error('Invalid answer ID:', answerId);
                this.showToast('Error: Invalid answer ID', true);
                return;
            }
            
            // Convert display type to database type - prefer data-type if available
            const saveType = dataType || (newType === 'Question Related' ? 'question_related' : 'Best response');
            
            console.log('Save type to send:', saveType);
            
            // Create the payload
            const payload = {
                answer_id: id,
                save_type: saveType
            };
            
            console.log('Sending payload:', payload);
            
            // Send the update request
            const response = await fetch(`${this.apiBasePath}/api/saved-answers/update_save_type.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            // Check if the response is OK
            if (!response.ok) {
                console.error('Server response not OK:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Error response text:', errorText);
                throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Response:', data);
            
            if (data.success) {
                // Update the UI
                this.updateButtonText(newType);
                this.dropdownContent.classList.remove('active');
                
                // Show success message
                this.showToast(`Save type updated to "${newType}"`, false);
                
                // Update dataset on the answer item
                const answerItem = document.querySelector(`[data-id="${answerId}"]`);
                if (answerItem) {
                    answerItem.dataset.saveType = newType;
                }
                
                // Dispatch custom event for other components
                const event = new CustomEvent('saveTypeUpdated', {
                    detail: {
                        answerId: answerId,
                        saveType: newType
                    }
                });
                document.dispatchEvent(event);
            } else {
                console.error('Error from server:', data);
                this.showToast(`Error: ${data.error || data.message || 'Failed to update save type'}`, true);
            }
        } catch (error) {
            console.error('Error updating save type:', error);
            this.showToast(`Error: ${error.message || 'Failed to update save type'}`, true);
        }
    }

    /**
     * Show toast notification
     * @param {string} message - The message to display
     * @param {boolean} isError - Whether it's an error message
     */
    showToast(message, isError = false) {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = 'toast-message' + (isError ? ' error' : '');
        toast.textContent = message;
        
        toastContainer.appendChild(toast);
        
        // Add visible class after a small delay (for animation)
        setTimeout(() => toast.classList.add('visible'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300); // Wait for fade out animation
        }, 3000);
    }
}

// Initialize the save type handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing SaveTypeHandler');
    if (!window.saveTypeHandler) {
        window.saveTypeHandler = new SaveTypeHandler();
        console.log('SaveTypeHandler initialized globally');
    } else {
        console.log('SaveTypeHandler already initialized');
    }
}); 
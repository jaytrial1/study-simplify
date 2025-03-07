/**
 * Save Type Handler
 * Manages the updating of save types for saved answers
 */

class SaveTypeHandler {
    constructor() {
        this.dropdownBtn = document.querySelector('.save-type-dropdown .action-btn');
        this.dropdownContent = document.querySelector('.dropdown-content');
        this.dropdownOptions = document.querySelectorAll('.dropdown-content a');
        this.currentAnswerId = null;
        
        // Initialize the handler
        this.init();
    }
    
    /**
     * Initialize the save type handler
     */
    init() {
        console.log('SaveTypeHandler initialized');
        // Set up event listeners for dropdown toggle
        if (this.dropdownBtn) {
            this.dropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dropdownContent.classList.toggle('active');
            });
            
            // Close dropdown when clicking elsewhere
            document.addEventListener('click', () => {
                this.dropdownContent.classList.remove('active');
            });
            
            // Prevent closing when clicking inside dropdown
            this.dropdownContent.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        // Set up event listeners for dropdown options
        this.dropdownOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                const newType = e.target.textContent;
                const dataType = e.target.getAttribute('data-type');
                
                console.log('Option clicked:', newType, 'data-type:', dataType);
                
                if (this.currentAnswerId) {
                    // Use the data-type attribute if available (more reliable)
                    this.updateSaveType(this.currentAnswerId, newType, dataType);
                } else {
                    console.error('No answer ID set. Cannot update save type.');
                    showToast('Error: No answer selected', true);
                }
            });
        });
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
            
            // Convert display type to database type - prefer data-type if available
            const saveType = dataType || (newType === 'Question Related' ? 'question_related' : 'Best response');
            
            console.log('Save type to send:', saveType);
            
            // Send the update request - only send answerId and saveType
            const response = await fetch('/main/api/saved-answers/update_save_type.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    answerId: parseInt(answerId),
                    saveType: saveType
                })
            });
            
            const data = await response.json();
            console.log('Response:', data);
            
            if (data.success) {
                // Update the UI
                this.updateButtonText(newType);
                this.dropdownContent.classList.remove('active');
                
                // Show success message
                showToast(`Save type updated to "${newType}"`, false);
                
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
                showToast(`Error: ${data.error || data.message || 'Failed to update save type'}`, true);
            }
        } catch (error) {
            console.error('Error updating save type:', error);
            showToast(`Error: ${error.message || 'Failed to update save type'}`, true);
        }
    }
}

/**
 * Show toast notification
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether it's an error message
 */
function showToast(message, isError = false) {
    // Check if the showToast function is already defined in the global scope
    if (window.showToast && window.showToast !== showToast) {
        // If it exists, use that one
        window.showToast(message, isError);
        return;
    }
    
    const toast = document.createElement('div');
    toast.className = 'toast-message' + (isError ? ' error' : '');
    toast.textContent = message;

    // Use toast container if it exists, otherwise append to body
    const container = document.getElementById('toast-container') || document.body;
    container.appendChild(toast);

    // Automatically remove the toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Initialize the save type handler when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing SaveTypeHandler');
    window.saveTypeHandler = new SaveTypeHandler();
}); 
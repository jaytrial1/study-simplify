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
                showAnswerActionPopup(e.touches[0].clientX, e.touches[0].clientY);
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
            showAnswerActionPopup(e.clientX, e.clientY);
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
    function showAnswerActionPopup(x, y) {
        // Remove existing popup if any
        const existingPopup = document.querySelector('.answer-action-popup');
        if (existingPopup) {
            existingPopup.remove();
        }

        // Create new popup
        const popup = document.createElement('div');
        popup.className = 'answer-action-popup';
        popup.style.display = 'block'; // Change from flex to block
        popup.innerHTML = `
            <div class="action-content">
                <button class="answer-action-button" data-type="Best Answer">Best Answer</button>
                <button class="answer-action-button" data-type="Save">Save</button>
                <button class="answer-action-button" data-type="Regenerate">Regenerate</button>
                <button class="answer-action-button" data-type="Copy Text">Copy Text</button>
            </div>
        `;
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
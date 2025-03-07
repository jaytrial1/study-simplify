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

        // Create new popup with only two options
        const popup = document.createElement('div');
        popup.className = 'answer-action-popup';
        popup.style.display = 'block';
        popup.innerHTML = `
            <div class="action-content">
                <button class="answer-action-button" data-type="Best response">Best response</button>
                <button class="answer-action-button" data-type="Question Related">Question Related</button>
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

        // Retrieve user ID from local storage
        const userId = localStorage.getItem('user_id') || 'N/A'; // Assuming user ID is stored in local storage

        // Log the user ID for debugging
        console.log('User ID:', userId);

        // Add event listeners for the buttons
        popup.querySelectorAll('.answer-action-button').forEach(button => {
            button.addEventListener('click', () => {
                const selectedType = button.dataset.type;
                console.log('Selected Type:', selectedType);
                const currentQuestion = Array.from(window.selectedQuestions)[0]; // Get the current question
                const subject = document.getElementById('selectedSubject').innerText;
                const chapter = document.getElementById('selectedChapter').innerText;
                const grade = localStorage.getItem('userGrade') || 'N/A'; // Retrieve from localStorage, default to 'N/A' if not found
                const currentQuestionText = currentQuestion; // Assuming currentQuestion holds the full text
                // const aiResponse = selectedResponseText; // Use the selected response text

                // Get the AI response from the clicked element's formatted content
                const formattedContent = clickedElement.querySelector('.formatted-content');
                const aiResponse = formattedContent ? formattedContent.innerHTML : '';

                // Log the data for debugging
                console.log('Current Question:', currentQuestion);
                console.log('Current Question Text:', currentQuestionText);
                console.log('Subject:', subject);
                console.log('Chapter:', chapter);
                console.log('Grade:', grade);
                console.log('AI Response:', aiResponse);

                // Send data to backend
                fetch('/main/api/saved-answers/save_to_database.php', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ 
                        user_id: userId,
                        question: currentQuestionText,
                        subject, 
                        chapter, 
                        saveType: selectedType, 
                        grade, 
                        aiResponse //: selectedResponseText
                    })
                })
                // .then(response => {
                //     // Check if the response is JSON before trying to parse it
                //     const contentType = response.headers.get("content-type");
                //     if (contentType && contentType.indexOf("application/json") !== -1) {
                //         return response.json();
                //     } else {
                //         // If it's not JSON, return the text content
                //         return response.text().then(text => {
                //             throw new Error("Expected JSON but received: " + text);
                //         });
                //     }
                // })
                .then(response => response.json())
                .then(data => {
                    console.log('Response from server:', data);
                    if (data.success) {
                        showToast('Answer saved successfully!', false);
                    } else {
                        // If the answer already exists, show the correct saved type
                        if (data.message && data.message.includes('already exists')) {
                            const saveType = data.save_type || "Unknown"; // Get correct type from response
                            showToast(`This answer has already been saved as "${saveType}".`, false);
                        } else {
                            showToast('Error saving answer: ' + data.message, false);
                        }
                    }
                    popup.style.display = 'none';
                })
                .catch(error => {
                    console.error('Error:', error);
                    if (error instanceof SyntaxError) {
                        showToast('Error: Invalid server response. Please try again.', false);
                    } else if (error.message.startsWith("Expected JSON but received:")) {
                        // Display the actual server error message
                        showToast('Server Error: ' + error.message.replace("Expected JSON but received:", ""), false);
                    } else {
                        showToast('An error occurred while saving the answer.', false);
                    }
                });
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
    const toast = document.getElementById('toastNotification');
    
    if (withAction) {
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
    } else {
        const toastMessage = document.getElementById('toastMessage');
        toastMessage.textContent = message;
    }

    toast.classList.add('active');

    setTimeout(() => {
        if (toast.classList.contains('active')) {
            toast.classList.remove('active');
        }
    }, 1000); // Display for 1 second
}
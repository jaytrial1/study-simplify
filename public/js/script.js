// Clear 3 things : userInput, toastNotification, commandPanel (selected questions bar)
function clearInput() {
    const userInput = document.getElementById('userInput');
    userInput.value = '';
    document.getElementById('toastNotification').classList.remove('active');
    document.getElementById('commandPanel').classList.remove('active');
}

// Function to check if chat is empty and show instructions
function checkEmptyChatAndShowInstructions() {
    const chatMessages = document.querySelector('.chat-messages');
    
    // If there are no messages in the chat area
    if (chatMessages && chatMessages.children.length === 0) {
        const instructionBox = document.createElement('div');
        instructionBox.className = 'empty-chat-instructions';
        instructionBox.innerHTML = `
            <div class="instruction-content">
                <i class="fas fa-keyboard"></i>
                <p>Type "/" in from your keyboard to see the questions and further type question name after "/" to find the question you want to study</p>
            </div>
        `;
        chatMessages.appendChild(instructionBox);
    } else if (chatMessages && chatMessages.querySelector('.empty-chat-instructions') && chatMessages.children.length > 1) {
        // Remove the instruction box if there are other messages
        const instructionBox = chatMessages.querySelector('.empty-chat-instructions');
        if (instructionBox) {
            instructionBox.remove();
        }
    }
}

// Show toast notification, withAction is optional, if true, show the action button, if false, show the message (Little pop up notification at the top of the page)
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
    }, withAction ? 5000 : 3000);
}

// Hide toast notification
function hideToast() {
    document.getElementById('toastNotification').classList.remove('active');
}

// Comfirmation whether the user want to clear all the questions and select a new subject and chapter (if user click on continue or cancel)
function showChangeConfirmation() {
    const toast = document.getElementById('toastNotification');
    toast.innerHTML = `
        <div class="confirmation-dialog">
            <p>You have unsaved selected questions. Changing chapters will clear them. Continue?</p>
            <div class="dialog-buttons">
                <button class="confirm-btn">Continue</button>
                <button class="cancel-btn">Cancel</button>
            </div>
        </div>
    `;
    toast.classList.add('active');
    // Return a promise (stops all other code from running) to handle the confirmation dialog (if user click on continue or cancel)
    return new Promise((resolve) => {
        const handleClick = (result) => {
            toast.classList.remove('active');
            resolve(result);
            toast.removeEventListener('click', handleClick);
        };

        toast.querySelector('.confirm-btn').addEventListener('click', () => handleClick(true));
        toast.querySelector('.cancel-btn').addEventListener('click', () => handleClick(false));
    });
}

// Global variable to store the last AI response
let lastAIResponse = '';

// Initialize the script after the page is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Move all variable declarations to the top
    const userInput = document.getElementById('userInput');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const commandPanel = document.getElementById('commandPanel');
    const dropdownTrigger = document.getElementById('dropdownTrigger');
    const dropdownPanel = document.getElementById('dropdownPanel');
    let isDragging = false;
    let startY = 0;
    let userGrade = localStorage.getItem('userGrade');
    let currentSubject = '';
    let currentChapter = '';
    // Initialize global selectedQuestions if it doesn't exist
    window.selectedQuestions = window.selectedQuestions || new Set();
    let chapters = []; 
    let allChapters = [];
    let cachedQuestions = [];
    let allGradeQuestions = [];

    // Detect server environment
    const isLocalServer = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.hostname.includes('192.168.') || 
                       window.location.hostname.includes('10.0.');
    
    console.log("Server detection in script.js:", isLocalServer ? "LOCAL SERVER" : "PRODUCTION SERVER");
    
    // Set API base path based on environment
    const apiBasePath = isLocalServer ? '/main' : '';
    console.log("API base path in script.js:", apiBasePath);

    // Check if chat is empty and show instructions
    checkEmptyChatAndShowInstructions();

    // -----------------------------------------------Variables--------------------------------------------------------------
    //  Define userGrade once
    //-----------------------------------------------------------------------------------------------------------------------


    //--------------------------------------------Side Panel----------------------------------------------------
    // Toggle sidebar on menu button click
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling
        sidebar.classList.toggle('active');
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('active') && 
            !sidebar.contains(e.target) && 
            !menuToggle.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });

    // Prevent sidebar from closing when clicking inside it
    sidebar.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    //-----------------------------------------------------------------------------------------------------------


    // -------------------------------------------------- Grade Selection --------------------------------------------------
    //  Show message if no grade is selected
    if (!userGrade) {
        showToast('Please select your grade level first');
    }

    //  Function to update userGrade when it changes
    function updateUserGrade(newGrade) {
        if (newGrade !== userGrade) {
            userGrade = newGrade;
            localStorage.setItem("userGrade", newGrade); // Ensure it's updated in localStorage
            loadSubjects(userGrade);

            // Reset UI selections
            document.getElementById('selectedSubject').textContent = 'Select Subject';
            document.getElementById('selectedChapter').textContent = 'Select Chapter';
            document.querySelector('.chapter-list').innerHTML = '';
        }
    }

    //  Listen for changes from the settings page (if another tab updates it)
    window.addEventListener("storage", (event) => {
        if (event.key === "userGrade") {
            updateUserGrade(event.newValue);
        }
    });
    // -----------------------------------------------------------------------------------------------------------------------

    //------------------------------------Functions to load the subject and chapter names dynamically---------------------------------
    // Add these functions after DOMContentLoaded
    function loadSubjects(grade) {
        console.log('Loading subjects for grade:', grade);
        fetch(`${apiBasePath}/api/navigation/subjects.php?grade=${grade}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Received subjects:', data);
                const subjectList = document.querySelector('.subject-list');
                const itemCount = document.querySelector('.dropdown-section .item-count');
                
                if (data.subjects && data.subjects.length > 0) {
                    subjectList.innerHTML = data.subjects
                        .map(subject => `<div class="dropdown-item" data-type="subject" data-value="${subject}">${subject}</div>`)
                        .join('');
                    itemCount.textContent = data.subjects.length;
                } else {
                    subjectList.innerHTML = '<div class="no-data">No subjects found</div>';
                    itemCount.textContent = '0';
                }
            })
            .catch(error => {
                console.error('Error loading subjects:', error);
                const subjectList = document.querySelector('.subject-list');
                subjectList.innerHTML = '<div class="error">Error loading subjects</div>';
            });
    }

    function loadChapters(grade, subject) {
        return fetch(`${apiBasePath}/api/navigation/chapters.php?grade=${grade}&subject=${subject}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => data.chapters)
            .catch(error => {
                console.error('Error loading chapters:', error);
                return [];
            });
    }

    function renderChapters(chapters) {
        const chapterList = document.querySelector('.chapter-list');
        const searchTerm = document.querySelector('.search-input').value.trim();
        
        chapterList.innerHTML = chapters
            .map(chapter => `
                <div class="dropdown-item" 
                     data-type="chapter" 
                     data-value="${chapter.name}"
                     data-subject="${chapter.subject}"
                     style="padding: 10px 15px; width: 100%; box-sizing: border-box; display: flex; flex-direction: column;">
                    <div style="font-size: 0.95em; white-space: normal; word-wrap: break-word; line-height: 1.2;">${chapter.name}</div>
                    ${searchTerm ? `
                        <div style="
                            font-size: 0.75em;
                            color: #4166d5;
                            margin-top: 4px;
                            white-space: normal;
                            word-wrap: break-word;
                            line-height: 1.2;
                        ">${chapter.subject}</div>
                    ` : ''}
                </div>
            `).join('');
    }

    // After DOMContentLoaded, add this:
    if (userGrade) {
        loadSubjects(userGrade);
        loadAllChapters(userGrade);
    } else {
        console.error('No grade found in localStorage');
    }
    //--------------------------------------------------------------------------------------------------------------------


    // -------------------------------------------------- Subject & Chapter Selection-----------------------------------------
    // Add subject selection handler
    const subjectSelect = document.querySelector('.subject-list'); // find the div with subject-list class
    if (subjectSelect) {
        subjectSelect.addEventListener('click', (e) => {
            const subject = e.target.textContent;
            currentSubject = subject;
            console.log('Subject selected:', currentSubject); // Debug log
        });
    }

    // Add chapter selection handler
    const chapterSelect = document.querySelector('.chapter-list'); // find the div with chapter-list class
    if (chapterSelect) {
        chapterSelect.addEventListener('click', (e) => {
            const chapter = e.target.textContent;
            currentChapter = chapter;
            console.log('Chapter selected:', currentChapter); // Debug log
        });
    }
    // ----------------------------------------------------------------------------------------------------------------------


    // -------------------------------------------------- Answer Type Popup--------------------------------------------------
    // This is called inside the handleSend function " const popup = document.querySelector('.answer-type-popup'); "
    const popupHTML = `
        <div class="answer-type-popup" id="answerTypePopup">
            <h3>Which kind of answer do you want?</h3>
            <div class="answer-type-buttons">
                <button class="answer-type-button short" data-type="short">Short</button>
                <button class="answer-type-button long" data-type="long">Long</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    // ----------------------------------------------------------------------------------------------------------------------


    // -------------------------------------------------- Send Button --------------------------------------------------------
    // Get the send button and add click handler
    const sendButton = document.getElementById('sendButton');
    if (sendButton) {
        sendButton.addEventListener('click', handleSend);
    }
    // ----------------------------------------------------------------------------------------------------------------------


    // ------------------------------------------ Remove the intro message --------------------------------------------------
    const removeIntroMessage = () => {
        const introMessage = document.querySelector('.intro-message');
        if (introMessage) {
            introMessage.remove();
        }

        // Also remove the instruction box if it exists
        const instructionBox = document.querySelector('.empty-chat-instructions');
        if (instructionBox) {
            instructionBox.remove();
        }
    };
    //----------------------------------------------------------------------------------------------------------------------


    // -------------------------------------------------- Send Button  ------------------------------------------------------
    // Modify the handleSend function
    async function handleSend(e) {
        e.preventDefault();
        const message = userInput.value.trim();

        // Check if it's the first message in a new chat session
        const isFirstMessage = chatHistory.currentSessionId === null;

        // Allow submission without input if it's the first message
        if (!message && !isFirstMessage) return;

        try {
            // If it's a new chat command, clear everything
            if (message === '/') {
                chatHistory.currentSessionId = null;
                window.selectedQuestions.clear();  // Use window.selectedQuestions
                const chatMessages = document.querySelector('.chat-messages');
                if (chatMessages) chatMessages.innerHTML = '';
                const questionDisplay = document.querySelector('.selected-questions');
                if (questionDisplay) questionDisplay.innerHTML = '';
                userInput.value = '';
                
                // Show the instruction box when clearing the chat
                checkEmptyChatAndShowInstructions();
                return;
            }

            // Add alert if no question is selected
            if (window.selectedQuestions.size === 0) {  // Use window.selectedQuestions
                showError('Please select a topic by typing "/" before sending a message.');
                return;
            }

            // Get the current question
            const currentQuestion = Array.from(window.selectedQuestions)[0];  // Use window.selectedQuestions
            let answerType = chatHistory.getAnswerType(currentQuestion);
            let isNewSession = false; // Add this flag

            // Clear input but keep the question selected
            userInput.value = '';

            // Display user message with animation
            const userMessageResult = addMessage('user', message);
            
            // Show a temporary "loading" message with improved animation
            const loadingMessageResult = addMessage('bot', '', true);
            
            // Get selected subject and chapter from UI
            const selectedSubjectText = document.getElementById('selectedSubject').textContent;
            const selectedChapterText = document.getElementById('selectedChapter').textContent;
            
            if (window.selectedQuestions.size > 0) {
                const sessionResponse = await chatHistory.startNewChat(  // Store the response
                    selectedSubjectText,
                    selectedChapterText,
                    currentQuestion
                );
                
                // Show popup only for new sessions
                if (!sessionResponse.existing) {
                    isNewSession = true;  // Set flag for new session
                    const selectedType = await showAnswerTypePopup();
                    chatHistory.setAnswerType(currentQuestion, selectedType);
                    answerType = selectedType;
                } else if (!answerType) {
                    answerType = 'short';
                    chatHistory.setAnswerType(currentQuestion, answerType);
                }
            }

            // Make sure we have an answerType before making the API call
            if (!answerType) {
                answerType = 'short'; // Default fallback
            }

            // Send to query.php
            const userGrade = localStorage.getItem('userGrade');
            const queryResponse = await fetch(`${apiBasePath}/api/ai/query.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    grade: userGrade,
                    subject: selectedSubjectText,
                    chapter: selectedChapterText,
                    questions: [currentQuestion],
                    answerType: answerType,
                    userPrompt: message,
                    session_id: chatHistory.currentSessionId,
                    isFirstMessage: isNewSession  // Use the flag here
                })
            });
            
            const queryData = await queryResponse.json();
            if (!queryData.success) {
                throw new Error(queryData.error || 'Failed to get AI response');
            }
            
            // Process each response
            queryData.responses.forEach(response => {
                // Check if response.text is an object and convert it properly
                let responseText = response.text;
                
                // Handle case where response.text is an object
                if (responseText === null || responseText === undefined) {
                    responseText = "Error: Empty response from server";
                } else if (typeof responseText === 'object') {
                    try {
                        // Try to convert it to JSON string first
                        responseText = JSON.stringify(responseText);
                        console.warn('Response was an object, converted to:', responseText);
                    } catch (e) {
                        responseText = "Error: Received object instead of text";
                        console.error('Failed to stringify object response:', e);
                    }
                }
                
                // Update loading message with AI response
                updateMessage(loadingMessageResult.element, responseText);
                
                // Process code blocks immediately instead of waiting for typing effect
                setTimeout(() => {
                    enhanceCodeBlocks(loadingMessageResult.element);
                }, 50);
                
                // Store the full AI response in the global variable
                lastAIResponse = responseText;
                console.log('Full AI Response:', lastAIResponse);
            });
            
        } catch (error) {
            console.error('Error in handleSend:', error);
            showToast('Failed to get response. Please try again.');
        }
    }

    // Add this new function after the existing functions
    function preprocessMarkdown(markdown) {
        // Ensure input is a string
        if (!markdown) return '';
        if (typeof markdown !== 'string') {
            try {
                markdown = String(markdown);
            } catch (e) {
                console.error('Failed to convert markdown to string:', e);
                return '';
            }
        }
        
        // If the content starts with triple backticks followed by markdown, remove them
        let processed = markdown;
        
        // Handle the case where the entire content is a fenced code block
        try {
            const fullBlockMatch = processed.match(/^```(\w+)?\n([\s\S]*?)```\s*$/);
            if (fullBlockMatch && (fullBlockMatch[1] === 'markdown' || !fullBlockMatch[1])) {
                return fullBlockMatch[2];
            }
        } catch (e) {
            console.error('Error processing markdown:', e);
        }
        
        return processed;
    }

    // Function to update an existing message
    function updateMessage(messageElement, newText) {
        // Handle the case where messageElement is in the new format (object with element property)
        if (messageElement && typeof messageElement === 'object' && messageElement.element) {
            messageElement = messageElement.element;
        }
        
        if (messageElement) {
            // Remove thinking class when updating with real content
            messageElement.classList.remove('thinking');
            
            // Process markdown content to clean up any issues before rendering
            const processedMarkdown = preprocessMarkdown(newText);
            
            // Convert markdown to HTML with failsafe
            let formattedContent = '';
            try {
                if (typeof marked !== 'undefined' && marked) {
                    formattedContent = marked.parse(processedMarkdown);
                } else {
                    console.warn('Marked library not fully loaded, displaying raw text');
                    formattedContent = `<pre>${processedMarkdown}</pre>`;
                }
            } catch (error) {
                console.error('Error parsing markdown:', error);
                formattedContent = `<pre>${processedMarkdown}</pre>`;
            }
            
            // Update the content
            messageElement.querySelector('.chat-content').innerHTML = formattedContent;
            
            // Ensure message has proper classes
            messageElement.classList.add('bot-message');
            
            // Find the content container and ensure it has the formatted-content class
            const contentContainer = messageElement.querySelector('.chat-content');
            if (contentContainer) {
                contentContainer.classList.add('formatted-content');
            }
        }
    }
    //--------------------------------------------------------------------------------------------------------------

    //--------------------------------Add response on the chat window---------------------------------------------
    function addMessage(type, content, isLoading = false) {
        const messagesContainer = document.querySelector('.chat-messages');
        
        // Remove instruction box if it exists when adding a new message
        const instructionBox = messagesContainer.querySelector('.empty-chat-instructions');
        if (instructionBox) {
            instructionBox.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `response ${type}-response`;

        // Generate a unique message ID for bot messages
        let messageId = null;
        if (type === 'bot') {
            messageId = 'msg-' + Date.now();
            messageDiv.dataset.messageId = messageId;
            
            if (isLoading) {
                // Add 'thinking' class for animated effects
                messageDiv.classList.add('thinking');
                
                // Show an animated "Thinking..." message that perfectly matches the dark UI
                messageDiv.innerHTML = `
                    <div class="bot-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="chat-content formatted-content">
                        <div class="thinking-animation">
                            <span>Thinking</span>
                            <span class="dot-animation">
                                <span class="dot"></span>
                                <span class="dot"></span>
                                <span class="dot"></span>
                            </span>
                        </div>
                    </div>
                `;
            } else {
                // Process markdown content to clean up any issues before rendering
                const processedMarkdown = preprocessMarkdown(content);
                
                // Convert Markdown to HTML using marked.js with failsafe
                let formattedContent = '';
                try {
                    if (typeof marked !== 'undefined' && marked) {
                        formattedContent = marked.parse(processedMarkdown);
                    } else {
                        console.warn('Marked library not fully loaded, displaying raw text');
                        formattedContent = `<pre>${processedMarkdown}</pre>`;
                    }
                } catch (error) {
                    console.error('Error parsing markdown:', error);
                    formattedContent = `<pre>${processedMarkdown}</pre>`;
                }
                
                messageDiv.innerHTML = `
                    <div class="bot-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="chat-content formatted-content">${formattedContent}</div>
                `;
            }
        } else {
            messageDiv.innerHTML = `
                <div class="chat-content selected-question">${content}</div>
            `;
        }

        messagesContainer.appendChild(messageDiv);
        
        // Auto-scroll to bottom (with smooth animation)
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Return the message element and ID (if it's a bot message)
        return { element: messageDiv, id: messageId };
    }
    
    //--------------------------------------------------------------------------------------------------------------------




    const chatMessages = document.getElementById('chatMessages');
    const commandItems = document.querySelectorAll('.command-item');
    

    // Funtion to load the question dynamically based on selected grade, subject and chapter
    async function loadQuestions(grade, subject, chapter, searchTerm = '') {
        try {
            const response = await fetch(`${apiBasePath}/api/navigation/questions.php?grade=${grade}&subject=${subject}&chapter=${chapter}&search=${searchTerm}`);
            const data = await response.json();
            return data.questions || [];
        } catch (error) {
            console.error('Error loading questions:', error);
            return [];
        }
    }

    // Function to load all questions for a grade regardless of subject and chapter
    async function loadAllQuestions(grade, searchTerm = '') {
        try {
            const response = await fetch(`${apiBasePath}/api/navigation/questions.php?grade=${grade}&search=${searchTerm}`);
            const data = await response.json();
            return data.all_questions || [];
        } catch (error) {
            console.error('Error loading all questions:', error);
            return [];
        }
    }


    //------------------------------Dynamic Question Suggestor--------------------------------------------

    // Real-Time Question Suggestion System  
    // Detects when the user types `/` in the input field  
    // - Shows relevant questions based on the selected subject & chapter  
    // - Filters questions dynamically as the user types  
    // - Prevents selecting questions from different chapters  
    // - Hides suggestions if no valid question is found  
    // - Uses cached questions to reduce API calls  

    // Helper function to show question scope selection dialog
    function showQuestionScopeDialog() {
        return new Promise((resolve) => {
            // Store input field reference 
            const inputField = document.getElementById('userInput');
            // Save the current selection range before showing dialog
            const selectionStart = inputField.selectionStart;
            const selectionEnd = inputField.selectionEnd;
            
            // Create the dialog as a floating element above the keyboard
            const scopeDialog = document.createElement('div');
            scopeDialog.className = 'answer-type-popup active';
            scopeDialog.style.position = 'fixed';
            scopeDialog.style.bottom = '100px'; // Position lower than before (was 160px)
            scopeDialog.style.left = '0';
            scopeDialog.style.right = '0';
            scopeDialog.style.zIndex = '1000';
            scopeDialog.innerHTML = `
                <div class="popup-content" style="background-color: #1c1c1c; border-radius: 8px; padding: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); max-width: 320px; width: 90%; margin: 0 auto;">
                    <h3 style="color: #fff; margin-top: 0; margin-bottom: 16px; font-size: 16px; text-align: center;">Which questions would you like to see?</h3>
                    <button class="scope-button" data-scope="chapter">Only from current chapter</button>
                    <button class="scope-button" data-scope="all">All questions</button>
                </div>
            `;
            document.body.appendChild(scopeDialog);

            const buttons = scopeDialog.querySelectorAll('.scope-button');
            buttons.forEach(button => {
                button.onclick = () => {
                    const scope = button.dataset.scope;
                    
                    // Remove the dialog without affecting focus
                    document.body.removeChild(scopeDialog);
                    
                    // Ensure input still has focus without refocusing
                    if (document.activeElement !== inputField) {
                        // Only refocus if necessary (avoid unnecessary focus changes)
                        inputField.focus();
                        
                        // Restore selection position
                        try {
                            inputField.setSelectionRange(selectionStart, selectionEnd);
                        } catch (e) {
                            // Handle any errors silently
                            console.log("Error restoring selection", e);
                        }
                    }
                    
                    resolve(scope);
                };
            });

            // Add click outside to close but preserve focus
            scopeDialog.addEventListener('click', (e) => {
                if (e.target === scopeDialog) {
                    // Remove dialog without disturbing focus
                    document.body.removeChild(scopeDialog);
                    
                    // Only refocus if necessary
                    if (document.activeElement !== inputField) {
                        inputField.focus();
                        try {
                            inputField.setSelectionRange(selectionStart, selectionEnd);
                        } catch (e) {
                            console.log("Error restoring selection", e);
                        }
                    }
                    
                    resolve('all'); // Default to all questions if closed without selection
                }
            });
        });
    }

    // Update command panel event listener
    userInput.addEventListener('input', async (e) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        
        // Find the last slash before cursor position
        const lastSlashIndex = value.lastIndexOf('/', cursorPosition);
        
        if (lastSlashIndex === -1 || lastSlashIndex >= cursorPosition) {
            commandPanel.classList.remove('active');
            return;
        }
        
        // Get current selections
        const selectedSubject = document.getElementById('selectedSubject').textContent;
        const selectedChapter = document.getElementById('selectedChapter').textContent;
        
        // Get the search text after slash
        const searchText = value.slice(lastSlashIndex, cursorPosition).slice(1).toLowerCase();
        
        // Check if we need to load questions for specific subject/chapter or all questions
        let questionsToDisplay = [];
        
        // Only show the scope selection dialog when:
        // 1. User has just typed "/" (no additional text after slash)
        // 2. Subject and chapter have already been selected
        // 3. Command panel is not already active
        
        // First check if we already have a scope set in the data attribute
        let questionScope = commandPanel.dataset.currentScope || 'all'; 
        
        // Only prompt for scope if this is a fresh "/" with nothing after it
        if (value === '/' && 
            selectedSubject !== 'Select Subject' && 
            selectedChapter !== 'Select Chapter' && 
            !commandPanel.classList.contains('active')) {
            questionScope = await showQuestionScopeDialog();
            // Save the user's choice in the data attribute for persistence during typing
            commandPanel.dataset.currentScope = questionScope;
        }
        
        // Now, use the scope to determine which questions to display
        if (questionScope === 'chapter' && selectedSubject !== 'Select Subject' && selectedChapter !== 'Select Chapter') {
            // Show only current chapter questions
            if (cachedQuestions.length === 0) {
                showLoadingIndicator();
                cachedQuestions = await loadQuestions(userGrade, selectedSubject, selectedChapter);
                hideLoadingIndicator();
            }
            questionsToDisplay = cachedQuestions;
            commandPanel.classList.add('chapter-specific'); // Add class for chapter-specific height
        } else {
            // Default to showing all questions
            if (allGradeQuestions.length === 0) {
                showLoadingIndicator();
                allGradeQuestions = await loadAllQuestions(userGrade);
                hideLoadingIndicator();
            }
            questionsToDisplay = allGradeQuestions;
            commandPanel.classList.remove('chapter-specific'); // Use default height for global questions
        }
        
        // Real-time filtering based on what user types
        let filteredQuestions = [];
        
        if (Array.isArray(questionsToDisplay) && questionsToDisplay.length > 0) {
            // Check if we're dealing with the all-questions format (objects with question, subject, chapter)
            const isAllQuestionsFormat = typeof questionsToDisplay[0] === 'object' && questionsToDisplay[0].hasOwnProperty('question');
            
            if (isAllQuestionsFormat) {
                // Filter the questions based on search text and current scope
                filteredQuestions = searchText 
                    ? questionsToDisplay.filter(item => {
                        const questionText = item.question.toLowerCase();
                        const subjectText = item.subject.toLowerCase();
                        const chapterText = item.chapter.toLowerCase();
                        
                        // For chapter-specific scope, only show questions from current chapter
                        if (commandPanel.dataset.currentScope === 'chapter') {
                            return item.subject === selectedSubject && 
                                   item.chapter === selectedChapter && 
                                   questionText.includes(searchText) && 
                                   !window.selectedQuestions.has(item.question);
                        }
                        
                        // For global scope, show all matching questions
                        return (questionText.includes(searchText) || 
                                subjectText.includes(searchText) || 
                                chapterText.includes(searchText)) && 
                                !window.selectedQuestions.has(item.question);
                    })
                    : questionsToDisplay.filter(item => {
                        // Apply the same scope filtering even without search text
                        if (commandPanel.dataset.currentScope === 'chapter') {
                            return item.subject === selectedSubject && 
                                   item.chapter === selectedChapter && 
                                   !window.selectedQuestions.has(item.question);
                        }
                        return !window.selectedQuestions.has(item.question);
                    });
            } else {
                // Regular format (just question strings)
                filteredQuestions = searchText 
                    ? questionsToDisplay.filter(question => 
                        question.toLowerCase().includes(searchText) && 
                        !window.selectedQuestions.has(question)
                    )
                    : questionsToDisplay.filter(question => !window.selectedQuestions.has(question));
            }
        }

        // Apply pagination for large result sets
        const currentPage = 1;
        const resultsPerPage = 20;
        const paginatedQuestions = applyPagination(filteredQuestions, currentPage, resultsPerPage);
        const totalPages = Math.ceil(filteredQuestions.length / resultsPerPage);
        
        // Update UI based on filtered questions
        if (filteredQuestions.length === 0) {
            commandPanel.innerHTML = `
                <div class="command-list">
                    <div class="command-item">
                        <div class="command-content">
                            <div class="text-col">
                                <div class="command-question">No questions available</div>
                            </div>
                        </div>
                    </div>
                </div>`;
        } else {
            commandPanel.innerHTML = `
                <div class="command-list">
                    ${paginatedQuestions.map(item => {
                        // Handle both formats (object or string)
                        const isObject = typeof item === 'object';
                        const question = isObject ? item.question : item;
                        const subject = isObject ? item.subject : null;
                        const chapter = isObject ? item.chapter : null;
                        
                        // Clean up question text - remove leading slash if present
                        let displayText = question;
                        let cleanedQuestion = question;
                        
                        if (displayText.startsWith('/')) {
                            displayText = displayText.substring(1).trim();
                            cleanedQuestion = displayText; // Store cleaned version for data-command
                        }
                        
                        // Truncate if needed
                        const maxQuestionLength = 60;
                        if (displayText.length > maxQuestionLength) {
                            displayText = displayText.substring(0, maxQuestionLength) + '...';
                        }
                            
                        return `
                            <div class="command-item" 
                                data-command="${cleanedQuestion}"
                                ${subject ? `data-subject="${subject}"` : ''}
                                ${chapter ? `data-chapter="${chapter}"` : ''}>
                                <div class="command-content">
                                    <div class="text-col">
                                        <div class="command-question">${displayText}</div>
                                        ${subject && chapter ? 
                                            `<div class="command-context"><i class="fas fa-folder"></i> ${subject} > ${chapter}</div>` : ''}
                                    </div>
                                </div>
                            </div>`;
                    }).join('')}
                    
                    ${totalPages > 1 ? `
                    <div class="pagination-info">
                        Showing ${Math.min(resultsPerPage, filteredQuestions.length)} of ${filteredQuestions.length} questions
                        ${searchText ? `matching "${searchText}"` : ''}
                    </div>` : ''}
                </div>`;
        }
        
        commandPanel.classList.add('active');
    });
    
    // Helper function to paginate results
    function applyPagination(items, currentPage, itemsPerPage) {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return items.slice(startIndex, startIndex + itemsPerPage);
    }
    
    // Helper functions for loading indicators
    function showLoadingIndicator() {
        // Check if loading indicator already exists
        if (!document.querySelector('.command-loading')) {
            const loadingIndicator = document.createElement('div');
            loadingIndicator.className = 'command-loading';
            loadingIndicator.innerHTML = `
                <i class="fas fa-spinner fa-spin"></i>
                <span>Loading...</span>
            `;
            commandPanel.innerHTML = '';
            commandPanel.appendChild(loadingIndicator);
            commandPanel.classList.add('active');
        }
    }
    
    function hideLoadingIndicator() {
        const loadingIndicator = document.querySelector('.command-loading');
        if (loadingIndicator) {
            loadingIndicator.remove();
        }
    }
    //----------------------------------------------------------------------------------------------------------------


    //--------------------------------Display & remove question after being selected by the user-------------------------------

    // Handles Clicks on Suggested Questions  
    // - Detects when a user clicks a suggested question  
    // - Adds the selected question to `selectedQuestions`  
    // - Clears the input field after selection  
    // - Updates the UI to reflect selected questions  
    // - Hides the suggestion panel (`commandPanel`) after selection  
    // - Refocuses on the input field for continuous typing  

    // Update the click handler for command items
    commandPanel.addEventListener('click', async (e) => {
        const commandItem = e.target.closest('.command-item');
        if (!commandItem) return;
        
        const command = commandItem.dataset.command;
        if (!command) return;
        
        // Clear the input including the '/' character
        userInput.value = '';
        
        // Get subject and chapter from the data attributes
        const subject = commandItem.dataset.subject;
        const chapter = commandItem.dataset.chapter;
        
        // If we have subject/chapter info, update the UI selections
        if (subject && chapter) {
            document.getElementById('selectedSubject').textContent = subject;
            document.getElementById('selectedChapter').textContent = chapter;
            currentSubject = subject;
            currentChapter = chapter;
            
            // Also update the dropdown UI if needed
            const filteredChapters = allChapters.filter(c => c.subject === subject);
            renderChapters(filteredChapters);
        }
        
        // Ensure the command doesn't have a leading slash when added to the set
        let cleanCommand = command;
        if (cleanCommand.startsWith('/')) {
            cleanCommand = cleanCommand.substring(1).trim();
        }
        
        // Check if there's an existing chat session for this question
        try {
            const userId = localStorage.getItem('user_id');
            if (!userId) {
                throw new Error('User ID not found');
            }
            
            // Make API call to check for existing chat session
            const response = await fetch(`${apiBasePath}/api/chat/check_existing.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: userId,
                    question: cleanCommand
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.exists && data.session_id) {
                // Close the command panel before redirecting
                commandPanel.classList.remove('active');
                // Session exists - load the existing chat
                await chatHistory.loadChatSession(data.session_id);
                return; // Exit early since we've redirected to existing chat
            }
        } catch (error) {
            console.error('Error checking for existing chat:', error);
            // Continue with normal flow if there's an error
        }
        
        // Normal flow - no existing chat or error checking
        // Clear any previously selected questions before adding new one
        window.selectedQuestions.clear();
        
        // Add the selected question (without slash)
        window.selectedQuestions.add(cleanCommand);
        
        updateSelectedQuestionsUI();
        commandPanel.classList.remove('active');
        
        // Use setTimeout to preserve focus and keep the keyboard open on mobile
        setTimeout(() => {
            userInput.focus();
        }, 10);
    });

    // Add click handler for removing questions
    document.getElementById('selectedQuestionsContainer').addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-question')) {
            const questionText = e.target.previousElementSibling.textContent;
            window.selectedQuestions.delete(questionText);
            updateSelectedQuestionsUI(); // Each selected question are added into container as a tag with cross to remove them
        }
    });
    //--------------------------------------------------------------------------------------------------------------



    // Add white-space style to message content CSS
    const style = document.createElement('style');
    style.textContent = `
        .message-content {
            white-space: pre-wrap;  /* This preserves line breaks */
        }
        
        .dropdown-item {
            white-space: normal;
            word-wrap: break-word;
            width: 100%;
            box-sizing: border-box;
        }

        .subject-list, .chapter-list {
            overflow-y: auto;
            overflow-x: hidden;
            max-height: 300px;
        }

        .chapter-subject {
            font-size: 0.75rem;
            color: #4166d5;
            margin-top: 0.2rem;
            display: block;
        }
        
        /* Scope selection dialog buttons */
        .scope-button {
            background-color: #252525;
            color: #fff;
            border: none;
            border-radius: 4px;
            padding: 12px 16px;
            margin: 8px 0;
            width: 100%;
            text-align: left;
            font-size: 14px;
            cursor: pointer;
            transition: background-color 0.2s;
            display: flex;
            align-items: center;
        }
        
        .scope-button:hover {
            background-color: #2d2d2d;
        }
        
        .scope-button:before {
            content: '';
            display: inline-block;
            width: 18px;
            height: 18px;
            margin-right: 10px;
            background-color: #333;
            border-radius: 3px;
            flex-shrink: 0;
        }
        
        .scope-button[data-scope="chapter"]:before {
            background-color: #4166d5;
            mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M64 480H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H288c-10.1 0-19.6-4.7-25.6-12.8L243.2 57.6C231.1 41.5 212.1 32 192 32H64C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64z"/></svg>');
            mask-size: contain;
            mask-repeat: no-repeat;
            mask-position: center;
            -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M64 480H448c35.3 0 64-28.7 64-64V160c0-35.3-28.7-64-64-64H288c-10.1 0-19.6-4.7-25.6-12.8L243.2 57.6C231.1 41.5 212.1 32 192 32H64C28.7 32 0 60.7 0 96V416c0 35.3 28.7 64 64 64z"/></svg>');
            -webkit-mask-size: contain;
            -webkit-mask-repeat: no-repeat;
            -webkit-mask-position: center;
        }
        
        .scope-button[data-scope="all"]:before {
            background-color: #4166d5;
            mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M40 48C26.7 48 16 58.7 16 72v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V72c0-13.3-10.7-24-24-24H40zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zM16 232v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V232c0-13.3-10.7-24-24-24H40c-13.3 0-24 10.7-24 24zM40 368c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V392c0-13.3-10.7-24-24-24H40z"/></svg>');
            mask-size: contain;
            mask-repeat: no-repeat;
            mask-position: center;
            -webkit-mask-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M40 48C26.7 48 16 58.7 16 72v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V72c0-13.3-10.7-24-24-24H40zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32H480c17.7 0 32-14.3 32-32s-14.3-32-32-32H192zM16 232v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V232c0-13.3-10.7-24-24-24H40c-13.3 0-24 10.7-24 24zM40 368c-13.3 0-24 10.7-24 24v48c0 13.3 10.7 24 24 24H88c13.3 0 24-10.7 24-24V392c0-13.3-10.7-24-24-24H40z"/></svg>');
            -webkit-mask-size: contain;
            -webkit-mask-repeat: no-repeat;
            -webkit-mask-position: center;
        }
        
        /* Command panel styling - updated for mobile */
        .command-panel {
            overflow-y: auto;
            border-radius: 0;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
            background-color: #1c1c1c;
            padding: 0;
            /* Better positioning for mobile */
            position: absolute;
            bottom: 100%;
            left: 0;
            right: 0;
            z-index: 100;
            margin: 0 0 8px 0;
            /* Add a nice animation */
            opacity: 0;
            transform: translateY(5px);
            transition: opacity 0.15s ease, transform 0.15s ease;
            /* Default max-height for global questions */
            max-height: 48vh;
        }
        
        /* Specific height for chapter questions to not overlap selection panel */
        .command-panel.chapter-specific {
            max-height: calc(100vh - 280px);
        }
        
        .command-panel.active {
            opacity: 1;
            transform: translateY(0);
        }
        
        .command-list {
            padding: 6px;
        }
        
        /* Completely redesigned question item styling */
        .command-item {
            margin: 6px;
            background-color: #252525;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.15s ease;
        }
        
        .command-content {
            display: flex;
            align-items: center;
            min-height: 56px;
            padding: 10px 12px;
        }
        
        .text-col {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        
        .command-question {
            color: #fff;
            font-size: 14px;
            font-weight: 500;
            line-height: 1.3;
            margin-bottom: 4px;
            margin-left: 0;
            padding-left: 0;
        }
        
        .command-context {
            font-size: 11px;
            color: #4166d5;
            display: flex;
            align-items: center;
            line-height: 1.2;
        }
        
        .command-context i {
            margin-right: 5px;
            font-size: 11px;
        }
        
        .command-item:hover {
            background-color: #2d2d2d;
        }
        
        /* Loading indicator */
        .command-loading {
            padding: 12px;
            text-align: center;
            color: #aaa;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background-color: #1c1c1c;
        }
        
        .command-loading i {
            color: #4166d5;
            font-size: 14px;
        }
        
        /* Pagination info */
        .pagination-info {
            padding: 8px;
            text-align: center;
            font-size: 11px;
            color: #777;
            background-color: #1c1c1c;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        
        /* Make question tag in selected container more appealing */
        .question-tag {
            background-color: #4166d5;
            border-radius: ;
            padding: 6px 10px;
            margin-right: 6px;ss
            margin-bottom: 6px;
            display: inline-flex;
            align-items: center;
            font-size: 13px;
        }
        
        .question-tag .remove-question {
            margin-left: 6px;
            width: 16px;
            height: 16px;
            background-color: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            display: flex;
            
            cursor: pointer;
            font-size: 11px;
        }
    `;
    document.head.appendChild(style);


    //-------------------------------Input area's autoResizer ---------------------------------------
    // Auto-resize textarea
    function autoResizeTextarea() {
        userInput.style.height = 'auto'; // Reset height
        const newHeight = Math.min(userInput.scrollHeight, 150);
        userInput.style.height = newHeight + 'px';
        userInput.style.overflowY = userInput.scrollHeight > 150 ? 'auto' : 'hidden';
        
        // Calculate total input height including padding
        const chatInput = document.querySelector('.chat-input');
        const totalInputHeight = chatInput.offsetHeight;
        
        // Adjust chat messages bottom position
        const chatMessages = document.querySelector('.chat-messages');
        chatMessages.style.bottom = `${totalInputHeight}px`;
    }

    // Add event listeners for auto-resize
    userInput.addEventListener('input', autoResizeTextarea);

    // Reset height when cleared
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            setTimeout(autoResizeTextarea, 0);
        }
    });
    //-------------------------------------------------------------------------------------------------------------------------------------------------

    //-----------------Mobile & Dekstop Handlers for opening and closing dropdownPanel for subject and chapter selection-------------------------------
    // Mobile touch handlers
    if ('ontouchstart' in window) {
        dropdownTrigger.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            isDragging = false;
        });

        dropdownTrigger.addEventListener('touchend', (e) => {
            if (!isDragging) {
                dropdownPanel.classList.toggle('active');
            }
            isDragging = false;
        });
    }
    // Desktop click handler
    else {
        dropdownTrigger.addEventListener('click', (e) => {
            dropdownPanel.classList.toggle('active');
        });
    }
    
    
    // Close dropdown when clicking outsideupdateSelectedQuestionsUI
    document.addEventListener('click', (e) => {
        if (!dropdownTrigger.contains(e.target) && !dropdownPanel.contains(e.target)) {
            dropdownPanel.classList.remove('active');
        }
    });
    //---------------------------------------------------------------------------------------------------------------------------------------------------


    // -------------------------Disclaimer of loss of selected questions in the input bar before changing the subject or chapter-------------------------

    // Checks if selected questions exist and asks for confirmation before clearing them when switching subjects/chapters.
    async function confirmChangeIfNeeded() {
        // Clear command panel (selected questions bar) if active
        if (commandPanel.classList.contains('active')) {
            userInput.value = '';
            commandPanel.classList.remove('active');
        }
        
        if (window.selectedQuestions.size > 0) {
            const confirmed = await showChangeConfirmation(); //If the subject or chapter is changed with questions in the container then this function is used...!
            if (!confirmed) return false;
            window.selectedQuestions.clear();
            updateSelectedQuestionsUI(); // Each selected question are added into container as a tag with cross to remove them
        }
        return true;
    }

    // Modify subject selection handler
    document.querySelector('.subject-list').addEventListener('click', async e => {
        const subjectItem = e.target.closest('.dropdown-item[data-type="subject"]');
        if (!subjectItem) return;
        
        if (!await confirmChangeIfNeeded()) return; // Checks if selected questions exist and asks for confirmation before clearing them when switching subjects/chapters.
        
        const subjectValue = subjectItem.dataset.value;
        currentSubject = subjectValue;
        document.getElementById('selectedSubject').textContent = subjectValue;
        document.getElementById('selectedChapter').textContent = 'Select Chapter';
        cachedQuestions = [];
        const filteredChapters = allChapters.filter(chapter => chapter.subject === subjectValue);
        renderChapters(filteredChapters);
    });

    // Modify chapter selection handler
    document.querySelector('.chapter-list').addEventListener('click', async e => {
        const chapterItem = e.target.closest('.dropdown-item[data-type="chapter"]');
        if (!chapterItem) return;
        
        if (!await confirmChangeIfNeeded()) return; // Checks if selected questions exist and asks for confirmation before clearing them when switching subjects/chapters.
        
        const chapterValue = chapterItem.dataset.value;
        currentChapter = chapterValue;
        document.getElementById('selectedChapter').textContent = chapterValue;
        const subjectValue = chapterItem.dataset.subject;
        currentSubject = subjectValue;
        document.getElementById('selectedSubject').textContent = subjectValue;
        cachedQuestions = [];
        const filteredChapters = allChapters.filter(chapter => chapter.subject === subjectValue);
        renderChapters(filteredChapters);
        dropdownPanel.classList.remove('active');
    });

    //---------------------------------------------------------------------------------------------------------------------------------------------------


    //------------------------ Filters subjects and chapters dynamically as the user types in the search box.--------------------------------------------
    document.querySelector('.search-input').addEventListener('input', function(e) {
        const term = e.target.value.toLowerCase().trim();
        
        // Show all chapters for searching without clearing selections
        if (term) {
            renderChapters(allChapters); // Show all chapters for searching
        } else {
            // When search is cleared, show chapters based on current selection
            const selectedSubject = document.getElementById('selectedSubject').textContent;
            if (selectedSubject !== 'Select Subject') {
                const filteredChapters = allChapters.filter(chapter => chapter.subject === selectedSubject);
                renderChapters(filteredChapters);
            } else {
                renderChapters(allChapters);
            }
        }
        
        // Filter visible items based on search term
        document.querySelectorAll('.dropdown-item').forEach(item => {
            const isSubject = item.dataset.type === 'subject';
            const itemText = item.textContent.toLowerCase();
            const chapterSubject = item.dataset.subject?.toLowerCase() || '';
            
            const match = itemText.includes(term) || chapterSubject.includes(term);
            item.style.display = match ? 'flex' : 'none';
        });
    });
    //-------------------------------------------------------------------------------------------------------------------------------------------------

    // -----------------------------------------Monitor if the grade is changed or not-----------------------------------------------------------------
    // Listen for grade changes from settings window
    window.addEventListener('message', (event) => {
        if (event.data.type === 'gradeChanged') {
            const newGrade = event.data.grade;
            if (newGrade) {
                userGrade = newGrade;
                console.log('Grade updated:', userGrade);
                loadSubjects(newGrade);
            }
        }
    });
    //-------------------------------------------------------------------------------------------------------------------------------------------------

    //--------------------------------------Load all the chanpters existing inside the selected grade and subject--------------------------------------
    async function loadAllChapters(grade) {
        try {
            const response = await fetch(`${apiBasePath}/api/navigation/subjects.php?grade=${grade}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            const subjects = data.subjects || [];
            
            for (const subject of subjects) {
                const chapters = await loadChapters(grade, subject);
                allChapters.push(...chapters.map(chapter => ({
                    name: chapter,
                    subject: subject
                })));
            }
            
            renderChapters(allChapters);
        } catch (error) {
            console.error('Error loading all chapters:', error);
        }
    }
    //-------------------------------------------------------------------------------------------------------------------------------------------


    // Each selected question are added into container as a tag with cross to remove them 
    function updateSelectedQuestionsUI() {
        const container = document.getElementById('selectedQuestionsContainer');
        container.innerHTML = '';
        
        window.selectedQuestions.forEach(question => {
            // Remove leading slash if present
            let displayText = question;
            if (displayText.startsWith('/')) {
                displayText = displayText.substring(1).trim();
            }
            
            // Truncate question text if too long
            const maxQuestionLength = 40;
            const displayQuestion = displayText.length > maxQuestionLength 
                ? displayText.substring(0, maxQuestionLength) + '...' 
                : displayText;
                
            const tag = document.createElement('div');
            tag.className = 'question-tag';
            tag.innerHTML = `
                <span title="${question}">${displayQuestion}</span>
                <div class="remove-question">×</div>
            `;
            container.appendChild(tag);
        });
    }
    
    // Add this function to show errors to the user
    function showError(message) {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'toast-message error';
        toast.textContent = message;

        // Add to toast container
        const container = document.getElementById('toast-container');
        container.appendChild(toast);

        // Automatically remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Add to your question removal handler
    function removeQuestion(question) {
        window.selectedQuestions.delete(question);
        chatHistory.removeQuestion(question);
        updateSelectedQuestionsDisplay();
    }

    // Helper function to show answer type popup
    function showAnswerTypePopup() {
        return new Promise((resolve) => {
            // Store input field reference to refocus later
            const inputField = document.getElementById('userInput');
            
            const answerTypePopup = document.createElement('div');
            answerTypePopup.className = 'answer-type-popup active';
            answerTypePopup.innerHTML = `
                <div class="popup-content">
                    <h3>Choose Answer Type</h3>
                    <button class="answer-type-button" data-type="short">Short Answer</button>
                    <button class="answer-type-button" data-type="long">Detailed Answer</button>
                </div>
            `;
            document.body.appendChild(answerTypePopup);

            const buttons = answerTypePopup.querySelectorAll('.answer-type-button');
            buttons.forEach(button => {
                button.onclick = () => {
                    const type = button.dataset.type;
                    answerTypePopup.remove();
                    
                    // Refocus the input field to keep keyboard open on mobile
                    setTimeout(() => {
                        inputField.focus();
                    }, 10);
                    
                    resolve(type);
                };
            });
            
            // Add click outside to close
            answerTypePopup.addEventListener('click', (e) => {
                if (e.target === answerTypePopup) {
                    answerTypePopup.remove();
                    
                    // Refocus the input field to keep keyboard open on mobile
                    setTimeout(() => {
                        inputField.focus();
                    }, 10);
                    
                    resolve('short'); // Default to short answer if closed without selection
                }
            });
        });
    }

    // Function to enhance code blocks
    function enhanceCodeBlocks(messageElement) {
        // Get all code blocks
        const codeBlocks = messageElement.querySelectorAll('pre code');
        codeBlocks.forEach(codeBlock => {
            // Add language class if not present
            if (!codeBlock.className.includes('language-')) {
                codeBlock.classList.add('language-plaintext');
            }
            
            // Apply syntax highlighting
            if (typeof hljs !== 'undefined') {
                hljs.highlightElement(codeBlock);
            }
            
            // Add copy button container if not already wrapped
            const preElement = codeBlock.parentElement;
            if (preElement.parentElement.classList.contains('code-block-container')) {
                return;
            }
            
            // Create container
            const container = document.createElement('div');
            container.classList.add('code-block-container');
            
            // Create header with language and copy button
            const header = document.createElement('div');
            header.classList.add('code-block-header');
            
            // Get language from class
            let language = 'Code';
            codeBlock.classList.forEach(cls => {
                if (cls.startsWith('language-')) {
                    language = cls.replace('language-', '').toUpperCase();
                }
            });
            
            header.innerHTML = `
                <span>${language}</span>
                <button class="copy-code-button" onclick="copyCode(this)">
                    <i class="fas fa-copy"></i> Copy
                </button>
            `;
            
            // Insert elements
            preElement.parentNode.insertBefore(container, preElement);
            container.appendChild(header);
            container.appendChild(preElement);
        });
    }

});
// Clear 3 things : userInput, toastNotification, commandPanel (selected questions bar)
function clearInput() {
    const userInput = document.getElementById('userInput');
    userInput.value = '';
    document.getElementById('toastNotification').classList.remove('active');
    document.getElementById('commandPanel').classList.remove('active');
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

    // Detect server environment
    const isLocalServer = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' || 
                       window.location.hostname.includes('192.168.') || 
                       window.location.hostname.includes('10.0.');
    
    console.log("Server detection in script.js:", isLocalServer ? "LOCAL SERVER" : "PRODUCTION SERVER");
    
    // Set API base path based on environment
    const apiBasePath = isLocalServer ? '/main' : '';
    console.log("API base path in script.js:", apiBasePath);

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
        if (!message && !isFirstMessage) return; // Prevent sending empty messages unless it's the first message

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
                return;
            }

            // Add alert if no question is selected
            if (window.selectedQuestions.size === 0) {  // Use window.selectedQuestions
                showError('Please select a question before sending a message.');
                return;
            }

            // Get the current question
            const currentQuestion = Array.from(window.selectedQuestions)[0];  // Use window.selectedQuestions
            let answerType = chatHistory.getAnswerType(currentQuestion);
            let isNewSession = false; // Add this flag

            // Clear input but keep the question selected
            userInput.value = '';

            // Display user message with animation
            const userMessageElement = addMessage('user', message);
            
            // Show a temporary "loading" message with improved animation
            const loadingMessageId = addMessage('bot', '', true);
            
            if (window.selectedQuestions.size > 0) {
                const sessionResponse = await chatHistory.startNewChat(  // Store the response
                    selectedSubject.textContent,
                    selectedChapter.textContent,
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
                    subject: selectedSubject.textContent,
                    chapter: selectedChapter.textContent,
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
                // Update loading message with AI response
                updateMessage(loadingMessageId, response.text);
                
                // Apply typewriter effect to the updated message
                setTimeout(() => {
                    applyTypewriterEffect(loadingMessageId);
                    
                    // Process code blocks after the typewriter effect is applied
                    setTimeout(() => {
                        enhanceCodeBlocks(loadingMessageId);
                    }, 100);
                }, 50);
                
                // Store the full AI response in the global variable
                lastAIResponse = response.text;
                console.log('Full AI Response:', lastAIResponse);
            });
            
        } catch (error) {
            console.error('Error in handleSend:', error);
            showToast('Failed to get response. Please try again.');
        }
    }

    // Function to update an existing message
    function updateMessage(messageElement, newText) {
        if (messageElement) {
            // Convert markdown to HTML
            const formattedContent = marked.parse(newText);
            
            // Update the content
            messageElement.querySelector('.chat-content').innerHTML = formattedContent;
            
            // Remove loading indicator if present
            const loadingIndicator = messageElement.querySelector('.typing-indicator');
            if (loadingIndicator) {
                loadingIndicator.remove();
            }
            
            // Ensure message has proper classes for animation
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
        const messageDiv = document.createElement('div');
        messageDiv.className = `response ${type}-response`;

        if (type === 'bot') {
            if (isLoading) {
                // Show spinner animation
                messageDiv.innerHTML = `
                    <div class="bot-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="chat-content formatted-content">
                        <div class="typing-indicator">
                            <span></span><span></span><span></span>
                        </div>
                    </div>
                `;
            } else {
                // Convert Markdown to HTML using marked.js
                const formattedContent = marked.parse(content);
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
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        return messageDiv; // Return message element to update later
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


    //------------------------------Dynamic Question Suggestor--------------------------------------------

    // Real-Time Question Suggestion System  
    // Detects when the user types `/` in the input field  
    // - Shows relevant questions based on the selected subject & chapter  
    // - Filters questions dynamically as the user types  
    // - Prevents selecting questions from different chapters  
    // - Hides suggestions if no valid question is found  
    // - Uses cached questions to reduce API calls  

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
        
        // Check if subject is selected
        if (selectedSubject === 'Select Subject' || selectedChapter === 'Select Chapter') {
            commandPanel.innerHTML = `
                <div class="command-list">
                    <div class="command-item">
                        <i class="fas fa-info-circle"></i>
                        ${selectedSubject === 'Select Subject' ? 'Please select a subject first' : 'Please select a chapter first'}
                    </div>
                </div>`;
            commandPanel.classList.add('active');
            
            // Remove the slash after 1.5 seconds
            setTimeout(() => {
                if (userInput.value.endsWith('/')) {
                    userInput.value = userInput.value.slice(0, -1);
                    commandPanel.classList.remove('active');
                }
            }, 1500);
            return;
        }
        
        // Get the search text after slash
        const searchText = value.slice(lastSlashIndex, cursorPosition).slice(1).toLowerCase();
        
        // Load questions only if we don't have them cached
        if (cachedQuestions.length === 0) {
            cachedQuestions = await loadQuestions(userGrade, selectedSubject, selectedChapter);
        }
        
        // Real-time filtering based on what user types
        const filteredQuestions = searchText 
            ? cachedQuestions.filter(question => {
                // Don't show questions that are already in the input
                const currentInput = value.toLowerCase();
                return !currentInput.includes(question.toLowerCase()) && 
                       question.toLowerCase().includes(searchText);
            })
            : cachedQuestions.filter(question => 
                !value.toLowerCase().includes(question.toLowerCase())
            );
        
        // Filter out already selected questions
        const availableQuestions = filteredQuestions.filter(q => 
            !window.selectedQuestions.has(q)
        );

        if (availableQuestions.length === 0) {
            commandPanel.innerHTML = `
                <div class="command-list">
                    <div class="command-item">No new questions available</div>
                </div>`;
        } else {
            commandPanel.innerHTML = `
                <div class="command-list">
                    ${availableQuestions
                        .map(question => `
                            <div class="command-item" data-command="${question}">
                                ${question}
                            </div>`)
                        .join('')}
                </div>`;
        }
        
        commandPanel.classList.add('active');
    });
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
    commandPanel.addEventListener('click', (e) => {
        const commandItem = e.target.closest('.command-item');
        if (!commandItem) return;
        
        const command = commandItem.dataset.command;
        if (!command) return;
        
        // Clear the input including the '/' character
        userInput.value = '';
        
        // Clear any previously selected questions before adding new one
        window.selectedQuestions.clear();
        // Add the selected question
        window.selectedQuestions.add(command);
        updateSelectedQuestionsUI();
        commandPanel.classList.remove('active');
        userInput.focus();
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
            const tag = document.createElement('div');
            tag.className = 'question-tag';
            tag.innerHTML = `
                <span>${question}</span>
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
                    resolve(type);
                };
            });
        });
    }

    // Apply a fast typewriter effect to the AI response - more like ChatGPT
    function applyTypewriterEffect(messageElement) {
        if (!messageElement || !messageElement.classList.contains('bot-message')) return;
        
        const contentDiv = messageElement.querySelector('.chat-content');
        if (!contentDiv) return;
        
        // Store the original HTML
        const originalHTML = contentDiv.innerHTML;
        
        // Extract all text content by parsing HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = originalHTML;
        
        // Hide the original content
        contentDiv.innerHTML = '';
        
        // Add the cursor element
        const cursor = document.createElement('span');
        cursor.className = 'cursor-blink';
        contentDiv.appendChild(cursor);
        
        // Track if user has manually scrolled
        let userHasScrolled = false;
        const scrollContainer = messageElement.closest('.chat-messages');
        
        // Add scroll event listener to detect manual scrolling
        const scrollHandler = () => {
            // Check if user has scrolled to the bottom
            if (scrollContainer) {
                const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 20; // 20px tolerance
                
                // If at bottom, enable auto-scroll, otherwise disable it
                userHasScrolled = !isAtBottom;
            } else {
                userHasScrolled = true;
            }
        };
        
        if (scrollContainer) {
            scrollContainer.addEventListener('scroll', scrollHandler, { passive: true });
            scrollContainer.addEventListener('wheel', scrollHandler, { passive: true });
            scrollContainer.addEventListener('touchmove', scrollHandler, { passive: true });
            // Touch start event to capture finger scrolling
            scrollContainer.addEventListener('touchstart', () => {
                // Don't reset the flag here, just detect the start of touch interaction
            }, { passive: true });
        }
        
        // Process the HTML to maintain formatting but add typing animation
        const processNodeWithTyping = (node, parentElement) => {
            if (node.nodeType === Node.TEXT_NODE) {
                // Skip empty text nodes
                if (!node.textContent.trim()) {
                    parentElement.appendChild(node.cloneNode(true));
                    return Promise.resolve();
                }
                
                // Animation for text nodes
                return new Promise(resolve => {
                    const text = node.textContent;
                    const textContainer = document.createElement('span');
                    textContainer.className = 'typewriter-animation';
                    textContainer.setAttribute('data-animation-element', 'true'); // Add a data attribute for easier identification
                    parentElement.appendChild(textContainer);
                    
                    // Remove cursor during text typing
                    if (cursor.parentNode) {
                        cursor.parentNode.removeChild(cursor);
                    }
                    
                    // Type the text quickly - much faster than ChatGPT but still visible
                    let charIndex = 0;
                    const textLength = text.length;
                    
                    // Function to add characters with dynamically calculated delay
                    const typeNextBatch = () => {
                        // Process multiple characters at once for speed
                        const charsPerBatch = Math.max(1, Math.floor(textLength / 50)); // Dynamic batch size
                        const endIndex = Math.min(charIndex + charsPerBatch, textLength);
                        
                        // Add a batch of characters
                        textContainer.textContent += text.substring(charIndex, endIndex);
                        charIndex = endIndex;
                        
                        // Auto-scroll only if user hasn't manually scrolled
                        if (scrollContainer && !userHasScrolled) {
                            scrollContainer.scrollTop = scrollContainer.scrollHeight;
                        }
                        
                        if (charIndex < textLength) {
                            // Calculate dynamic delay - faster for longer texts
                            const baseDelay = 5; // Base milliseconds between batches (very fast)
                            const dynamicDelay = Math.max(1, baseDelay - (textLength / 1000)); // Reduce delay for longer texts
                            
                            setTimeout(typeNextBatch, dynamicDelay);
                        } else {
                            // Finished this text node
                            parentElement.appendChild(cursor);
                            resolve();
                        }
                    };
                    
                    // Start typing
                    typeNextBatch();
                });
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // Clone the element without its children
                const newElement = document.createElement(node.tagName);
                
                // Copy attributes
                for (let i = 0; i < node.attributes.length; i++) {
                    const attr = node.attributes[i];
                    newElement.setAttribute(attr.name, attr.value);
                }
                
                // Add to parent
                parentElement.appendChild(newElement);
                
                // If it's a code block, handle differently (no typing animation for code)
                if (node.tagName === 'PRE' || (node.tagName === 'CODE')) {
                    newElement.innerHTML = node.innerHTML;
                    return Promise.resolve();
                }
                
                // Process children sequentially with reduced delay
                const processChildren = async () => {
                    for (let i = 0; i < node.childNodes.length; i++) {
                        await processNodeWithTyping(node.childNodes[i], newElement);
                    }
                };
                
                return processChildren();
            } else {
                // Other node types (comments, etc.)
                parentElement.appendChild(node.cloneNode(true));
                return Promise.resolve();
            }
        };
        
        // Start processing the entire content
        messageElement.classList.add('bot-typing-active');
        
        // Process all nodes in the original content
        const processContent = async () => {
            for (let i = 0; i < tempDiv.childNodes.length; i++) {
                await processNodeWithTyping(tempDiv.childNodes[i], contentDiv);
            }
            
            // Animation complete - clean up
            messageElement.classList.remove('bot-typing-active');
            
            // Remove cursor when done
            if (cursor.parentNode) {
                setTimeout(() => {
                    cursor.parentNode.removeChild(cursor);
                }, 500);
            }
            
            // Remove scroll listeners
            if (scrollContainer) {
                scrollContainer.removeEventListener('scroll', scrollHandler);
                scrollContainer.removeEventListener('wheel', scrollHandler);
                scrollContainer.removeEventListener('touchmove', scrollHandler);
            }
            
            // Enhance any code blocks
            setTimeout(() => {
                enhanceCodeBlocks(messageElement);
            }, 100);
        };
        
        // Begin the animation
        processContent();
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
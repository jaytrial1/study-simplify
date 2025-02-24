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
    const selectedQuestions = new Set();
    let chapters = []; 
    let allChapters = [];
    let cachedQuestions = [];

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
        fetch(`/main/api/navigation/subjects.php?grade=${grade}`)
            .then(response => response.json())
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
        return fetch(`/main/api/navigation/chapters.php?grade=${grade}&subject=${subject}`)
            .then(response => response.json())
            .then(data => data.chapters)
            .catch(error => console.error('Error loading chapters:', error));
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
        
        try {
            // If it's a new chat command, clear everything
            if (message === '/') {
                chatHistory.currentSessionId = null;
                selectedQuestions.clear();
                const chatMessages = document.querySelector('.chat-messages');
                if (chatMessages) chatMessages.innerHTML = '';
                const questionDisplay = document.querySelector('.selected-questions');
                if (questionDisplay) questionDisplay.innerHTML = '';
                userInput.value = '';
                return;
            }

            // Add alert if no question is selected
            if (selectedQuestions.size === 0) {
                showError('Please select a question before sending a message.');
                return;
            }

            // Get the current question
            const currentQuestion = Array.from(selectedQuestions)[0];
            let answerType = chatHistory.getAnswerType(currentQuestion);
            let isNewSession = false; // Add this flag
            
            if (selectedQuestions.size > 0) {
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
            const queryResponse = await fetch('/main/api/ai/query.php', {
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
            
            // Display responses
            queryData.responses.forEach(async response => {
                addMessage('user', message);
                addMessage('bot', response.text);
                // Save AI response to chat history
                await chatHistory.addMessage(response.text, 'bot');
            });
            
            // Clear input but keep the question selected
            userInput.value = '';
            
        } catch (error) {
            console.error('Error in handleSend:', error);
            addMessage('error', 'Failed to get response. Please try again.');
        }
    }
    //--------------------------------------------------------------------------------------------------------------

    //--------------------------------Add response on the chat window---------------------------------------------
    function addMessage(type, content) {
        const messagesContainer = document.querySelector('.chat-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        if (type === 'bot') {
            // Format the content
            const formattedContent = content
                // Bold text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                
                // Numbered sections
                .replace(/^(\d+\.\s+[^\n]+)/gm, '<div class="section-heading">$1</div>')
                
                // Key terms in blue
                .replace(/\b(understand customer behavior|target the right audience|various platforms)\b/g, 
                    '<span class="key-term">$1</span>')
                
                // Main bullet points
                .replace(/^•\s*([^\n]+)/gm, '<li>$1</li>')
                
                // Example lines
                .replace(/^Example:\s*([^\n]+)/gm, '<div class="example">Example: $1</div>')
                
                // Wrap lists
                .replace(/((?:<li[^>]*>.*?<\/li>\n*)+)/g, '<ul>$1</ul>')
                
                // Memory tips
                .replace(/Memory Tip:\s*([^\n]+)/g, 
                    '<div class="memory-tip"><div class="memory-tip-label">💡 Memory Tip</div>$1</div>')
                
                // Clean up extra whitespace
                .replace(/\n\n+/g, '\n')
                .replace(/\n(?![<])/g, '<br>');

            messageDiv.innerHTML = `
                <div class="bot-icon">
                    <i class="fas fa-robot"></i>
                </div>
                <div class="message-content markdown-content">${formattedContent}</div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content">${content}</div>
            `;
        }
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    //--------------------------------------------------------------------------------------------------------------------




    const chatMessages = document.getElementById('chatMessages');
    const commandItems = document.querySelectorAll('.command-item');
    

    // Funtion to load the question dynamically based on selected grade, subject and chapter
    async function loadQuestions(grade, subject, chapter, searchTerm = '') {
        try {
            const response = await fetch(`/main/api/navigation/questions.php?grade=${grade}&subject=${subject}&chapter=${chapter}&search=${searchTerm}`);
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
                       question.toLowerCase().startsWith(searchText);
            })
            : cachedQuestions.filter(question => 
                !value.toLowerCase().includes(question.toLowerCase())
            );
        
        // Filter out already selected questions
        const availableQuestions = filteredQuestions.filter(q => 
            !selectedQuestions.has(q)
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
        
        selectedQuestions.add(command);
        updateSelectedQuestionsUI();
        commandPanel.classList.remove('active');
        userInput.focus();
    });

    // Add click handler for removing questions
    document.getElementById('selectedQuestionsContainer').addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-question')) {
            const questionText = e.target.previousElementSibling.textContent;
            selectedQuestions.delete(questionText);
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
        
        if (selectedQuestions.size > 0) {
            const confirmed = await showChangeConfirmation(); //If the subject or chapter is changed with questions in the container then this function is used...!
            if (!confirmed) return false;
            selectedQuestions.clear();
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
        const subjects = await fetch(`/main/api/navigation/subjects.php?grade=${grade}`)
            .then(response => response.json())
            .then(data => data.subjects);
        
        for (const subject of subjects) {
            const chapters = await loadChapters(grade, subject);
            allChapters.push(...chapters.map(chapter => ({
                name: chapter,
                subject: subject
            })));
        }
        
        renderChapters(allChapters);
    }
    //-------------------------------------------------------------------------------------------------------------------------------------------


    // Each selected question are added into container as a tag with cross to remove them 
    function updateSelectedQuestionsUI() {
        const container = document.getElementById('selectedQuestionsContainer');
        container.innerHTML = '';
        
        selectedQuestions.forEach(question => {
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
        // You can implement this based on your UI, for now using alert
        alert(message);
    }


    // Add this function with other utility functions
    // function updateSelectedQuestionsDisplay() {
    //     const container = document.getElementById('selectedQuestionsContainer');
    //     container.innerHTML = '';
        
    //     selectedQuestions.forEach(question => {
    //         const questionTag = document.createElement('div');
    //         questionTag.className = 'selected-question';
    //         questionTag.innerHTML = `
    //             ${question}
    //             <span class="remove-question" data-question="${question}">&times;</span>
    //         `;
    //         container.appendChild(questionTag);
    //     });

    //     // Add click handlers for remove buttons
    //     container.querySelectorAll('.remove-question').forEach(button => {
    //         button.addEventListener('click', (e) => {
    //             const questionToRemove = e.target.dataset.question;
    //             selectedQuestions.delete(questionToRemove);
    //             updateSelectedQuestionsDisplay();
    //         });
    //     });
    // }


    // // Function to handle user message
    // function handleUserMessage() {
    //     const message = userInput.value.trim();
    //     if (message) {
    //         if (message.startsWith('/')) {
    //             handleCommand(message);
    //         } else {
    //             addMessage(message, true);
    //         }
    //         // userInput.value = '';
    //         // autoResizeTextarea(); // Reset the textarea height
    //         commandPanel.classList.remove('active');
    //     }
    // }

    // sendButton.addEventListener('click', handleUserMessage);
    // userInput.addEventListener('keydown', (e) => {
    //     const isMobile = 'ontouchstart' in window;
        
    //     // Mobile: Allow Enter for new lines, only button submits
    //     if (isMobile && e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
    //         return; // Let browser handle normally (new line)
    //     }

    //     // Desktop: Ctrl/Cmd + Enter to submit
    //     if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    //         e.preventDefault();
    //         handleUserMessage();
    //     }
    // });

    // // Check if there are questions from a different chapter
    // if (hasQuestionsFromDifferentChapter(value.slice(0, lastSlashIndex), selectedChapter)) {
    //     commandPanel.innerHTML = `
    //         <div class="command-list">
    //             <div class="command-item" style="
    //                 background: #f8d7da;
    //                 color: #721c24;
    //                 border: 1px solid #f5c6cb;
    //                 padding: 12px;
    //                 border-radius: 4px;
    //                 text-align: center;
    //             ">
    //                 Please send your current message or clear the input to select questions from a different chapter
    //             </div>
    //         </div>`;
    //     commandPanel.classList.add('active');
    //     return;
    // }

    // Add to your question removal handler
    function removeQuestion(question) {
        selectedQuestions.delete(question);
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
});
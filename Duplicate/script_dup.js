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
    const topicSelectionContainer = document.getElementById('topicSelectionContainer');
    const topicButtonsContainer = document.getElementById('topicButtonsContainer');
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
    
    // Use window.apiBasePath if it's already defined, otherwise set it based on environment
    if (typeof window.apiBasePath === 'undefined') {
        window.apiBasePath = isLocalServer ? '/main' : '';
    }
    
    // Always use window.apiBasePath for all API calls
    const apiBasePath = window.apiBasePath;
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
        fetch(`${window.apiBasePath}/api/navigation/subjects.php?grade=${grade}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
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
        return fetch(`${window.apiBasePath}/api/navigation/chapters.php?grade=${grade}&subject=${subject}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Ensure chapters are formatted as objects with name and subject properties
                if (data.chapters && Array.isArray(data.chapters)) {
                    return data.chapters.map(chapter => {
                        // If chapter is already an object with the right properties, return it
                        if (typeof chapter === 'object' && chapter.name && chapter.subject) {
                            return chapter;
                        }
                        // If chapter is a string, convert to object with subject
                        return {
                            name: typeof chapter === 'string' ? chapter : chapter.toString(),
                            subject: subject
                        };
                    });
                }
                return [];
            })
            .catch(error => {
                console.error('Error loading chapters:', error);
                return [];
            });
    }

    function renderChapters(chapters) {
        const chapterList = document.querySelector('.chapter-list');
        const searchTerm = document.querySelector('.search-input').value.trim();
        
        chapterList.innerHTML = '';
        
        if (chapters && chapters.length > 0) {
            chapters.forEach(chapter => {
                const chapterItem = document.createElement('div');
                chapterItem.className = 'dropdown-item';
                chapterItem.dataset.type = 'chapter';
                chapterItem.dataset.value = chapter.name;
                chapterItem.dataset.subject = chapter.subject;
                chapterItem.style.padding = '10px 15px';
                chapterItem.style.width = '100%';
                chapterItem.style.boxSizing = 'border-box';
                chapterItem.style.display = 'flex';
                chapterItem.style.flexDirection = 'column';
                
                // Create a wrapper for the chapter name with proper wrapping
                const nameWrapper = document.createElement('div');
                nameWrapper.style.fontSize = '0.95em';
                nameWrapper.style.whiteSpace = 'normal';
                nameWrapper.style.wordWrap = 'break-word';
                nameWrapper.style.lineHeight = '1.2';
                nameWrapper.textContent = chapter.name;
                chapterItem.appendChild(nameWrapper);
                
                // Add subject info if we're searching
                if (searchTerm) {
                    const subjectInfo = document.createElement('div');
                    subjectInfo.style.fontSize = '0.75em';
                    subjectInfo.style.color = '#4166d5';
                    subjectInfo.style.marginTop = '4px';
                    subjectInfo.style.whiteSpace = 'normal';
                    subjectInfo.style.wordWrap = 'break-word';
                    subjectInfo.style.lineHeight = '1.2';
                    subjectInfo.textContent = chapter.subject;
                    chapterItem.appendChild(subjectInfo);
                }
                
                chapterList.appendChild(chapterItem);
            });
        } else {
            const noChapters = document.createElement('div');
            noChapters.className = 'no-data';
            noChapters.textContent = 'No chapters found';
            chapterList.appendChild(noChapters);
        }
    }

    // After DOMContentLoaded, add this:
    if (userGrade) {
        loadSubjects(userGrade);
        // Load all chapters and show them initially
        loadAllChapters(userGrade).then(() => {
            // Display all chapters in the dropdown initially
            renderChapters(allChapters);
            // Update item count
            document.querySelector('.dropdown-section .item-count:nth-of-type(2)').textContent = allChapters.length || '0';
        });
    } else {
        console.error('No grade found in localStorage');
    }
    //--------------------------------------------------------------------------------------------------------------------


    // -------------------------------------------------- Subject & Chapter Selection-----------------------------------------
    // Add subject selection handler
    const subjectSelect = document.querySelector('.subject-list'); // find the div with subject-list class
    if (subjectSelect) {
        subjectSelect.addEventListener('click', async (e) => {
            const subjectItem = e.target.closest('.dropdown-item');
            if (!subjectItem || subjectItem.dataset.type !== 'subject') return;
            
            const subject = subjectItem.textContent;
            
            // Check if we need to confirm changes
            if (!(await confirmChangeIfNeeded())) {
                return; // User cancelled the change
            }
            
            // Update UI
            document.getElementById('selectedSubject').textContent = subject;
            document.getElementById('selectedChapter').textContent = 'Select Chapter';
            
            // Update current state
            currentSubject = subject;
            currentChapter = '';
            
            // Filter chapters for selected subject from allChapters
            const filteredChapters = allChapters.filter(chapter => chapter.subject === subject);
            console.log('Filtered chapters for subject:', subject, filteredChapters);
            
            // Render the filtered chapters in the dropdown
            renderChapters(filteredChapters);
            
            // Update item count
            document.querySelector('.dropdown-section .item-count:nth-of-type(2)').textContent = 
                filteredChapters.length || '0';
            
            // Clear cached questions and selected questions
            cachedQuestions = [];
            window.selectedQuestions.clear();
            updateSelectedQuestionsUI();
            
            // Hide topic selection container
            topicSelectionContainer.classList.remove('active');
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
        const userInput = document.getElementById('userInput');
        const userMessage = userInput.value.trim();
        
        // Clear the command panel if it's open
        commandPanel.classList.remove('active');
        
        // Ignore empty messages, but keep previous behavior if we have a selected question
        if (userMessage === '' && window.selectedQuestions.size === 0) {
            return;
        }
        
        // Also, hide topic selection container when sending a message
        topicSelectionContainer.classList.remove('active');
        
        // Clear the message from the input area
        userInput.value = '';
        autoResizeTextarea();
        
        // Check if a topic is selected
        if (window.selectedQuestions.size === 0) {
            showError('Please select a topic by typing "/" or clicking a topic button before sending a message.');
            return;
        }

        try {
            // If it's a new chat command, clear everything
            if (userMessage === '/') {
                chatHistory.currentSessionId = null;
                window.selectedQuestions.clear();  // Use window.selectedQuestions
                const chatMessages = document.querySelector('.chat-messages');
                if (chatMessages) chatMessages.innerHTML = '';
                const questionDisplay = document.querySelector('.selected-questions');
                if (questionDisplay) questionDisplay.innerHTML = '';
                userInput.value = '';
                
                // Show instruction box when clearing the chat
                checkEmptyChatAndShowInstructions();
                return;
            }

            // Get the current question
            const currentQuestion = Array.from(window.selectedQuestions)[0];  // Use window.selectedQuestions
            let answerType = chatHistory.getAnswerType(currentQuestion);
            let isNewSession = false; // Add this flag

            // Display user message with animation
            const userMessageResult = addMessage('user', userMessage);
            
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
            
            // Build full API URL with proper encoding
            const apiUrl = `${window.apiBasePath}/api/ai/query.php`;
            console.log("Sending request to:", apiUrl);
            
            // Build request data
            const requestData = {
                grade: userGrade,
                subject: selectedSubjectText,
                chapter: selectedChapterText,
                questions: [currentQuestion],
                answerType: answerType,
                userPrompt: userMessage,
                session_id: chatHistory.currentSessionId,
                isFirstMessage: isNewSession
            };
            
            console.log("Request data:", JSON.stringify(requestData));
            
            // Log initiation for frontend
            console.log("%c[AI Request Start]%c Sending request...", "color: blue; font-weight: bold;", "color: black;");

            // Make the API call
            const queryResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(requestData)
            });
            
            console.log("Response status:", queryResponse.status);
            
            // Check if API key logging header is present and output to console
            const apiKeyLog = queryResponse.headers.get('X-API-Key-Log');
            if (apiKeyLog) {
                console.log("%c[API Key Usage]%c " + apiKeyLog, "color: purple; font-weight: bold;", "color: black;");
            }
            
            // Check for HTTP errors first
            if (!queryResponse.ok) {
                const errorText = await queryResponse.text();
                console.error("%c[API HTTP Error]%c Status: " + queryResponse.status, "color: red; font-weight: bold;", "color: black;");
                console.error("Error response text:", errorText);
                 // Try to parse potential JSON error with debug log
                 try {
                     const errorData = JSON.parse(errorText);
                     if (errorData.responses && errorData.responses[0] && errorData.responses[0].debug_log) {
                         console.log("%c--- Backend Debug Log (HTTP Error) ---%c", "color: orange; font-weight: bold;", "color: black;");
                         errorData.responses[0].debug_log.forEach(log => console.log("  " + log));
                         console.log("%c--- End Debug Log ---%c", "color: orange; font-weight: bold;", "color: black;");
                     }
                 } catch (e) {
                     // Ignore if parsing fails, just means it wasn't JSON
                 }
                throw new Error(`API request failed with status ${queryResponse.status}: ${errorText}`);
            }
            
            // Parse JSON response
            let queryData;
            const responseTextForParsing = await queryResponse.text(); // Read as text first for better error handling
            try {
                queryData = JSON.parse(responseTextForParsing);
                console.log("%c[API Success]%c Raw Response Data:", "color: green; font-weight: bold;", "color: black;", queryData);
            } catch (jsonError) {
                console.error("%c[JSON Parse Error]%c", "color: red; font-weight: bold;", "color: black;", jsonError);
                console.error("Raw response text that failed parsing:", responseTextForParsing);
                throw new Error(`Failed to parse API response: ${jsonError.message}`);
            }
            
            // Check for API-level errors reported in the JSON
            if (!queryData.success) {
                console.error("%c[API Logic Error]%c", "color: orange; font-weight: bold;", "color: black;", queryData.error || 'Unknown API error');
                // Log debug info if available even on API error
                if (queryData.responses && queryData.responses[0] && queryData.responses[0].debug_log) {
                    console.log("%c--- Backend Debug Log (API Error) ---%c", "color: orange; font-weight: bold;", "color: black;");
                    queryData.responses[0].debug_log.forEach(log => console.log("  " + log));
                    console.log("%c--- End Debug Log ---%c", "color: orange; font-weight: bold;", "color: black;");
                }
                throw new Error(queryData.error || 'Failed to get AI response');
            }
            
            // Process each response (assuming one for now based on PHP logic)
            if (queryData.responses && queryData.responses.length > 0) {
                queryData.responses.forEach(response => {
                    // Log the debug info from the backend (if present)
                    if (response.debug_log && Array.isArray(response.debug_log)) {
                        console.log("%c--- Backend Debug Log ---%c", "color: purple; font-weight: bold;", "color: black;");
                        response.debug_log.forEach(log => console.log("  " + log));
                        console.log("%c--- End Debug Log ---%c", "color: purple; font-weight: bold;", "color: black;");
                    }
                    // The warning about missing debug_log has been removed as it's normal when logging is disabled

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
                    console.log("%cUpdating chat message with final AI response.%c", "color: green; font-weight: bold;", "color: black;");
                    updateMessage(loadingMessageResult.element, responseText);
                    
                    // Process code blocks immediately
                    setTimeout(() => {
                        enhanceCodeBlocks(loadingMessageResult.element);
                    }, 50);
                    
                    // Store the full AI response
                    lastAIResponse = responseText;
                    // console.log('Full AI Response:', lastAIResponse); // Already logged in debug section
                });
            } else {
                 console.error("%c[API Logic Error]%c", "color: orange; font-weight: bold;", "color: black;", "No responses array found in successful queryData");
                 throw new Error('Received success, but no responses from API.');
            }
            
        } catch (error) {
            console.error('%c[handleSend Error]%c Error caught in handleSend:', "color: red; font-weight: bold;", "color: black;", error);
            // Update the loading message to show the error
            if (typeof loadingMessageResult !== 'undefined' && loadingMessageResult && loadingMessageResult.element) {
                 updateMessage(loadingMessageResult.element, `⚠️ Error: ${error.message}`);
                 // Add error class to the message bubble
                 loadingMessageResult.element.classList.add('error-message'); 
                 loadingMessageResult.element.classList.remove('loading');
            } else {
                 // Fallback if loading message wasn't created
                 addMessage('bot error-message', `⚠️ Error: ${error.message}`);
            }
            showToast('Failed to get response. Check console for details.');
        }
    }

    // Function to preprocess markdown content
    function preprocessMarkdown(markdown) {
        // Ensure input is a string
        if (!markdown) return { markdown: '', chartData: [] };
        if (typeof markdown !== 'string') {
            try {
                // Handle special case for objects
                if (typeof markdown === 'object') {
                    // Check for OpenAI-like response format
                    if (markdown.choices && Array.isArray(markdown.choices) && markdown.choices.length > 0) {
                        if (markdown.choices[0].message && markdown.choices[0].message.content) {
                            markdown = markdown.choices[0].message.content;
                        } else if (markdown.choices[0].text) {
                            markdown = markdown.choices[0].text;
                        }
                    } 
                    // Check for common completion formats
                    else if (markdown.completion) {
                        markdown = markdown.completion;
                    } else if (markdown.answer) {
                        markdown = markdown.answer;
                    } 
                    // Try to extract text from known object formats
                    else if (markdown.text) {
                        markdown = markdown.text;
                    } else if (markdown.message) {
                        markdown = markdown.message;
                    } else if (markdown.content) {
                        markdown = markdown.content;
                    } else if (markdown.response) {
                        markdown = markdown.response;
                    } else if (markdown.data && typeof markdown.data === 'object') {
                        // Try nested data object
                        if (markdown.data.text) {
                            markdown = markdown.data.text;
                        } else if (markdown.data.message) {
                            markdown = markdown.data.message;
                        } else if (markdown.data.content) {
                            markdown = markdown.data.content;
                        } else if (markdown.data.response) {
                            markdown = markdown.data.response;
                        } else {
                            // Stringify entire data object if no text fields found
                            markdown = JSON.stringify(markdown.data, null, 2);
                        }
                    } else {
                        // Check if object has toString method that returns something useful
                        if (typeof markdown.toString === 'function' && markdown.toString() !== '[object Object]') {
                            markdown = markdown.toString();
                        } else {
                            // Last resort - stringify the entire object
                            markdown = JSON.stringify(markdown, null, 2);
                        }
                    }
                } else {
                    // For other non-string types
                    markdown = String(markdown);
                }
            } catch (e) {
                console.error('Failed to convert markdown to string:', e);
                return { markdown: 'Error rendering content', chartData: [] };
            }
        }
        
        // Handle the case where markdown might be a stringified JSON object
        if (markdown.startsWith('{') && markdown.endsWith('}')) {
            try {
                const parsedObj = JSON.parse(markdown);
                // Check for OpenAI-like format in stringified JSON
                if (parsedObj.choices && Array.isArray(parsedObj.choices) && parsedObj.choices.length > 0) {
                    if (parsedObj.choices[0].message && parsedObj.choices[0].message.content) {
                        markdown = parsedObj.choices[0].message.content;
                    } else if (parsedObj.choices[0].text) {
                        markdown = parsedObj.choices[0].text;
                    }
                }
                // Check for other response formats
                else if (parsedObj.completion) {
                    markdown = parsedObj.completion;
                } else if (parsedObj.answer) {
                    markdown = parsedObj.answer;
                } 
                // Extract text from known object formats
                else if (parsedObj.text) {
                    markdown = parsedObj.text;
                } else if (parsedObj.message) {
                    markdown = parsedObj.message;
                } else if (parsedObj.content) {
                    markdown = parsedObj.content;
                } else if (parsedObj.response) {
                    markdown = parsedObj.response;
                } else if (parsedObj.data && typeof parsedObj.data === 'object') {
                    // Try nested data object
                    if (parsedObj.data.text) {
                        markdown = parsedObj.data.text;
                    } else if (parsedObj.data.message) {
                        markdown = parsedObj.data.message;
                    } else if (parsedObj.data.content) {
                        markdown = parsedObj.data.content;
                    } else if (parsedObj.data.response) {
                        markdown = parsedObj.data.response;
                    } else {
                        // If no text fields found in data, keep original stringified
                        // Likely it's intended to be displayed as JSON
                    }
                }
                // If no recognized property was found, keep the original JSON string
                // This ensures JSON intended for display stays as is
            } catch (e) {
                // If it couldn't be parsed as JSON, keep it as is
                console.log('String looks like JSON but cannot be parsed:', e);
            }
        }
        
        // Handle the case where the input is the literal string "[object Object]"
        if (markdown === '[object Object]') {
            markdown = "Error: Response was incorrectly serialized to [object Object]";
        }

        // Handle markdown code blocks
        if (markdown.startsWith('```markdown')) {
            // Remove the ```markdown and ``` wrapper
            markdown = markdown.replace(/^```markdown\n?/, '').replace(/```$/, '');
        }
        
        let processed = markdown;
        const chartData = [];
        
        // Process LaTeX expressions before other Markdown processing
        try {
            // Process block math expressions
            // Look for $$...$$, but avoid replacing if it's already inside a code block
            const blockMathPattern = /(?<!`)((?<!`)\$\$([\s\S]*?)\$\$(?!`))/g;
            
            // Replace with MathJax-friendly syntax for block math
            processed = processed.replace(blockMathPattern, function(match, fullMatch, equation) {
                // Keep existing $$ syntax as MathJax will handle it natively
                return fullMatch;
            });
            
            // Process inline math expressions
            // Look for $...$ but avoid $$ (block math) and ensure it's not inside a code block
            const inlineMathPattern = /(?<!`|\$)((?<!`)\$([^\$\n]+?)\$(?![\$`]))/g;
            
            // Replace with MathJax-friendly syntax for inline math
            processed = processed.replace(inlineMathPattern, function(match, fullMatch, equation) {
                // Keep existing $ syntax as MathJax will handle it natively
                return fullMatch;
            });
        } catch (e) {
            console.error('Error processing LaTeX expressions:', e);
        }
        
        try {
            // Find and process all chart blocks - updated regex to handle both inline and multi-line formats
            const chartBlockRegex = /```chart\s*([\s\S]*?)```/g;
            let match;
            let placeholderIndex = 0;
            
            while ((match = chartBlockRegex.exec(processed)) !== null) {
                console.log("Chart detected:", match[1].trim());
                
                try {
                    const chartJson = JSON.parse(match[1].trim());
                    console.log("Parsed chart JSON:", chartJson);
                    
                    // Transform the data into Chart.js format based on chart type
                    let chartConfig;
                    const chartType = chartJson.type;
                    
                    if (!chartType) {
                        throw new Error('Chart type is required');
                    }
                    
                    switch (chartType.toLowerCase()) {
                        case 'bar':
                        case 'line':
                        case 'pie':
                        case 'doughnut':
                        case 'polararea':
                        case 'radar':
                            // For basic charts
                            if (!chartJson.labels || !chartJson.values) {
                                throw new Error(`${chartType} chart requires labels and values`);
                            }
                            
                            chartConfig = {
                                type: chartType.toLowerCase(),
                                data: {
                                    labels: chartJson.labels,
                                    datasets: [{
                                        label: chartJson.title || 'Data',
                                        data: chartJson.values,
                                        backgroundColor: chartJson.colors || [
                                            'rgba(255, 99, 132, 0.5)',
                                            'rgba(54, 162, 235, 0.5)',
                                            'rgba(255, 206, 86, 0.5)',
                                            'rgba(75, 192, 192, 0.5)',
                                            'rgba(153, 102, 255, 0.5)',
                                            'rgba(255, 159, 64, 0.5)'
                                        ],
                                        borderColor: chartJson.borderColors || [
                                            'rgba(255, 99, 132, 1)',
                                            'rgba(54, 162, 235, 1)',
                                            'rgba(255, 206, 86, 1)',
                                            'rgba(75, 192, 192, 1)',
                                            'rgba(153, 102, 255, 1)',
                                            'rgba(255, 159, 64, 1)'
                                        ],
                                        borderWidth: 1
                                    }]
                                },
                                options: {
                                    responsive: true,
                                    maintainAspectRatio: true,
                                    aspectRatio: 2,
                                    plugins: {
                                        legend: {
                                            position: 'right'
                                        }
                                    }
                                }
                            };
                            break;
                        
                        // Special case for multiple datasets
                        case 'multibar':
                        case 'multiline':
                            if (!chartJson.labels || !chartJson.datasets) {
                                throw new Error(`${chartType} chart requires labels and datasets`);
                            }
                            
                            // Set the appropriate chart type
                            const actualChartType = chartType.toLowerCase() === 'multibar' ? 'bar' : 'line';
                            
                            chartConfig = {
                                type: actualChartType,
                                data: {
                                    labels: chartJson.labels,
                                    datasets: chartJson.datasets
                                },
                                options: {
                                    responsive: true,
                                    maintainAspectRatio: true,
                                    aspectRatio: 2
                                }
                            };
                            break;
                        
                        case 'bubble':
                        case 'scatter':
                            // For bubble and scatter charts
                            if (!chartJson.datasets) {
                                throw new Error(`${chartType} chart requires datasets with x,y coordinates`);
                            }
                            
                            chartConfig = {
                                type: chartType.toLowerCase(),
                                data: {
                                    datasets: chartJson.datasets
                                },
                                options: {
                                    responsive: true,
                                    maintainAspectRatio: true,
                                    aspectRatio: 2
                                }
                            };
                            break;
                            
                        default:
                            throw new Error(`Unsupported chart type: ${chartType}`);
                    }
                    
                    // Apply any custom options
                    if (chartJson.options) {
                        chartConfig.options = {
                            ...chartConfig.options,
                            ...chartJson.options
                        };
                    }
                    
                    console.log("Transformed chart config:", chartConfig);
                    
                    // Validate chart configuration
                    if (!chartConfig.type || !chartConfig.data) {
                        console.error('Invalid chart configuration:', chartConfig);
                        throw new Error('Chart configuration missing required properties');
                    }
                    
                    chartData.push(chartConfig);
                    
                    // Replace the chart block with a placeholder div
                    const placeholder = `<div class="chart-placeholder" data-chart-index="${placeholderIndex}"></div>`;
                    processed = processed.replace(match[0], placeholder);
                    console.log("Chart successfully replaced at index:", placeholderIndex);
                    placeholderIndex++;
                } catch (e) {
                    console.error('Invalid chart data:', match[1].trim(), e);
                    // Push null to maintain index alignment
                    chartData.push(null);
                    
                    // Replace with error placeholder
                    const errorPlaceholder = `<div class="chart-placeholder error" data-chart-index="${placeholderIndex}">
                        <div class="chart-error">Invalid chart data: ${e.message}</div>
                    </div>`;
                    processed = processed.replace(match[0], errorPlaceholder);
                    placeholderIndex++;
                }
            }
        } catch (e) {
            console.error('Error processing markdown:', e);
        }
        
        // 1. In preprocessMarkdown, after chart block handling, add image block handling:
        try {
            // Find and process all image blocks
            const imageBlockRegex = /```image\s*([\s\S]*?)```/g;
            let match;
            let imageIndex = 0;
            while ((match = imageBlockRegex.exec(processed)) !== null) {
                const imageUrl = match[1].trim();
                // Replace with a placeholder div for later rendering
                const placeholder = `<div class=\"ai-image-card\" data-image-url=\"${imageUrl}\" data-image-index=\"${imageIndex}\"></div>`;
                processed = processed.replace(match[0], placeholder);
                imageIndex++;
            }
        } catch (e) {
            console.error('Error processing image blocks:', e);
        }
        
        return {
            markdown: processed,
            chartData: chartData
        };
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
            console.log('Processed markdown:', processedMarkdown);
            
            // Convert markdown to HTML with failsafe
            let formattedContent = '';
            try {
                if (typeof marked !== 'undefined' && marked) {
                    formattedContent = marked.parse(processedMarkdown.markdown);
                } else {
                    console.warn('Marked library not fully loaded, displaying raw text');
                    formattedContent = `<pre>${processedMarkdown.markdown}</pre>`;
                }
            } catch (error) {
                console.error('Error parsing markdown:', error);
                formattedContent = `<pre>${processedMarkdown.markdown}</pre>`;
            }
            
            // Update the content
            const contentContainer = messageElement.querySelector('.chat-content');
            contentContainer.innerHTML = formattedContent;
            
            // Ensure message has proper classes
            messageElement.classList.add('bot-message');
            
            // Ensure content container has the formatted-content class
            contentContainer.classList.add('formatted-content');
            
            // Always store the original markdown for saving/exporting
            messageElement.dataset.originalMarkdown = newText;
            
            // Store chart data in the message element's dataset if available
            if (processedMarkdown.chartData && processedMarkdown.chartData.length > 0) {
                // Convert chart data to a string and store it
                const chartDataString = JSON.stringify(processedMarkdown.chartData);
                messageElement.dataset.chartData = chartDataString;
                console.log('Stored chart data:', processedMarkdown.chartData);
            }
            
            // Enhance code blocks and render charts
            enhanceCodeBlocks(messageElement);
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
                        formattedContent = marked.parse(processedMarkdown.markdown);
                    } else {
                        console.warn('Marked library not fully loaded, displaying raw text');
                        formattedContent = `<pre>${processedMarkdown.markdown}</pre>`;
                    }
                } catch (error) {
                    console.error('Error parsing markdown:', error);
                    formattedContent = `<pre>${processedMarkdown.markdown}</pre>`;
                }
                
                messageDiv.innerHTML = `
                    <div class="bot-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="chat-content">
                        <div class="formatted-content">${formattedContent}</div>
                    </div>
                `;
                
                // Always store the original markdown for saving/exporting
                messageDiv.dataset.originalMarkdown = content;
                
                // Store chart data in the message element's dataset if available
                if (processedMarkdown.chartData && processedMarkdown.chartData.length > 0) {
                    messageDiv.dataset.chartData = JSON.stringify(processedMarkdown.chartData);
                }
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
            const response = await fetch(`${window.apiBasePath}/api/navigation/questions.php?grade=${grade}&subject=${subject}&chapter=${chapter}&search=${searchTerm}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
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
            const response = await fetch(`${window.apiBasePath}/api/navigation/questions.php?grade=${grade}&search=${searchTerm}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
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

    // Handle user typing a slash to see commands
    userInput.addEventListener('input', async (e) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        const lastSlashIndex = value.lastIndexOf('/', cursorPosition);
        
        // If there's no slash, hide command panel
        if (lastSlashIndex === -1 || lastSlashIndex !== 0) {
            commandPanel.classList.remove('active');
            return;
        }
        
        // Hide topic selection container when typing slash commands
        topicSelectionContainer.classList.remove('active');
        
        // Get current selections
        const selectedSubject = document.getElementById('selectedSubject').textContent;
        const selectedChapter = document.getElementById('selectedChapter').textContent;
        
        // Get the search text after slash
        const searchText = value.slice(lastSlashIndex, cursorPosition).slice(1).toLowerCase();
        
        // Always show topics from all chapters/subjects (no popup)
        let questionsToDisplay = [];
        
        // Default to showing all questions
        if (allGradeQuestions.length === 0) {
            showLoadingIndicator();
            allGradeQuestions = await loadAllQuestions(userGrade);
            hideLoadingIndicator();
        }
        questionsToDisplay = allGradeQuestions;
        commandPanel.classList.remove('chapter-specific'); // Use default height for global questions
        commandPanel.dataset.currentScope = 'all'; // Set scope to 'all'
        
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
                        
                        // For global scope, show all matching questions
                        return (questionText.includes(searchText) || 
                                subjectText.includes(searchText) || 
                                chapterText.includes(searchText)) && 
                                !window.selectedQuestions.has(item.question);
                    })
                    : questionsToDisplay.filter(item => !window.selectedQuestions.has(item.question));
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
        
        // Hide the command panel immediately
        commandPanel.classList.remove('active');
        
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
            
            // Build API URL
            const apiUrl = `${window.apiBasePath}/api/chat/check_existing.php`;
            console.log("Checking for existing chat at URL:", apiUrl);
            
            // Build request payload
            const requestData = {
                user_id: userId,
                question: cleanCommand
            };
            console.log("Check existing chat request data:", JSON.stringify(requestData));
            
            // Make API call to check for existing chat session
            const response = await fetch(`${window.apiBasePath}/api/chat/check_existing.php`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    user_id: userId,
                    question: cleanCommand
                })
            });
            
            console.log("Check existing response status:", response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error response from check_existing.php:", errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Check existing response data:", data);
            
            if (data.success && data.exists && data.session_id) {
                console.log('Existing chat found, redirecting to session:', data.session_id);
                // Hide the topic selection container
                topicSelectionContainer.classList.remove('active');
                document.querySelector('.mobile-header').classList.remove('with-topics');
                
                // Reset chat messages position
                adjustChatMessagesPosition();
                
                // Load the existing chat session
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
        const removeButton = e.target.closest('.remove-question');
        if (removeButton) {
            e.stopPropagation(); // Stop the event from bubbling up
            const questionTag = removeButton.closest('.question-tag');
            const questionText = questionTag.querySelector('span').title; // Using title which holds the full question
            removeQuestion(questionText);
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
            background-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-gray));
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
            color: color-mix(in srgb, var(--color-accent) 90%, var(--color-white));
            display: flex;
            align-items: center;
            line-height: 1.2;
        }
        
        .command-context i {
            margin-right: 5px;
            font-size: 11px;
        }
        
        .command-item:hover {
            background-color: color-mix(in srgb, var(--color-primary) 25%, var(--color-gray));
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
            background-color: color-mix(in srgb, var(--color-primary) 50%, var(--color-gray));
            border-top: 1px solid color-mix(in srgb, var(--color-primary) 50%, var(--color-gray));
        }
        
        /* Make question tag in selected container more appealing */
        .question-tag {
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

    // Event listeners for handling dropdown items click
    document.addEventListener('click', async (e) => {
        const dropdownItem = e.target.closest('.dropdown-item');
        if (!dropdownItem) return;

        const type = dropdownItem.dataset.type;
        const value = dropdownItem.dataset.value;

        if (type === 'subject') {
            // Subject clicks are now handled by the subject-list click handler
            // This avoids duplicate handling that could cause conflicts
            return;
        } else if (type === 'chapter') {
            // Clear any selected questions before changing chapter
            if (await confirmChangeIfNeeded()) {
                // Update the chapter display
                document.getElementById('selectedChapter').textContent = value;
                
                // Get the subject from the dataset
                const subjectFromChapter = dropdownItem.dataset.subject;
                
                // If chapter has a subject in its dataset, update the subject display
                if (subjectFromChapter) {
                    document.getElementById('selectedSubject').textContent = subjectFromChapter;
                    currentSubject = subjectFromChapter;
                } else {
                    // Fallback to existing subject
                    currentSubject = dropdownItem.dataset.subject || currentSubject;
                }
                
                currentChapter = value;
                
                // Close the dropdown
                dropdownPanel.classList.remove('active');
                
                // Clear previous selection and clear cached questions
                window.selectedQuestions.clear();
                updateSelectedQuestionsUI();
                cachedQuestions = [];
                
                // Load topics for this chapter
                await loadAndDisplayTopics(userGrade, currentSubject, currentChapter);
            }
        }
    });

    // Add these functions to handle the topic selection
    async function loadAndDisplayTopics(grade, subject, chapter) {
        // Show loading indicator
        showLoadingInTopicContainer();
        
        // Load questions for the selected chapter
        if (cachedQuestions.length === 0) {
            cachedQuestions = await loadQuestions(grade, subject, chapter);
        }
        
        // Load the topic list data with headers from each markdown file
        let topicListData = { found: false, topics: [] };
        if (window.topicList && typeof window.topicList.loadTopicList === 'function') {
            topicListData = await window.topicList.loadTopicList(grade, subject, chapter);
        }
        
        hideLoadingInTopicContainer();
        
        // Use the new renderTopicList function if available
        let hasTopics = false;
        if (window.topicList && typeof window.topicList.renderTopicList === 'function') {
            hasTopics = window.topicList.renderTopicList(topicButtonsContainer, cachedQuestions, topicListData);
        } else {
            // Fallback to simple buttons if the new function isn't available
            // Sort questions alphabetically
            cachedQuestions.sort((a, b) => {
                // Remove leading slash if present for sorting
                const textA = a.startsWith('/') ? a.substring(1).trim() : a;
                const textB = b.startsWith('/') ? b.substring(1).trim() : b;
                return textA.localeCompare(textB);
            });
            
            // Create topic buttons
            if (cachedQuestions.length > 0) {
                hasTopics = true;
                cachedQuestions.forEach(question => {
                    // Clean up question text - remove leading slash if present
                    let displayText = question;
                    
                    if (displayText.startsWith('/')) {
                        displayText = displayText.substring(1).trim();
                    }
                    
                    const topicButton = document.createElement('button');
                    topicButton.className = 'topic-button';
                    topicButton.textContent = displayText;
                    topicButton.dataset.question = question;
                    topicButton.setAttribute('type', 'button'); // Ensure it's a button type
                    
                    topicButtonsContainer.appendChild(topicButton);
                });
            } else {
                // Show a message if no topics are found
                const noTopics = document.createElement('div');
                noTopics.style.padding = '15px';
                noTopics.style.color = '#aaa';
                noTopics.style.textAlign = 'center';
                noTopics.textContent = 'No topics available for this chapter';
                topicButtonsContainer.appendChild(noTopics);
            }
        }
        
        // Show the topic selection container
        topicSelectionContainer.classList.add('active');
        document.querySelector('.mobile-header').classList.add('with-topics');
        
        // Adjust chat messages position
        adjustChatMessagesPosition();
        
        return hasTopics;
    }
    
    function showLoadingInTopicContainer() {
        topicButtonsContainer.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; padding: 20px; color: #aaa;">
                <i class="fas fa-spinner fa-spin" style="margin-right: 10px;"></i> Loading topics...
            </div>
        `;
        topicSelectionContainer.classList.add('active');
        document.querySelector('.mobile-header').classList.add('with-topics');
        
        // Adjust chat messages position
        adjustChatMessagesPosition();
    }
    
    function hideLoadingInTopicContainer() {
        topicButtonsContainer.innerHTML = '';
    }
    
    // Function to adjust chat messages position when topic container is shown/hidden
    function adjustChatMessagesPosition() {
        const mobileHeader = document.querySelector('.mobile-header');
        const topicContainer = document.querySelector('.topic-selection-container');
        const chatMessages = document.querySelector('.chat-messages');
        
        if (topicContainer.classList.contains('active')) {
            // Calculate the combined height of mobile header and topic container
            const mobileHeaderHeight = mobileHeader.offsetHeight;
            const topicContainerHeight = Math.min(topicContainer.scrollHeight, window.innerHeight * 0.75);
            const totalHeight = mobileHeaderHeight + topicContainerHeight;
            
            // Update chat messages top position
            chatMessages.style.top = `${totalHeight}px`;
            
            // Ensure topic container doesn't exceed reasonable screen height
            topicContainer.style.maxHeight = `${window.innerHeight * 0.75}px`;
        } else {
            // Reset to default
            chatMessages.style.top = '130px';
        }
    }

    // Add event listener for topic button clicks
    document.addEventListener('click', async function(e) {
        // Fix for the closest error - check if the target or any parent is a topic button
        let topicButton = null;
        
        // First check if the clicked element itself is a topic button
        if (e.target.classList && e.target.classList.contains('topic-button')) {
            topicButton = e.target;
        } 
        // Try closest() if the browser supports it
        else if (e.target.closest && typeof e.target.closest === 'function') {
            topicButton = e.target.closest('.topic-button');
        }
        // Fallback for browsers that don't support closest()
        else {
            // Check parent nodes manually
            let element = e.target;
            while (element) {
                if (element.classList && element.classList.contains('topic-button')) {
                    topicButton = element;
                    break;
                }
                element = element.parentElement;
            }
        }
        
        // If no topic button was found, return
        if (!topicButton) return;
        
        e.preventDefault(); // Prevent any default behavior
        e.stopPropagation(); // Stop event from bubbling
        
        const question = topicButton.dataset.question;
        console.log('Topic selected:', question); // Debug log
        
        // Check if there's an existing chat session for this question
        try {
            const userId = localStorage.getItem('user_id');
            if (!userId) {
                throw new Error('User ID not found');
            }
            
            // Build API URL
            const apiUrl = `${window.apiBasePath}/api/chat/check_existing.php`;
            console.log("Checking for existing chat at URL:", apiUrl);
            
            // Build request payload
            const requestData = {
                user_id: userId,
                question: question
            };
            console.log("Check existing chat request data:", JSON.stringify(requestData));
            
            // Make API call to check for existing chat session
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(requestData)
            });
            
            console.log("Check existing response status:", response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error response from check_existing.php:", errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log("Check existing response data:", data);
            
            if (data.success && data.exists && data.session_id) {
                console.log('Existing chat found, redirecting to session:', data.session_id);
                // Hide the topic selection container
                topicSelectionContainer.classList.remove('active');
                document.querySelector('.mobile-header').classList.remove('with-topics');
                
                // Reset chat messages position
                adjustChatMessagesPosition();
                
                // Load the existing chat session
                await chatHistory.loadChatSession(data.session_id);
                return; // Exit early since we've redirected to existing chat
            }
        } catch (error) {
            console.error('Error checking for existing chat:', error);
            // Continue with normal flow if there's an error
        }
        
        // Normal flow - no existing chat or error checking
        // Clear previous selections
        window.selectedQuestions.clear();
        
        // Clear chat history session ID to ensure we start a new chat
        if (chatHistory) {
            chatHistory.currentSessionId = null;
        }
        
        // Clear existing chat messages
        const chatMessages = document.querySelector('.chat-messages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
        
        // Add the selected question
        window.selectedQuestions.add(question);
        
        // Update the UI
        updateSelectedQuestionsUI();
        
        // Focus on the input field for typing
        setTimeout(() => {
            document.getElementById('userInput').focus();
        }, 10);
    });

    // Add event listener for preview area to prevent clicking in the preview from triggering the button
    document.addEventListener('click', (e) => {
        if (e.target.closest('.topic-preview')) {
            e.stopPropagation(); // Stop event from bubbling to the button
        }
    });

    // Modify the removeQuestion function to show topic selection again when a question is removed
    function removeQuestion(question) {
        // Remove from the selected questions set
        window.selectedQuestions.delete(question);
        updateSelectedQuestionsUI();
        
        // If there are no more selected questions and we have a current chapter or selectedChapter in UI,
        // show the topic selection container again
        if (window.selectedQuestions.size === 0) {
            // When loading from history, we need to ensure the currentSubject and currentChapter
            // values are correct by reading them from the UI
            const selectedSubjectText = document.getElementById('selectedSubject').textContent;
            const selectedChapterText = document.getElementById('selectedChapter').textContent;
            
            // Only proceed if we have valid subject and chapter
            if (selectedSubjectText !== 'Select Subject' && selectedChapterText !== 'Select Chapter') {
                // Update the current state variables
                currentSubject = selectedSubjectText;
                currentChapter = selectedChapterText;
                
                // Load topics for this chapter
                loadAndDisplayTopics(userGrade, currentSubject, currentChapter);
                
                // The existing document-level event listener for topic buttons will handle
                // checking for existing chat sessions when a new topic is clicked
            }
        }
    }

    //------------------------ Filters subjects and chapters dynamically as the user types in the search box.--------------------------------------------
    document.querySelector('.search-input').addEventListener('input', function(e) {
        const term = e.target.value.toLowerCase().trim();
        
        // Show all chapters for searching without clearing selections
        if (term) {
            // Show all chapters when searching
            renderChapters(allChapters);
        } else {
            // When search is cleared, filter chapters based on current subject selection
            const selectedSubject = document.getElementById('selectedSubject').textContent;
            if (selectedSubject !== 'Select Subject') {
                // Only show chapters for the selected subject
                const filteredChapters = allChapters.filter(chapter => chapter.subject === selectedSubject);
                renderChapters(filteredChapters);
            } else {
                // If no subject selected, show all chapters
                renderChapters(allChapters);
            }
        }
        
        // Filter visible dropdown items based on search term (both subjects and chapters)
        document.querySelectorAll('.dropdown-item').forEach(item => {
            const itemText = item.textContent.toLowerCase();
            const chapterSubject = item.dataset.subject?.toLowerCase() || '';
            
            // Match on item text or chapter's subject
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
            const response = await fetch(`${window.apiBasePath}/api/navigation/subjects.php?grade=${grade}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            const subjects = data.subjects || [];
            
            // Clear the array before loading new data
            allChapters = [];
            
            // Load chapters for each subject sequentially
            for (const subject of subjects) {
                const chapters = await loadChapters(grade, subject);
                
                // Add properly formatted chapters to allChapters
                if (Array.isArray(chapters)) {
                    chapters.forEach(chapter => {
                        if (typeof chapter === 'object' && chapter.name && chapter.subject) {
                            allChapters.push(chapter);
                        } else {
                            // Handle the case where chapter might be a string
                            allChapters.push({
                                name: typeof chapter === 'string' ? chapter : chapter.toString(),
                                subject: subject
                            });
                        }
                    });
                }
            }
            
            console.log(`Loaded ${allChapters.length} chapters for all subjects`);
            return allChapters;
        } catch (error) {
            console.error('Error loading all chapters:', error);
            return [];
        }
    }
    //-------------------------------------------------------------------------------------------------------------------------------------------


    // Each selected question are added into container as a tag with cross to remove them 
    function updateSelectedQuestionsUI() {
        const container = document.getElementById('selectedQuestionsContainer');
        container.innerHTML = '';
        
        // If we have selected questions, hide both panels
        if (window.selectedQuestions.size > 0) {
            // Hide the topic selection container
            topicSelectionContainer.classList.remove('active');
            document.querySelector('.mobile-header').classList.remove('with-topics');
            
            // Hide the command panel 
            commandPanel.classList.remove('active');
            
            // Reset chat messages position
            adjustChatMessagesPosition();
        }
        
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

    // Function to enhance code blocks and render charts
    function enhanceCodeBlocks(messageElement) {
        console.log('Enhancing code blocks for message:', messageElement);
        
        // Process code blocks if needed
        const codeBlocks = messageElement.querySelectorAll('pre code');
        codeBlocks.forEach(codeBlock => {
            // Process code blocks if needed
        });

        // Get content container
        const contentContainer = messageElement.querySelector('.chat-content');
        if (!contentContainer) return;
        
        // Add formatted-content wrapper if it doesn't exist
        let formattedContent = contentContainer.querySelector('.formatted-content');
        if (!formattedContent) {
            // Create a formatted-content wrapper to match saved-answers.js styling
            formattedContent = document.createElement('div');
            formattedContent.classList.add('formatted-content');
            
            // Move all content into the formatted-content wrapper
            while (contentContainer.firstChild) {
                formattedContent.appendChild(contentContainer.firstChild);
            }
            
            contentContainer.appendChild(formattedContent);
        }

        // Wrap tables in scrollable wrapper
        const tables = formattedContent.querySelectorAll('table');
        tables.forEach(table => {
            // Skip if already wrapped
            if (table.closest('.scrollable-wrapper')) {
                return;
            }
            
            // Create scrollable wrapper
            const wrapper = document.createElement('div');
            wrapper.classList.add('scrollable-wrapper');
            
            // Replace table with wrapper containing table
            table.parentNode.insertBefore(wrapper, table);
            wrapper.appendChild(table);
        });
        
        // Process chart placeholders
        const chartPlaceholders = messageElement.querySelectorAll('.chart-placeholder');
        console.log('Found chart placeholders:', chartPlaceholders.length);
        
        // Get chart data from the message element
        let chartData;
        try {
            // First try to get chart data from dataset
            const chartDataString = messageElement.dataset.chartData;
            console.log('Chart data string from dataset:', chartDataString);
            
            if (chartDataString) {
                chartData = JSON.parse(chartDataString);
                console.log('Parsed chart data:', chartData);
            } else {
                // If no chart data in dataset, try to get original markdown and process it
                const originalMarkdown = messageElement.dataset.originalMarkdown;
                console.log('Original markdown from dataset:', originalMarkdown);
                
                if (originalMarkdown) {
                    const processedMarkdown = preprocessMarkdown(originalMarkdown);
                    chartData = processedMarkdown.chartData;
                    console.log('Processed chart data from markdown:', chartData);
                    // Store the processed chart data for future use
                    messageElement.dataset.chartData = JSON.stringify(chartData);
                } else {
                    chartData = [];
                    console.log('No chart data available');
                }
            }
        } catch (error) {
            console.error('Error parsing chart data:', error);
            chartData = [];
        }
        
        console.log('Final chart data:', chartData);
        
        chartPlaceholders.forEach(placeholder => {
            // Clear any existing content to prevent duplicates
            placeholder.innerHTML = '';
            
            const chartIndex = parseInt(placeholder.getAttribute('data-chart-index'));
            console.log('Processing chart at index:', chartIndex);
            
            if (!chartData || !chartData[chartIndex]) {
                console.log('No chart data available at index:', chartIndex);
                placeholder.innerHTML = '<div class="chart-error">No chart data available</div>';
                return;
            }
            
            const chartConfig = chartData[chartIndex];
            console.log('Chart config:', chartConfig);
            
            // Verify Chart.js is loaded
            if (typeof Chart === 'undefined') {
                console.error('Chart.js is not loaded');
                placeholder.innerHTML = '<div class="chart-error">Chart.js library not loaded</div>';
                return;
            }
            
            // Create container for the chart
            const chartContainer = document.createElement('div');
            chartContainer.style.position = 'relative';
            chartContainer.style.height = window.innerWidth < 768 ? '200px' : '300px'; // Smaller height on mobile
            chartContainer.style.width = '100%';
            chartContainer.style.maxWidth = window.innerWidth < 768 ? '100%' : '600px'; // Full width on mobile
            chartContainer.style.margin = '0 auto'; // Center the chart
            placeholder.appendChild(chartContainer);
            
            // Create canvas element
            const canvas = document.createElement('canvas');
            chartContainer.appendChild(canvas);
            
            // Initialize chart with error handling
            try {
                // Ensure chartConfig has required properties
                if (!chartConfig || typeof chartConfig !== 'object') {
                    throw new Error('Invalid chart configuration: not an object');
                }
                
                if (!chartConfig.type) {
                    throw new Error('Invalid chart configuration: missing type property');
                }
                
                if (!chartConfig.data) {
                    throw new Error('Invalid chart configuration: missing data property');
                }
                
                // Set default options if not provided
                chartConfig.options = {
                    ...chartConfig.options,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        ...chartConfig.options?.plugins,
                        legend: {
                            position: 'right',
                            labels: {
                                boxWidth: 20,
                                padding: 15
                            }
                        }
                    }
                };
                
                // Create the chart
                const chart = new Chart(canvas, chartConfig);
                console.log('Chart successfully rendered at index:', chartIndex);
                
                // Store the chart instance in the placeholder for later access
                placeholder.dataset.chartInstance = chart;
                
                // Add resize handler if ResizeObserver is available
                if (typeof ResizeObserver !== 'undefined') {
                    const resizeObserver = new ResizeObserver(() => {
                        chart.resize();
                    });
                    resizeObserver.observe(chartContainer);
                }
            } catch (error) {
                console.error('Failed to render chart at index:', chartIndex, error);
                placeholder.innerHTML = `
                    <div class="chart-error">
                        Failed to render chart: ${error.message}
                        <div class="chart-error-details">${JSON.stringify(chartConfig, null, 2) || 'No configuration available'}</div>
                    </div>
                `;
            }
        });
        
        // Render LaTeX expressions with MathJax for this specific message
        if (typeof MathJax !== 'undefined') {
            try {
                // Use the formatted-content container for MathJax rendering
                if (formattedContent) {
                    // Use typesetPromise for better performance and to handle async properly
                    MathJax.typesetPromise([formattedContent]).catch((err) => {
                        console.error('MathJax typesetting error in message:', err);
                    });
                    
                    // After MathJax has rendered, wrap equation blocks in scrollable container
                    MathJax.typesetPromise([formattedContent])
                        .then(() => {
                            // Find displayed math equations that are rendered by MathJax
                            const displayMath = formattedContent.querySelectorAll('.MathJax');
                            displayMath.forEach(mathElement => {
                                // Skip if already wrapped
                                if (mathElement.closest('.scrollable-wrapper')) {
                                    return;
                                }
                                
                                // Check if it's a display equation (block equation)
                                const rect = mathElement.getBoundingClientRect();
                                const isDisplayEquation = rect.width > 200 || mathElement.getAttribute('display') === 'block';
                                
                                if (isDisplayEquation || rect.width > formattedContent.clientWidth * 0.7) {
                                    // Create scrollable wrapper with proper styling
                                    const wrapper = document.createElement('div');
                                    wrapper.classList.add('scrollable-wrapper');
                                    
                                    // Set styles directly as properties (more reliable than shorthand)
                                    wrapper.style.overflowY = 'visible'; 
                                    wrapper.style.overflowX = 'auto';
                                    wrapper.style.display = 'block';      // Ensure block display for proper sizing
                                    wrapper.style.width = '100%';         // Set width to 100%
                                    wrapper.style.maxWidth = '100%';      // Prevent overflow from width
                                    
                                    // Replace equation with wrapper containing equation
                                    mathElement.parentNode.insertBefore(wrapper, mathElement);
                                    wrapper.appendChild(mathElement);
                                    
                                    // Apply additional styles to mathElement itself to prevent scrollbar
                                    mathElement.style.overflow = 'visible'; // Force visible overflow on MathJax
                                }
                            });
                        })
                        .catch((err) => {
                            console.error('Error wrapping MathJax elements:', err);
                        });
                }
            } catch (error) {
                console.error('Error rendering LaTeX with MathJax for message:', error);
            }
        }

        // 2. In enhanceCodeBlocks, after chart rendering, add image card rendering:
        // Process AI image cards
        const imageCards = messageElement.querySelectorAll('.ai-image-card');
        imageCards.forEach(card => {
            // Only append the image if not already present
            if (card.querySelector('img.ai-image')) return;
            const imageUrl = card.getAttribute('data-image-url');
            if (!imageUrl) return;
            // Create image element
            const img = document.createElement('img');
            img.src = imageUrl.replace(/\\\\/g, '/').replace(/\\/g, '/');
            img.alt = 'AI provided image';
            img.className = 'ai-image';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
            img.style.margin = '0 auto';
            img.style.borderRadius = '12px';
            img.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
            img.style.cursor = 'zoom-in';
            // Responsive: scale down on mobile
            img.style.maxHeight = '400px';
            card.appendChild(img);
            // Add click-to-zoom (lightbox)
            img.addEventListener('click', function() {
                let modal = document.createElement('div');
                modal.className = 'ai-image-zoom-modal';
                modal.innerHTML = `<div class=\"ai-image-zoom-backdrop\"></div><img src=\"${imageUrl}\" class=\"ai-image-zoomed\" style=\"max-width:90vw; max-height:90vh; display:block; margin:auto; border-radius:16px; box-shadow:0 4px 32px rgba(0,0,0,0.18);\" />`;
                document.body.appendChild(modal);
                // Initialize pinch-zoom if available
                const zoomedImg = modal.querySelector('.ai-image-zoomed');
                if (window.PinchZoom) {
                    new PinchZoom(zoomedImg, { draggableUnzoomed: false });
                } else if (typeof PinchZoom !== 'undefined') {
                    new PinchZoom(zoomedImg, { draggableUnzoomed: false });
                }
                // Close on click (but not on image pinch/drag)
                modal.addEventListener('click', function(e) {
                    if (e.target === modal || e.target.classList.contains('ai-image-zoom-backdrop')) {
                        modal.remove();
                    }
                });
            });
        });
    }

    // Add resize event listener to adjust positions on window resize
    window.addEventListener('resize', () => {
        if (topicSelectionContainer.classList.contains('active')) {
            // Update the position with a small delay to ensure measurements are accurate
            setTimeout(adjustChatMessagesPosition, 100);
        }
    });
    
    // Add this at the end of the DOMContentLoaded event listener to set the initial positions
    // Initial check for viewport size to adjust message container position
    adjustChatMessagesPosition();

    // Check if chat is empty and show instructions when page loads
    checkEmptyChatAndShowInstructions();

    // Add window resize handler for responsive charts
    window.addEventListener('resize', () => {
        const chartContainers = document.querySelectorAll('.chart-placeholder > div');
        chartContainers.forEach(container => {
            // Update container size based on screen width
            container.style.height = window.innerWidth < 768 ? '200px' : '300px';
            container.style.maxWidth = window.innerWidth < 768 ? '100%' : '600px';
            
            // Find the Chart instance and update it
            const placeholder = container.closest('.chart-placeholder');
            if (placeholder && placeholder.dataset.chartInstance) {
                try {
                    const chart = Chart.getChart(container.querySelector('canvas'));
                    if (chart) {
                        chart.resize();
                    }
                } catch (e) {
                    console.error('Error resizing chart:', e);
                }
            }
        });
    });

});

function checkEmptyChatAndShowInstructions() {
    const chatMessages = document.querySelector('.chat-messages');
    
    // If there are no messages in the chat area
    if (chatMessages && chatMessages.children.length === 0) {
        // Check if instruction box already exists
        if (!chatMessages.querySelector('.empty-chat-instructions')) {
            const instructionBox = document.createElement('div');
            instructionBox.className = 'empty-chat-instructions';
            instructionBox.innerHTML = `
                <div class="instruction-content">
                    <i class="fas fa-keyboard"></i>
                    <p>/" in from your keyboard to filter the topics from any chapter</p>
                </div>
            `;
            chatMessages.appendChild(instructionBox);
        }
    } else if (chatMessages) {
        // Remove instruction box if there are messages
        const instructionBox = chatMessages.querySelector('.empty-chat-instructions');
        if (instructionBox) {
            instructionBox.remove();
        }
    }
}
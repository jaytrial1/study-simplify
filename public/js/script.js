// Add these functions outside of DOMContentLoaded (at the very top of the file)
function clearInput() {
    const userInput = document.getElementById('userInput');
    userInput.value = '';
    document.getElementById('toastNotification').classList.remove('active');
    document.getElementById('commandPanel').classList.remove('active');
}

function showToastWithAction(message) {
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
    }, 5000);
}

function hideToast() {
    document.getElementById('toastNotification').classList.remove('active');
}

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

document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const commandPanel = document.getElementById('commandPanel');
    const commandItems = document.querySelectorAll('.command-item');
    const dropdownTrigger = document.getElementById('dropdownTrigger');
    const dropdownPanel = document.getElementById('dropdownPanel');
    let isDragging = false;
    let startY = 0;
    let chapters = []; // Declare a global variable to store chapters
    let allChapters = [];
    let cachedQuestions = [];
    let selectedQuestions = new Set();

    // Make userGrade accessible throughout the file
    const userGrade = localStorage.getItem('userGrade');
    console.log('Current user grade:', userGrade);

    // Add a function to check for grade changes
    function checkGradeChange() {
        const currentGrade = localStorage.getItem('userGrade');
        if (currentGrade && currentGrade !== userGrade) {
            userGrade = currentGrade;
            loadSubjects(userGrade);
            // Reset selections
            document.getElementById('selectedSubject').textContent = 'Select Subject';
            document.getElementById('selectedChapter').textContent = 'Select Chapter';
            document.querySelector('.chapter-list').innerHTML = '';
        }
    }

    // Check for grade changes every second
    setInterval(checkGradeChange, 1000);

    // Add introductory message
    const introMessage = document.createElement('div');
    introMessage.classList.add('intro-message');
    introMessage.innerHTML = `
        <div class="intro-icon">
            <i class="fas fa-book-reader"></i>
        </div>
        <div class="intro-text">
            Welcome to Study Assistant! Use <strong>'/'</strong> to type your question or select from the suggestion box.
        </div>
    `;
    chatMessages.appendChild(introMessage);

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

    function addMessage(message, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = isUser ? 'message user-message' : 'message bot-message';
        
        if (!isUser) {
            const iconDiv = document.createElement('div');
            iconDiv.className = 'bot-icon';
            iconDiv.innerHTML = `<svg width="25" height="25" viewBox="0 0 24 24" fill="none">
                <path d="M12 3C7.58172 3 4 6.58172 4 11C4 13.5264 5.15456 15.7793 6.97441 17.2454C7.11086 17.3602 7.19531 17.5251 7.19531 17.7012V20.4844C7.19531 20.769 7.42633 21 7.71094 21H9.25781C9.54242 21 9.77344 20.769 9.77344 20.4844V19.7812H14.2266V20.4844C14.2266 20.769 14.4576 21 14.7422 21H16.2891C16.5737 21 16.8047 20.769 16.8047 20.4844V17.7012C16.8047 17.5251 16.8891 17.3602 17.0256 17.2454C18.8454 15.7793 20 13.5264 20 11C20 6.58172 16.4183 3 12 3ZM9 14C8.44772 14 8 13.5523 8 13C8 12.4477 8.44772 12 9 12C9.55228 12 10 12.4477 10 13C10 13.5523 9.55228 14 9 14ZM15 14C14.4477 14 14 13.5523 14 13C14 12.4477 14.4477 12 15 12C15.5523 12 16 12.4477 16 13C16 13.5523 15.5523 14 15 14ZM8.85938 10.5C8.57477 10.5 8.34375 10.269 8.34375 9.98438V8.51562C8.34375 8.23102 8.57477 8 8.85938 8H15.1406C15.4252 8 15.6562 8.23102 15.6562 8.51562V9.98438C15.6562 10.269 15.4252 10.5 15.1406 10.5H8.85938Z" 
                fill="#4166d5"/>
            </svg>`;
            messageDiv.appendChild(iconDiv);
        }
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.textContent = message;
        
        messageDiv.appendChild(messageContent);
        chatMessages.appendChild(messageDiv);
        
        // Auto scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Add this function to load questions
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

    // Update this function (around line 108)
    function hasQuestionsFromDifferentChapter(inputValue, currentChapter) {
        // If input is empty or no chapter selected, return false
        if (!inputValue || currentChapter === 'Select Chapter') return false;
        
        // Get the currently selected subject and chapter
        const selectedSubject = document.getElementById('selectedSubject').textContent;
        const selectedChapter = document.getElementById('selectedChapter').textContent;
        
        // If we're still in the same chapter, return false
        if (selectedChapter === currentChapter) return false;
        
        // Check if input contains any question (indicated by presence of text)
        return inputValue.trim().length > 0;
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
        
        // Check if there are questions from a different chapter
        if (hasQuestionsFromDifferentChapter(value.slice(0, lastSlashIndex), selectedChapter)) {
            commandPanel.innerHTML = `
                <div class="command-list">
                    <div class="command-item" style="
                        background: #f8d7da;
                        color: #721c24;
                        border: 1px solid #f5c6cb;
                        padding: 12px;
                        border-radius: 4px;
                        text-align: center;
                    ">
                        Please send your current message or clear the input to select questions from a different chapter
                    </div>
                </div>`;
            commandPanel.classList.add('active');
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
            updateSelectedQuestionsUI();
        }
    });

    // Function to handle user message
    function handleUserMessage() {
        const message = userInput.value.trim();
        if (message) {
            if (message.startsWith('/')) {
                handleCommand(message);
            } else {
                addMessage(message, true);
            }
            userInput.value = '';
            autoResizeTextarea(); // Reset the textarea height
            commandPanel.classList.remove('active');

            // Remove introductory message after first interaction
            if (introMessage) {
                introMessage.remove();
            }
        }
    }

    sendButton.addEventListener('click', handleUserMessage);
    userInput.addEventListener('keydown', (e) => {
        const isMobile = 'ontouchstart' in window;
        
        // Mobile: Allow Enter for new lines, only button submits
        if (isMobile && e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
            return; // Let browser handle normally (new line)
        }

        // Desktop: Ctrl/Cmd + Enter to submit
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleUserMessage();
        }
    });

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

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!dropdownTrigger.contains(e.target) && !dropdownPanel.contains(e.target)) {
            dropdownPanel.classList.remove('active');
        }
    });

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

    // Modify the confirmChangeIfNeeded function
    async function confirmChangeIfNeeded() {
        // Clear command panel if active
        if (commandPanel.classList.contains('active')) {
            userInput.value = '';
            commandPanel.classList.remove('active');
        }
        
        if (selectedQuestions.size > 0) {
            const confirmed = await showChangeConfirmation();
            if (!confirmed) return false;
            selectedQuestions.clear();
            updateSelectedQuestionsUI();
        }
        return true;
    }

    // Modify subject selection handler
    document.querySelector('.subject-list').addEventListener('click', async e => {
        const subjectItem = e.target.closest('.dropdown-item[data-type="subject"]');
        if (!subjectItem) return;
        
        if (!await confirmChangeIfNeeded()) return;
        
        // Original subject change logic
        const subjectValue = subjectItem.dataset.value;
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
        
        if (!await confirmChangeIfNeeded()) return;
        
        // Original chapter change logic
        document.getElementById('selectedChapter').textContent = chapterItem.dataset.value;
        const subjectValue = chapterItem.dataset.subject;
        document.getElementById('selectedSubject').textContent = subjectValue;
        cachedQuestions = [];
        const filteredChapters = allChapters.filter(chapter => chapter.subject === subjectValue);
        renderChapters(filteredChapters);
        dropdownPanel.classList.remove('active');
    });

    // Update search to handle simplified structure
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

    // Listen for grade changes from settings window
    window.addEventListener('message', (event) => {
        if (event.data.type === 'gradeChanged') {
            const newGrade = event.data.grade;
            if (newGrade) {
                // Update local reference
                userGrade = newGrade;
                // Reload subjects
                loadSubjects(newGrade);
                // Reset selections
                document.getElementById('selectedSubject').textContent = 'Select Subject';
                document.getElementById('selectedChapter').textContent = 'Select Chapter';
                document.querySelector('.chapter-list').innerHTML = '';
            }
        }
    });

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

    // Handle command execution
    function handleCommand(command) {
        const baseCommand = command.split(' ')[0];
        switch(baseCommand) {
            case '/clear':
                chatMessages.innerHTML = '';
                break;
            case '/help':
                addMessage("Available commands: /help, /save, /history, /clear, /theme", false);
                break;
            case '/save':
                addMessage("Conversation saved successfully!", false);
                break;
            case '/theme':
                addMessage("Theme changed to dark mode", false);
                break;
            case '/history':
                addMessage("Showing chat history...", false);
                break;
        }
    }

    // Add this function at the top with other functions
    function showToast(message) {
        const toast = document.getElementById('toastNotification');
        const toastMessage = document.getElementById('toastMessage');
        toastMessage.textContent = message;
        toast.style.display = 'block';
        
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    }

    // Add this function
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
}); 
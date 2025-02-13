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

    // Command panel functionality
    userInput.addEventListener('input', (e) => {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        
        // Find the last slash before cursor position
        const lastSlashIndex = value.lastIndexOf('/', cursorPosition);
        
        // If there's no slash or if the slash is after cursor, hide panel
        if (lastSlashIndex === -1 || lastSlashIndex >= cursorPosition) {
            commandPanel.classList.remove('active');
            return;
        }
        
        // Check if there's any whitespace between the slash and cursor
        const textBetweenSlashAndCursor = value.slice(lastSlashIndex, cursorPosition);
        if (textBetweenSlashAndCursor.includes(' ')) {
            commandPanel.classList.remove('active');
            return;
        }
        
        // Get the command text after slash
        const searchText = textBetweenSlashAndCursor.slice(1).toLowerCase();
        
        // Filter and show/hide commands
        let hasVisibleCommands = false;
        commandItems.forEach(item => {
            const commandText = item.textContent.toLowerCase();
            if (commandText.includes(searchText)) {
                item.classList.remove('hidden');
                hasVisibleCommands = true;
            } else {
                item.classList.add('hidden');
            }
        });
        
        // Show/hide panel based on matching commands
        if (hasVisibleCommands) {
            commandPanel.classList.add('active');
        } else {
            commandPanel.classList.remove('active');
        }
    });

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

    // Handle command selection
    commandItems.forEach(item => {
        item.addEventListener('click', () => {
            const command = item.dataset.command;
            const cursorPosition = userInput.selectionStart;
            
            // Find the last slash before cursor
            const lastSlashIndex = userInput.value.lastIndexOf('/', cursorPosition);
            
            // Get the text before the slash and after the cursor
            const textBeforeSlash = userInput.value.slice(0, lastSlashIndex);
            const textAfterCursor = userInput.value.slice(cursorPosition);
            
            userInput.value = textBeforeSlash + command + ' ' + textAfterCursor;
            userInput.focus();
            commandPanel.classList.remove('active');
            
            // Place cursor after the inserted command
            const newPosition = lastSlashIndex + command.length + 1;
            userInput.setSelectionRange(newPosition, newPosition);
        });
    });

    // Add white-space style to message content CSS
    const style = document.createElement('style');
    style.textContent = `
        .message-content {
            white-space: pre-wrap;  /* This preserves line breaks */
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
        fetch(`/main/api/navigation/chapters.php?grade=${grade}&subject=${subject}`)
            .then(response => response.json())
            .then(data => {
                chapters = data.chapters; // Store chapters in the global variable
                renderChapters(chapters); // Render initial list of chapters
            })
            .catch(error => console.error('Error loading chapters:', error));
    }

    function renderChapters(chapters) {
        const chapterList = document.querySelector('.chapter-list');
        chapterList.innerHTML = chapters
            .map(chapter => `<div class="dropdown-item" data-type="chapter" data-value="${chapter}">${chapter}</div>`)
            .join('');
    }

    // After DOMContentLoaded, add this:
    if (userGrade) {
        loadSubjects(userGrade);
    } else {
        console.error('No grade found in localStorage');
    }

    // Modify the existing dropdown handler
    function initDropdown() {
        // Subject selection
        document.querySelector('.subject-list').addEventListener('click', e => {
            const subjectItem = e.target.closest('.dropdown-item[data-type="subject"]');
            if (!subjectItem) return;
            
            const subjectValue = subjectItem.dataset.value;
            document.getElementById('selectedSubject').textContent = subjectItem.textContent;
            document.getElementById('selectedChapter').textContent = 'Select Chapter';
            
            // Load chapters for selected subject
            loadChapters(userGrade, subjectValue);
        });

        // Chapter selection
        document.querySelector('.chapter-list').addEventListener('click', e => {
            const chapterItem = e.target.closest('.dropdown-item[data-type="chapter"]');
            if (!chapterItem) return;
            
            document.getElementById('selectedChapter').textContent = chapterItem.dataset.value;
            dropdownPanel.classList.remove('active');
        });
    }

    // Call initialization
    initDropdown();

    // Update search to handle simplified structure
    document.querySelector('.search-input').addEventListener('input', function(e) {
        const term = e.target.value.toLowerCase();
        
        document.querySelectorAll('.dropdown-item').forEach(item => {
            const isSubject = item.dataset.type === 'subject';
            let match = false;

            if (isSubject) {
                match = item.textContent.toLowerCase().includes(term);
            } else {
                const subjectValue = item.dataset.subject;
                const chapterText = item.dataset.chapter.toLowerCase();
                const parentSubject = subjects.find(s => s.value === subjectValue);
                match = chapterText.includes(term) || parentSubject.name.toLowerCase().includes(term);
            }

            item.style.display = match ? 'flex' : 'none';
            if (!isSubject && match) {
                const subjectName = subjects.find(s => s.value === item.dataset.subject).name;
                item.innerHTML = `${item.dataset.chapter} <span class="chapter-subject">${subjectName}</span>`;
            }
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
}); 

// Add this function before the ChatHistoryManager class declaration
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
    
    return {
        markdown: processed,
        chartData: chartData
    };
}

// Chat History Management
class ChatHistoryManager {
    constructor() {
        this.currentSessionId = null;
        this.isLoadingSession = false; // Add a loading state flag
        
        console.log("Using global API base path in chat-history.js:", window.apiBasePath);
        
        this.questionSessionMap = new Map(JSON.parse(localStorage.getItem('questionSessionMap') || '[]'));
        this.answerTypeMap = new Map(); // Add this to store answer types
        this.historyContainer = document.querySelector('.history-items');
        this.searchInput = document.querySelector('.history-search');
        this.subjectFilter = document.querySelector('.subject-filter');
        this.chapterFilter = document.querySelector('.chapter-filter');
        this.clearFiltersBtn = document.querySelector('.clear-filters-btn');
        
        // Store the complete subject-chapter mapping
        this.subjectChapterMap = new Map();
        this.allSubjects = new Set();
        this.allChapters = new Set();
        
        this.setupEventListeners();
        this.loadHistory();

        // Listen for grade changes
        window.addEventListener('storage', (event) => {
            if (event.key === 'userGrade') {
                this.reloadHistoryOnGradeChange();
            }
        });
    }

    setupEventListeners() {
        // Listen for new chat button clicks
        document.querySelector('.new-chat-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Reset current session
            this.currentSessionId = null;
            
            // Clear selected questions
            window.selectedQuestions = window.selectedQuestions || new Set();
            window.selectedQuestions.clear();
            
            // Clear chat messages
            const chatMessages = document.querySelector('.chat-messages');
            if (chatMessages) chatMessages.innerHTML = '';
            
            // Clear selected questions container
            const selectedQuestionsContainer = document.querySelector('#selectedQuestionsContainer');
            if (selectedQuestionsContainer) selectedQuestionsContainer.innerHTML = '';
            
            // Reset subject and chapter selection
            const selectedSubject = document.querySelector('#selectedSubject');
            if (selectedSubject) selectedSubject.textContent = 'Select Subject';
            
            const selectedChapter = document.querySelector('#selectedChapter');
            if (selectedChapter) selectedChapter.textContent = 'Select Chapter';
            
            // Close the sidebar on mobile
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.remove('active');
            
            // Show instruction box for empty chat
            if (typeof checkEmptyChatAndShowInstructions === 'function') {
                checkEmptyChatAndShowInstructions();
            }
        });

        // Search input handler with debounce
        this.searchInput?.addEventListener('input', debounce(() => {
            this.loadHistory();
        }, 300));

        // Subject filter handler
        this.subjectFilter?.addEventListener('change', () => {
            const selectedSubject = this.subjectFilter.value;
            if (!selectedSubject) {
                // If "All Subjects" selected, show all chapters
                this.updateChapterDropdown('');
            } else {
                // Show chapters for selected subject
                this.updateChapterDropdown(selectedSubject);
            }
            this.loadHistory();
        });

        // Chapter filter handler
        this.chapterFilter?.addEventListener('change', () => {
            this.loadHistory();
        });
        
        // Clear filters
        this.clearFiltersBtn?.addEventListener('click', () => {
            this.subjectFilter.value = '';
            this.chapterFilter.value = '';
            this.searchInput.value = '';
            this.updateChapterDropdown('');
            this.loadHistory();
        });
    }

    updateChapterDropdown(selectedSubject) {
        if (!this.chapterFilter) return;

        const currentChapter = this.chapterFilter.value;
        this.chapterFilter.innerHTML = '<option value="">All Chapters</option>';

        let chaptersToShow;
        if (selectedSubject) {
            // Show chapters for selected subject
            chaptersToShow = this.subjectChapterMap.get(selectedSubject) || new Set();
        } else {
            // Show all chapters when no subject is selected
            chaptersToShow = this.allChapters;
        }

        // Convert to array, sort, and add all options
        Array.from(chaptersToShow).sort().forEach(chapter => {
            const option = new Option(chapter, chapter);
            if (chapter === currentChapter) {
                option.selected = true;
            }
            this.chapterFilter.add(option);
        });

        // If current chapter isn't in the new list, reset to "All Chapters"
        if (currentChapter && !chaptersToShow.has(currentChapter)) {
            this.chapterFilter.value = '';
        }
    }

    updateFilters(historyData) {
        // Clear existing data
        this.subjectChapterMap.clear();
        this.allSubjects.clear();
        this.allChapters.clear();

        // Build subject-chapter mapping and collect all unique values
        historyData.forEach(item => {
            this.allSubjects.add(item.subject);
            if (item.chapter) {
                this.allChapters.add(item.chapter);
            }
            
            if (!this.subjectChapterMap.has(item.subject)) {
                this.subjectChapterMap.set(item.subject, new Set());
            }
            if (item.chapter) {
                this.subjectChapterMap.get(item.subject).add(item.chapter);
            }
        });

        // Update subject dropdown while preserving selection
        if (this.subjectFilter) {
            const currentSubject = this.subjectFilter.value;
            const subjectOptions = Array.from(this.allSubjects).sort();
            
            // Keep current options if they exist
            if (this.subjectFilter.options.length <= 1) {
                this.subjectFilter.innerHTML = '<option value="">All Subjects</option>';
                subjectOptions.forEach(subject => {
                    const option = new Option(subject, subject);
                    if (subject === currentSubject) {
                        option.selected = true;
                    }
                    this.subjectFilter.add(option);
                });
            }
        }

        // Update chapter dropdown based on current subject
        const selectedSubject = this.subjectFilter?.value || '';
        this.updateChapterDropdown(selectedSubject);
    }

    async startNewChat(subject, chapter, question) {
        try {
            const userId = localStorage.getItem('user_id');
            const userGrade = localStorage.getItem('userGrade');
            if (!userId) {
                throw new Error('User ID not found in localStorage');
            }
            if (!userGrade) {
                throw new Error('User grade not found in localStorage');
            }

            // Debug log to see what values we're receiving
            console.log('StartNewChat params:', { subject, chapter, question, userId, userGrade });

            const requestBody = {
                user_id: userId,
                grade: userGrade,
                subject: subject,
                chapter: chapter,
                questions: [question],
                conversation: []
            };

            console.log('Request body:', requestBody);

            const response = await fetch(`${window.apiBasePath}/api/chat/history.php`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const responseData = await response.json();
            console.log('Server response:', responseData);

            if (!response.ok) {
                throw new Error(responseData.error || `Server error: ${response.status}`);
            }

            if (responseData.success) {
                this.currentSessionId = responseData.session_id;
                await this.loadHistory();
                return {
                    session_id: responseData.session_id,
                    existing: responseData.existing || false
                };
            }
            throw new Error(responseData.error || 'Failed to start new chat');
        } catch (error) {
            console.error('Error starting new chat:', error);
            throw error;
        }
    }

    removeQuestion(question) {
        this.questionSessionMap.delete(question);
        // Update localStorage when removing question
        localStorage.setItem('questionSessionMap', JSON.stringify([...this.questionSessionMap]));
        if (this.currentSessionId === this.questionSessionMap.get(question)) {
            this.currentSessionId = null;
        }
    }

    async addMessage(message, sender = 'user') {
        if (!this.currentSessionId) {
            console.warn('No active chat session');
            return;
        }

        try {
            console.log('Adding message to session:', this.currentSessionId);
            const response = await fetch(`${window.apiBasePath}/api/chat/history.php`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: this.currentSessionId,
                    sender,
                    message
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to add message');
            }
            
            console.log('Message added successfully');
        } catch (error) {
            console.error('Error adding message:', error);
            throw error;
        }
    }

    async loadChatSession(sessionId) {
        // Skip if we're already loading or if this is already the current session
        if (this.isLoadingSession || (this.currentSessionId === sessionId && document.querySelector('.chat-messages').children.length > 0)) {
            console.log('Skipping duplicate load for session:', sessionId);
            return;
        }
        
        try {
            this.isLoadingSession = true; // Set loading state to true
            
            // Close the menu/sidebar using the same implementation as script.js
            const sidebar = document.getElementById('sidebar');
            const menuToggle = document.getElementById('menuToggle');
            if (sidebar && menuToggle) {
                sidebar.classList.remove('active');
                // Dispatch a click event on the document to ensure proper cleanup
                document.dispatchEvent(new MouseEvent('click'));
            }

            const response = await fetch(`${window.apiBasePath}/api/chat/history.php?session_id=${sessionId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success && Array.isArray(data.conversation)) {
                this.currentSessionId = sessionId;
                
                // Clear existing chat messages
                const chatMessages = document.querySelector('.chat-messages');
                chatMessages.innerHTML = '';
                
                // Remove the instruction box if it exists
                const instructionBox = chatMessages?.querySelector('.empty-chat-instructions');
                if (instructionBox) {
                    instructionBox.remove();
                }
                
                // Auto-select the subject and chapter from history item
                const historyItem = document.querySelector(`.history-item[data-session-id="${sessionId}"]`);
                if (historyItem) {
                    const subject = historyItem.dataset.subject;
                    const chapter = historyItem.dataset.chapter;
                    const questionText = historyItem.querySelector('.history-text').textContent;
                    
                    // Get the grade from localStorage and handle null case
                    const userGrade = localStorage.getItem('userGrade');
                    if (!userGrade) {
                        console.error('User grade not found in localStorage');
                        // Show error message to user
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'message error-message';
                        errorDiv.innerHTML = `
                            <div class="message-content">Error: User grade not found. Please log in again.</div>
                        `;
                        document.querySelector('.chat-messages')?.appendChild(errorDiv);
                        return;
                    }
                    
                    // Select the subject in dropdown
                    const subjectSelect = document.querySelector('#selectedSubject');
                    if (subjectSelect) {
                        subjectSelect.textContent = subject;
                    }
                    
                    // Select the chapter in dropdown
                    const chapterSelect = document.querySelector('#selectedChapter');
                    if (chapterSelect) {
                        chapterSelect.textContent = chapter;
                    }
                    
                    // Load questions for this subject and chapter
                    try {
                        const questionsResponse = await fetch(`${window.apiBasePath}/api/navigation/questions.php?grade=${encodeURIComponent(userGrade)}&subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}`);
                        const questionsData = await questionsResponse.json();
                        
                        if (questionsData.questions) {
                            // Initialize global selectedQuestions if it doesn't exist
                            window.selectedQuestions = window.selectedQuestions || new Set();
                            // Clear existing questions
                            window.selectedQuestions.clear();
                            // Add the new question
                            window.selectedQuestions.add(questionText);
                            
                            // Update the UI
                            const selectedQuestionsContainer = document.querySelector('#selectedQuestionsContainer');
                            if (selectedQuestionsContainer) {
                                const tag = document.createElement('div');
                                tag.className = 'question-tag';
                                tag.innerHTML = `
                                    <span>${questionText}</span>
                                    <div class="remove-question">×</div>
                                `;
                                selectedQuestionsContainer.innerHTML = ''; // Clear existing questions
                                selectedQuestionsContainer.appendChild(tag);
                            }
                        }
                    } catch (error) {
                        console.error('Error loading questions:', error);
                    }
                }

                // Keep track of processed messages to avoid duplicates
                const processedMessages = new Set();

                // Add all messages since system messages are already filtered out on the server
                let msgIndex = 0;
                data.conversation.forEach(msg => {
                    // Debug: Print exact message format for each message
                    console.log(`Message #${msgIndex++}:`, {
                        raw: msg.message,
                        type: typeof msg.message,
                        isString: typeof msg.message === 'string',
                        isObject: typeof msg.message === 'object',
                        stringifiedMsg: JSON.stringify(msg.message),
                    });
                    
                    if (!msg || typeof msg.sender !== 'string') {
                        console.warn('Invalid message format:', msg);
                        return;
                    }

                    // Always use 'bot' for AI messages
                    const sender = msg.sender === 'ai' || msg.sender === 'bot' ? 'bot' : msg.sender;
                    
                    // Enhanced message content extraction
                    let messageContent;
                    
                    // Object path extraction helper function - extract from nested objects using dot notation
                    const extractFromPath = (obj, path) => {
                        const parts = path.split('.');
                        let current = obj;
                        for (const part of parts) {
                            if (current === null || current === undefined || typeof current !== 'object') {
                                return null;
                            }
                            current = current[part];
                        }
                        return current;
                    };
                    
                    const possiblePaths = [
                        'text', 'message', 'content', 'value', 'data', 'response',
                        'data.text', 'data.message', 'data.content',
                        'response.text', 'response.message', 'response.content'
                    ];
                    
                    // Improved message content extraction logic
                    if (msg.message === null || msg.message === undefined) {
                        messageContent = "Error: Empty response from server";
                    } else if (typeof msg.message === 'string') {
                        // Check for [object Object] string directly before any processing
                        if (msg.message === '[object Object]') {
                            // If the string is literally [object Object], this means the actual object 
                            // was likely stringified incorrectly before storing in the database
                            messageContent = "Error: Response was incorrectly serialized to [object Object]";
                        } else {
                            messageContent = msg.message;
                            
                            // If it looks like JSON but isn't already parsed, try to parse it
                            if ((messageContent.startsWith('{') && messageContent.endsWith('}')) || 
                                (messageContent.startsWith('[') && messageContent.endsWith(']'))) {
                                try {
                                    const parsed = JSON.parse(messageContent);
                                    
                                    // If it's an object, try to extract text from it
                                    if (parsed && typeof parsed === 'object') {
                                        // Try each possible path
                                        let foundContent = false;
                                        for (const path of possiblePaths) {
                                            const extracted = extractFromPath(parsed, path);
                                            if (typeof extracted === 'string' && extracted.trim().length > 0) {
                                                messageContent = extracted;
                                                foundContent = true;
                                                break;
                                            }
                                        }
                                        
                                        // No string content found, so stringify with indentation for readability
                                        if (!foundContent) {
                                            messageContent = JSON.stringify(parsed, null, 2);
                                        }
                                    }
                                } catch (e) {
                                    // Not parseable as JSON, keep original
                                    console.log('String looks like JSON but failed to parse:', e);
                                }
                            }
                        }
                    } else if (typeof msg.message === 'object' && msg.message !== null) {
                        // Try to extract content from the object
                        let contentFound = false;
                        
                        // Special handling for common AI response formats
                        if (msg.message.choices && Array.isArray(msg.message.choices) && msg.message.choices.length > 0) {
                            // OpenAI-like format: {choices: [{message: {content: "text"}}]}
                            if (msg.message.choices[0].message && msg.message.choices[0].message.content) {
                                messageContent = msg.message.choices[0].message.content;
                                contentFound = true;
                            } 
                            // Alternative format: {choices: [{text: "text"}]}
                            else if (msg.message.choices[0].text) {
                                messageContent = msg.message.choices[0].text;
                                contentFound = true;
                            }
                        }
                        
                        // If not found yet, try each possible path
                        if (!contentFound) {
                            for (const path of possiblePaths) {
                                const extracted = extractFromPath(msg.message, path);
                                if (typeof extracted === 'string' && extracted.trim().length > 0) {
                                    messageContent = extracted;
                                    contentFound = true;
                                    break;
                                }
                            }
                        }
                        
                        // If still not found, check for toString() method override
                        if (!contentFound && typeof msg.message.toString === 'function' && 
                            msg.message.toString() !== '[object Object]') {
                            messageContent = msg.message.toString();
                            contentFound = true;
                        }
                        
                        // If no string content found, stringify the object for display
                        if (!contentFound) {
                            try {
                                // Get all own property names
                                const props = Object.getOwnPropertyNames(msg.message);
                                
                                // If the object has properties, stringify it with indentation
                                if (props.length > 0) {
                                    messageContent = JSON.stringify(msg.message, null, 2);
                                } else {
                                    messageContent = "Error: Empty object received";
                                }
                            } catch (e) {
                                messageContent = "Error: Cannot display complex object";
                                console.error('Failed to stringify object message:', e);
                            }
                        }
                    } else {
                        // For other types (number, boolean, etc.)
                        messageContent = String(msg.message);
                    }
                    
                    // Final check for [object Object] string as messageContent
                    if (messageContent === '[object Object]') {
                        try {
                            // Last resort - try to extract readable information
                            messageContent = "AI Response: [Content couldn't be displayed properly]";
                            console.error('Failed to extract content from message object:', msg.message);
                        } catch (e) {
                            messageContent = "Error: Cannot process response format";
                            console.error('Failed to process object:', e);
                        }
                    }
                    
                    console.log(`After processing, message #${msgIndex-1} content:`, messageContent);
                    
                    // Create a unique key for each message
                    const messageKey = JSON.stringify({
                        sender: sender,
                        message: messageContent,
                        timestamp: msg.timestamp || ''
                    });

                    if (processedMessages.has(messageKey)) {
                        console.log('Skipping duplicate message:', msg);
                        return; // Skip duplicate messages
                    }
                    processedMessages.add(messageKey);

                    const messageDiv = document.createElement('div');
                    messageDiv.className = `response ${sender}-response`;
                    
                    if (sender === 'bot') {
                        // Process markdown content
                        const processedMarkdown = preprocessMarkdown(messageContent);
                        console.log('Processed markdown:', processedMarkdown);

                        // Store the original markdown content before rendering
                        messageDiv.dataset.originalMarkdown = messageContent;

                        // Store chart data in the message element's dataset
                        if (processedMarkdown.chartData && processedMarkdown.chartData.length > 0) {
                            messageDiv.dataset.chartData = JSON.stringify(processedMarkdown.chartData);
                            console.log('Stored chart data for history:', processedMarkdown.chartData);
                        }
                        
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
                    } else {
                        messageDiv.innerHTML = `
                            <div class="chat-content selected-question">${messageContent}</div>
                        `;
                    }
                    
                    chatMessages.appendChild(messageDiv);
                });
                
                // After all messages are loaded, enhance code blocks and render charts
                console.log('Enhancing code blocks and rendering charts...');
                const botMessages = chatMessages.querySelectorAll('.bot-response');
                botMessages.forEach(message => {
                    console.log('Processing message:', message);
                    console.log('Message dataset:', message.dataset);
                    enhanceCodeBlocks(message);
                });
                
                // Process MathJax rendering for all bot messages if MathJax is available
                if (typeof MathJax !== 'undefined') {
                    try {
                        // Use typesetPromise for better performance on multiple messages
                        const botMessageContainers = chatMessages.querySelectorAll('.bot-response .chat-content');
                        MathJax.typesetPromise(Array.from(botMessageContainers)).catch((err) => {
                            console.error('MathJax typesetting error:', err);
                        });
                    } catch (error) {
                        console.error('Error rendering LaTeX with MathJax:', error);
                    }
                }
                
                // Scroll to bottom
                chatMessages.scrollTop = chatMessages.scrollHeight;
            } else {
                throw new Error('Invalid or empty conversation data received');
            }
        } catch (error) {
            console.error('Error loading chat session:', error);
            // Show error message to user
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message error-message';
            errorDiv.innerHTML = `
                <div class="message-content">Failed to load chat history. Please try again.</div>
            `;
            document.querySelector('.chat-messages')?.appendChild(errorDiv);
        } finally {
            this.isLoadingSession = false; // Reset loading state
        }
    }

    async loadHistory() {
        try {
            const userId = localStorage.getItem('user_id');
            const userGrade = localStorage.getItem('userGrade'); // Get current grade
            const searchTerm = this.searchInput?.value || '';
            const subject = this.subjectFilter?.value || '';
            const chapter = this.chapterFilter?.value || '';

            // Include grade in the API request with environment-aware path
            const response = await fetch(
                `${window.apiBasePath}/api/chat/history.php?user_id=${encodeURIComponent(userId)}&grade=${encodeURIComponent(userGrade)}&search=${encodeURIComponent(searchTerm)}&subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();

            if (data.success) {
                this.updateFilters(data.history);
                this.displayHistory(data.history);
            }
        } catch (error) {
            console.error('Error loading chat history:', error);
        }
    }

    displayHistory(history) {
        if (!this.historyContainer) return;
        
        const searchTerm = this.searchInput?.value.toLowerCase() || '';
        
        this.historyContainer.innerHTML = history.length ? '' : 
            '<div class="no-history">No chat history found</div>';

        history.forEach(item => {
            // Filter only by question text
            const questionText = item.question_identifier.toLowerCase();
            if (searchTerm && !questionText.includes(searchTerm)) {
                return; // Skip this item if it doesn't match search
            }

            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.dataset.sessionId = item.id; // Set the session ID in the dataset
            historyItem.dataset.subject = item.subject;
            historyItem.dataset.chapter = item.chapter;
            
            historyItem.innerHTML = `
                <i class="fas fa-message"></i>
                <div class="history-item-content">
                    <span class="history-text">${item.question_identifier}</span>
                    <div class="history-tags">
                        <span class="subject-tag">${item.subject}</span>
                        <span class="chapter-tag">${item.chapter}</span>
                    </div>
                </div>
            `;

            historyItem.addEventListener('click', () => {
                if (item.id) {
                    this.loadChatSession(item.id);
                } else {
                    console.error('No session ID found for history item:', item);
                }
            });

            this.historyContainer.appendChild(historyItem);
        });
    }

    // Add method to store answer type
    setAnswerType(questionId, type) {
        this.answerTypeMap.set(questionId, type);
    }

    // Add method to get answer type
    getAnswerType(questionId) {
        return this.answerTypeMap.get(questionId);
    }

    // Add a method to reload history when grade changes
    reloadHistoryOnGradeChange() {
        this.loadHistory();
    }

    // Update the getQuestions method to use the apiBasePath
    async getQuestions(session) {
        const subject = session.subject || '';
        const chapter = session.chapter || '';
        const userGrade = localStorage.getItem('userGrade');

        try {
            const questionsResponse = await fetch(`${window.apiBasePath}/api/navigation/questions.php?grade=${encodeURIComponent(userGrade)}&subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}`)
                .then(res => res.json());
            
            return questionsResponse.questions || [];
        } catch (error) {
            console.error('Error loading available questions:', error);
            return [];
        }
    }

    async deleteSession(sessionId) {
        try {
            // Get user ID for API request with proper URL encoding
            const userId = encodeURIComponent(localStorage.getItem('user_id'));
            
            const response = await fetch(`${window.apiBasePath}/api/chat/history.php`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: localStorage.getItem('user_id'),
                    session_id: sessionId
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                // Remove the session from the UI
                const sessionElement = document.getElementById(`session-${sessionId}`);
                if (sessionElement) {
                    sessionElement.remove();
                }
                
                // Show success message
                this.showToast('Session deleted successfully!', 'success');
                
                // Reload history to update counts
                this.loadHistory();
            } else {
                this.showToast('Failed to delete session. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Error deleting chat session:', error);
            this.showToast('Error deleting session. Please try again.', 'error');
        }
    }

    async updateSessionTitle(sessionId, newTitle) {
        try {
            const response = await fetch(`${window.apiBasePath}/api/chat/history.php?session_id=${encodeURIComponent(sessionId)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    title: newTitle
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.success;
        } catch (error) {
            console.error('Error updating session title:', error);
            return false;
        }
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize the chat history manager
document.addEventListener('DOMContentLoaded', () => {
    new ChatHistoryManager();
});

// Export for use in other files
window.chatHistory = new ChatHistoryManager(); 

// Function to enhance code blocks and render charts
function enhanceCodeBlocks(messageElement) {
    console.log('Enhancing code blocks for message:', messageElement);
    
    // Process code blocks
    const codeBlocks = messageElement.querySelectorAll('pre code');
    codeBlocks.forEach(codeBlock => {
        // ... existing code block handling ...
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
                maintainAspectRatio: true,
                aspectRatio: 2, // Match saved_answers.js
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
                            // We should wrap all display math elements to ensure proper scrolling
                            const rect = mathElement.getBoundingClientRect();
                            const isDisplayEquation = rect.width > 200 || mathElement.getAttribute('display') === 'block';
                            
                            if (isDisplayEquation || rect.width > formattedContent.clientWidth * 0.7) {
                                // Create scrollable wrapper
                                const wrapper = document.createElement('div');
                                wrapper.classList.add('scrollable-wrapper');
                                wrapper.style.overflowY = 'hidden'; // Force horizontal scrolling only
                                
                                // Replace equation with wrapper containing equation
                                mathElement.parentNode.insertBefore(wrapper, mathElement);
                                wrapper.appendChild(mathElement);
                                
                                // Set explicit styles on MathJax element to ensure horizontal scrolling
                                mathElement.style.display = 'inline-block';
                                mathElement.style.width = 'auto';
                                mathElement.style.maxWidth = 'none';
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
}

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
// Add this function at the top of the file
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

// Function to show toast messages
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast-message' + (isError ? ' error' : '');
    toast.textContent = message;

    document.body.appendChild(toast);

    // Automatically remove the toast after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Add a helper function at the top of the file to standardize save type class formatting
function formatSaveTypeClass(saveType) {
    if (!saveType) return 'question-related';
    
    // Convert to lowercase and handle common formats
    const type = saveType.toLowerCase();
    
    // Handle both formats: with spaces and with underscores
    if (type.includes('best')) return 'best-response';
    if (type.includes('question')) return 'question-related';
    if (type.includes('exam')) return 'exam-related';
    if (type.includes('important')) return 'important';
    
    // Fallback: normalize the string by replacing spaces and special chars with hyphens
    return saveType.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

document.addEventListener('DOMContentLoaded', () => {
    // Add new chat button handler
    document.querySelector('.new-chat-btn')?.addEventListener('click', () => {
        window.location.href = '/main/public/html/chatbot.html';
    });

    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    // Toggle sidebar
    if(menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });

        // Close sidebar when clicking outside
        document.addEventListener('click', (e) => {
            if(sidebar.classList.contains('active') && 
              !sidebar.contains(e.target) && 
              !menuToggle.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });

        // Prevent closing when clicking inside sidebar
        sidebar.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Add CSS styles for messages and badges
    const style = document.createElement('style');
    style.textContent = `
        .no-answers-message {
            text-align: center;
            padding: 30px;
            background: rgba(59, 130, 246, 0.1);
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .no-answers-message p {
            margin: 10px 0;
            color: #555;
        }
        
        .no-chapters-message, .no-answers-message-chapter {
            padding: 15px;
            color: #666;
            font-style: italic;
            text-align: center;
            background: rgba(200, 200, 200, 0.1);
            border-radius: 4px;
            margin: 10px 0;
        }
        
        .answer-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .save-type-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            background-color: #2196F3; /* Default blue for all badges */
            color: white;
        }
        
        .save-type-badge.best-response,
        .save-type-badge.best_response {
            background-color: #4CAF50;
        }
        
        .save-type-badge.question-related,
        .save-type-badge.question_related {
            background-color: #4CAF50;
        }
        
        .save-type-badge.important {
            background-color: #FF9800;
        }
        
        .save-type-badge.exam-related,
        .save-type-badge.exam_related {
            background-color: #9C27B0;
        }
        
        .answer-date {
            font-size: 0.75rem;
            color: #666;
        }
        
        .answer-item {
            margin-bottom: 15px;
            padding: 12px;
            border-radius: 8px;
            background-color: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .answer-body {
            margin-bottom: 10px;
            color: #ccc;
            font-size: 0.9rem;
            line-height: 1.4;
        }
        
        .view-full-answer {
            background-color: #3b82f6;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
        }
        
        .view-full-answer:hover {
            background-color: #2563eb;
        }
        
        /* New styles for better visibility */
        .answer-count {
            background-color: #2196F3;
            color: white;
            font-size: 0.7rem;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 10px;
            margin-left: 8px;
        }
        
        .accordion-item {
            margin-bottom: 10px;
        }
        
        .chapter-item {
            margin-bottom: 5px;
        }
        
        .chapter-header, .accordion-header {
            cursor: pointer;
        }
        
        .chapter-header .header-content, 
        .accordion-header .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .chapter-item.active > .chapter-header,
        .accordion-item.active > .accordion-header {
            background-color: rgba(59, 130, 246, 0.1);
        }
        
        .accordion-content, .chapter-content, .question-content {
            display: none;
            padding: 10px;
            border-radius: 0 0 4px 4px;
        }
        
        .accordion-item.active > .accordion-content,
        .chapter-item.active > .chapter-content,
        .question-item.active > .question-content {
            display: block;
        }
        
        .single-answer .question-content {
            padding-top: 0;
        }
        
        /* Better toggle button visibility */
        .toggle-section-btn {
            background-color: rgba(255, 255, 255, 0.1);
            border: none;
            color: white;
            border-radius: 4px;
            padding: 2px 6px;
            cursor: pointer;
        }
        
        .toggle-section-btn:hover {
            background-color: rgba(255, 255, 255, 0.2);
        }
        
        /* Highlight chapters with saved answers */
        .highlighted-chapter {
            border-left: 3px solid #2196F3;
            background-color: rgba(33, 150, 243, 0.05);
        }
        
        .highlighted-chapter .chapter-header {
            background-color: rgba(33, 150, 243, 0.1);
        }
        
        .highlighted-chapter.active .chapter-header {
            background-color: rgba(33, 150, 243, 0.2);
        }
        
        /* Ensure proper scrolling for expanded content */
        body, html {
            height: 100%;
            max-height: 100%;
            overflow-x: hidden;
        }
        
        main {
            min-height: 100%;
            padding-bottom: 80px; /* Add padding at bottom to ensure scrollability */
            position: relative;
        }
        
        .answers-container {
            overflow-y: auto;
            position: relative;
        }
        
        /* Improve scrolling when all content is expanded */
        .answers-tree {
            margin-bottom: 100px; /* Add extra margin at bottom for better scrolling */
        }
        
        /* Fix for accordion behavior */
        .accordion-content {
            max-height: none !important; /* Ensure no height restrictions */
        }
        
        /* Ensure the page footer doesn't interfere with scrolling */
        footer {
            position: relative;
            z-index: 10;
        }
        
        /* When all is expanded, improve visibility of bottom content */
        .toggle-all-btn.active ~ .answers-tree {
            padding-bottom: 150px;
        }
        
        /* Make subject headers always have a blue background */
        .accordion-header {
            background-color: #3B82F6;
            border-radius: 4px;
            color: white;
            padding: 15px 15px;
        }
        
        /* When active, make it slightly darker rather than gray */
        .accordion-item.active > .accordion-header {
            background-color: #2563EB;
        }
        
        /* Make sure the icons in the header are white */
        .accordion-header i,
        .accordion-header .toggle-section-btn {
            color: white;
        }
        
        /* Keep chapter styling as is */
        .chapter-item.active > .chapter-header {
            background-color: rgba(59, 130, 246, 0.1);
        }
    `;
    document.head.appendChild(style);

    console.log("Using global API base path in saved_answers.js:", window.apiBasePath);
    
    // Initialize the saved answers manager - This will be our single initialization point
    const savedAnswersManager = new SavedAnswersManager();
    // No need to call init() here as it's already called in the constructor
}); 

// Toggle subject accordion level
document.querySelectorAll('.accordion-header').forEach(header => {
    header.addEventListener('click', () => {
        header.parentElement.classList.toggle('active');
    });
});
// Toggle chapter accordion level (prevent bubbling)
document.querySelectorAll('.chapter-header').forEach(header => {
    header.addEventListener('click', e => {
        e.stopPropagation();
        header.parentElement.classList.toggle('active');
    });
});
// Toggle question accordion level (prevent bubbling)
document.querySelectorAll('.question-header').forEach(header => {
    header.addEventListener('click', e => {
        e.stopPropagation();
        header.parentElement.classList.toggle('active');
    });
});

// Dynamic chapter filter based on subject selection
const subjectSelect = document.querySelector('.filter-select');
const chapterSelect = document.querySelectorAll('.filter-select')[1];

const chapters = {
    eco: ["Introduction", "Microeconomics", "Macroeconomics"],
    ba: ["Management", "Marketing", "Finance"]
};

subjectSelect.addEventListener('change', (e) => {
    const subject = e.target.value;
    chapterSelect.innerHTML = '<option value="">All Chapters</option>';
    
    if (subject && chapters[subject]) {
        chapters[subject].forEach(chapter => {
            chapterSelect.innerHTML += `<option value="${chapter}">${chapter}</option>`;
        });
    }
});

// Clear filters functionality
document.querySelector('.clear-filters').addEventListener('click', () => {
    document.querySelector('.search-input').value = '';
    document.querySelectorAll('.filter-select').forEach(select => {
        select.value = '';
    });
    // Trigger change event to update chapter dropdown
    subjectSelect.dispatchEvent(new Event('change'));
});

// The standalone toggle-all functionality is removed here as it's handled by SavedAnswersManager

// Add to your existing JavaScript
document.querySelectorAll('.toggle-section-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering parent accordion
        
        const section = btn.closest('.accordion-item, .chapter-item');
        const isExpanded = section.classList.contains('active');
        btn.classList.toggle('active');
        
        // Toggle icon
        btn.innerHTML = isExpanded ? 
            '<i class="fas fa-expand-alt"></i>' : 
            '<i class="fas fa-compress-alt"></i>';
            
        // Toggle all nested items if this is a subject section
        if (section.classList.contains('accordion-item')) {
            const chapters = section.querySelectorAll('.chapter-item');
            chapters.forEach(chapter => {
                if (isExpanded) {
                    chapter.classList.remove('active');
                    chapter.querySelector('.toggle-section-btn').innerHTML = '<i class="fas fa-expand-alt"></i>';
                    chapter.querySelector('.toggle-section-btn').classList.remove('active');
                } else {
                    chapter.classList.add('active');
                    chapter.querySelector('.toggle-section-btn').innerHTML = '<i class="fas fa-compress-alt"></i>';
                    chapter.querySelector('.toggle-section-btn').classList.add('active');
                }
            });
        }
        
        // Toggle this section
        section.classList.toggle('active');
    });
});

// Real-time search functionality
const searchInput = document.querySelector('.search-input');
let debounceTimer;

function filterContent() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedSubject = subjectSelect.value.toLowerCase();
    const selectedChapter = chapterSelect.value.toLowerCase();
    
    const accordionItems = document.querySelectorAll('.accordion-item');
    
    accordionItems.forEach(subject => {
        const subjectHeader = subject.querySelector('.subject-name').textContent.toLowerCase();
        const chapters = subject.querySelectorAll('.chapter-item');
        let subjectHasMatch = false;
        
        // Check if subject matches filters
        const subjectMatches = !selectedSubject || subjectHeader.includes(selectedSubject);
        
        chapters.forEach(chapter => {
            const chapterHeader = chapter.querySelector('.chapter-header .header-content span').textContent.toLowerCase();
            const questions = chapter.querySelectorAll('.question-item');
            let chapterHasMatch = false;
            
            // Check if chapter matches filters
            const chapterMatches = (!selectedChapter || chapterHeader.includes(selectedChapter)) &&
                                 (!selectedSubject || subjectMatches);
            
            questions.forEach(question => {
                const questionText = question.querySelector('.question-header span').textContent.toLowerCase();
                const answerTexts = Array.from(question.querySelectorAll('.answer-body'))
                    .map(answer => answer.textContent.toLowerCase());
                
                // Check if question/answer matches search and filters
                const matchesSearch = !searchTerm || 
                    questionText.includes(searchTerm) || 
                    answerTexts.some(text => text.includes(searchTerm));
                
                const matchesFilters = chapterMatches;
                
                question.style.display = (matchesSearch && matchesFilters) ? '' : 'none';
                if (matchesSearch && matchesFilters) chapterHasMatch = true;
            });
            
            chapter.style.display = (chapterMatches && (chapterHasMatch || !searchTerm)) ? '' : 'none';
            if (chapter.style.display !== 'none') subjectHasMatch = true;
        });
        
        subject.style.display = (subjectMatches && (subjectHasMatch || !searchTerm)) ? '' : 'none';
        
        // Auto expand/collapse based on filters and search
        if (subject.style.display !== 'none' && (selectedSubject || selectedChapter || searchTerm)) {
            subject.classList.add('active');
            chapters.forEach(chapter => {
                if (chapter.style.display !== 'none') {
                    chapter.classList.add('active');
                }
            });
        } else if (!selectedSubject && !selectedChapter && !searchTerm) {
            subject.classList.remove('active');
            chapters.forEach(chapter => chapter.classList.remove('active'));
        }
    });
}

// Update event listeners
searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(filterContent, 300);
});

subjectSelect.addEventListener('change', filterContent);
chapterSelect.addEventListener('change', filterContent);

// Clear filters button functionality
document.querySelector('.clear-filters').addEventListener('click', () => {
    searchInput.value = '';
    subjectSelect.value = '';
    chapterSelect.value = '';
    filterContent();
});

// Dynamic chapter options based on selected subject
subjectSelect.addEventListener('change', (e) => {
    const subject = e.target.value;
    chapterSelect.innerHTML = '<option value="">All Chapters</option>';
    
    if (subject) {
        // Get all chapters from the selected subject in the DOM
        const subjectElement = Array.from(document.querySelectorAll('.accordion-item'))
            .find(item => item.querySelector('.subject-name')
                .textContent.toLowerCase().includes(subject.toLowerCase()));
            
        if (subjectElement) {
            const chapters = Array.from(subjectElement.querySelectorAll('.chapter-header .header-content span'))
                .map(span => span.textContent);
            
            chapters.forEach(chapter => {
                chapterSelect.innerHTML += `<option value="${chapter}">${chapter}</option>`;
            });
        }
    }
    
    filterContent();
});

// Universal answer navigation system
let currentAnswers = [];
let currentIndex = 0;

// Store answers directly in DOM elements
document.querySelectorAll('.answer-item').forEach((answerItem, index) => {
    answerItem.dataset.fullAnswer = answerItem.querySelector('.answer-body').textContent;
});

// View full answer handler
document.querySelectorAll('.view-full-answer').forEach(button => {
    button.addEventListener('click', () => {
        const questionItem = button.closest('.question-item');
        currentAnswers = Array.from(questionItem.querySelectorAll('.answer-item'));
        currentIndex = currentAnswers.indexOf(button.closest('.answer-item'));
        
        updateModalContent();
        document.getElementById('answerModal').classList.add('active');
    });
});

// Navigation handlers
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const isPrevious = btn.textContent.includes('Previous');
        currentIndex = Math.max(0, Math.min(currentAnswers.length - 1, currentIndex + (isPrevious ? -1 : 1)));
        
        const answerItem = currentAnswers[currentIndex];
        if (answerItem) {
            const rawAnswer = decodeURIComponent(answerItem.dataset.fullAnswer);
            
            // Process markdown content first
            const processedMarkdown = preprocessMarkdown(rawAnswer || '');
            
            // Convert Markdown to HTML using marked.js with failsafe
            let formattedAnswer = '';
            try {
                if (typeof marked !== 'undefined' && marked) {
                    formattedAnswer = marked.parse(processedMarkdown);
                } else {
                    console.warn('Marked library not fully loaded, displaying raw text');
                    formattedAnswer = `<pre>${processedMarkdown}</pre>`;
                }
            } catch (error) {
                console.error('Error parsing markdown:', error);
                formattedAnswer = `<pre>${processedMarkdown}</pre>`;
            }
            
            updateModalContent();
            
            // Update the answer text with formatted content
            document.querySelector('.answer-text').innerHTML = `
                <div class="formatted-content">
                    ${formattedAnswer}
                </div>
            `;
        }
    });
});

function updateModalContent() {
    const answerItem = currentAnswers[currentIndex];
    const questionItem = answerItem.closest('.question-item');
    
    // Get hierarchy from DOM
    const subject = questionItem.closest('.accordion-item').querySelector('.subject-name').textContent;
    const chapter = questionItem.closest('.chapter-item').querySelector('.chapter-header .header-content span').textContent;
    const question = questionItem.querySelector('.question-header span').textContent;

    // Create a temporary div to parse the HTML string
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = decodeURIComponent(answerItem.dataset.fullAnswer);
 
    // Update modal content
    document.querySelector('.modal-title h3').textContent = 'Saved Answer';
    document.querySelector('.answer-meta').textContent = `${subject} > ${chapter}`;
    document.querySelector('.question-section h4').textContent = question;
    document.querySelector('.answer-text').innerHTML = `
        <div class="formatted-content">
            ${tempDiv.innerHTML}
        </div>
    `;

    // Update navigation state
    document.querySelector('.nav-btn:first-child').disabled = currentIndex === 0;
    document.querySelector('.nav-btn:last-child').disabled = currentIndex === currentAnswers.length - 1;
}

document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('answerModal').classList.remove('active');
    document.body.style.overflow = 'auto';
});

// Main class to handle all saved answers functionality
class SavedAnswersManager {
    constructor() {
        this.userGrade = localStorage.getItem('userGrade');
        this.answersTree = document.querySelector('.answers-tree');
        this.savedAnswersCache = null;
        this.modal = document.getElementById('answerModal');
        this.currentAnswers = [];
        this.currentIndex = 0;
        this.init(); // Already calling init here
        this.setupEventListeners();
    }

    async init() {
        try {
            if (!this.userGrade) {
                console.error("User grade not found in localStorage");
                showToast("User grade not found. Please try logging in again.", true);
                return;
            }
            
            if (!this.answersTree) {
                console.error("Answers tree element not found");
                return;
            }
            
            // First fetch all saved answers
            await this.fetchSavedAnswers();
            
            // Only proceed to load subjects if we have answers or confirmed the fetch was successful
            if (this.savedAnswersCache) {
            // Then load subjects
            await this.loadSubjects();
                
                // Log how many subjects and answers were loaded
                let totalAnswers = 0;
                Object.keys(this.savedAnswersCache).forEach(subject => {
                    Object.keys(this.savedAnswersCache[subject]).forEach(chapter => {
                        totalAnswers += this.savedAnswersCache[subject][chapter].length;
                    });
                });
                
                console.log(`Loaded ${Object.keys(this.savedAnswersCache).length} subjects with a total of ${totalAnswers} saved answers`);
                
                if (totalAnswers === 0) {
                    // Display a message if no saved answers found
                    this.answersTree.innerHTML = `
                        <div class="no-answers-message">
                            <p>You haven't saved any answers yet.</p>
                            <p>When chatting with the bot, click the bookmark icon to save answers for later reference.</p>
                        </div>
                    `;
                } else {
                    // Add counts to the toggle all button for reference
                    const toggleAllBtn = document.querySelector('.toggle-all-btn');
                    if (toggleAllBtn) {
                        toggleAllBtn.setAttribute('title', `${totalAnswers} saved answers in ${Object.keys(this.savedAnswersCache).length} subjects`);
                    }
                    
                    // Force a refresh of the expand state after a small delay to ensure DOM is fully updated
                    setTimeout(() => {
                        console.log("Performing delayed refresh of expand state after init");
                        this.refreshExpandCollapseState();
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Error initializing:', error);
            showToast(`Error loading saved answers: ${error.message}`, true);
        }
    }

    async fetchSavedAnswers() {
        try {
            const userId = localStorage.getItem('user_id');
            if (!userId) {
                console.error('User ID not found in localStorage');
                showToast("User ID not found. Please try logging in again.", true);
                return;
            }

            if (!this.userGrade) {
                console.error('User grade not found in localStorage');
                showToast("User grade not found. Please try logging in again.", true);
                return;
            }

            console.log('Fetching saved answers with:', {
                userId,
                grade: this.userGrade
            });

            const url = `${window.apiBasePath}/api/saved-answers/saved_answers.php?grade=${encodeURIComponent(this.userGrade)}&user_id=${encodeURIComponent(userId)}`;
            console.log("Fetching from URL:", url);
            
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server response:', errorText);
                throw new Error(`Failed to fetch saved answers: ${response.status} ${response.statusText}`);
            }

            const responseText = await response.text();
            console.log('Raw server response:', responseText);
            
            // Try to parse the JSON
            let data;
            try {
                data = JSON.parse(responseText);
                console.log('Parsed saved answers data:', data);
            } catch (e) {
                console.error('Error parsing JSON:', e);
                throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
            }
            
            console.log('Received saved answers:', data);
            
            // Group answers by subject and chapter
            this.savedAnswersCache = {};
            if (data.answers && Array.isArray(data.answers)) {
                if (data.answers.length === 0) {
                    console.log("No saved answers found for this user");
                    showToast("No saved answers found. Try bookmarking some answers in the chat!", false);
                } else {
                    showToast(`Found ${data.answers.length} saved answers!`, false);
                    
                    // Debug each answer individually
                    data.answers.forEach((answer, index) => {
                        console.log(`Answer ${index + 1}:`, {
                            id: answer.id,
                            subject: answer.subject,
                            chapter: answer.chapter,
                            question: answer.question_identifier,
                            saveType: answer.save_type,
                            textLength: answer.answer_text ? answer.answer_text.length : 0
                        });
                        
                        // Check for missing or empty values
                        if (!answer.subject) console.error('Missing subject for answer:', answer.id);
                        if (!answer.chapter) console.error('Missing chapter for answer:', answer.id);
                        if (!answer.question_identifier) console.error('Missing question for answer:', answer.id);
                        
                        // Add fallback values for missing data to ensure it's displayed
                        const subject = answer.subject || 'Uncategorized';
                        const chapter = answer.chapter || 'General';
                        
                        // Initialize cache structure if needed
                        if (!this.savedAnswersCache[subject]) {
                            this.savedAnswersCache[subject] = {};
                        }
                        if (!this.savedAnswersCache[subject][chapter]) {
                            this.savedAnswersCache[subject][chapter] = [];
                        }
                        
                        // Add the answer to the cache
                        this.savedAnswersCache[subject][chapter].push(answer);
                    });
                }
                
                // Log structure for debugging
                console.log("Organized saved answers by subject/chapter:", 
                    Object.keys(this.savedAnswersCache).map(subject => ({
                        subject,
                        chapters: Object.keys(this.savedAnswersCache[subject]),
                        totalAnswers: Object.values(this.savedAnswersCache[subject])
                            .reduce((sum, answers) => sum + answers.length, 0)
                    }))
                );
            }
        } catch (error) {
            console.error('Error fetching saved answers:', error);
            showToast(`Error: ${error.message}`, true);
            this.savedAnswersCache = {};
        }
    }

    async loadSubjects() {
        try {
            if (!this.userGrade) {
                console.error("User grade not found");
                return;
            }
            
            console.log(`Loading subjects for grade: ${this.userGrade}`);
            const response = await fetch(`${window.apiBasePath}/api/navigation/subjects.php?grade=${this.userGrade}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server response:', errorText);
                throw new Error(`Failed to load subjects: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log("Loaded subjects:", data.subjects);
            
            // Clear existing content
            this.answersTree.innerHTML = '';
            
            if (data.subjects.length === 0) {
                this.answersTree.innerHTML = `
                    <div class="no-answers-message">
                        <p>No subjects found for your grade level.</p>
                        <p>Please contact support if you believe this is an error.</p>
                    </div>
                `;
                return;
            }
            
            // Make sure we include any subjects that have answers but might not be in the subjects list
            let allSubjects = [...data.subjects];
            
            // Add subjects from saved answers that might not be in the API response
            if (this.savedAnswersCache) {
                Object.keys(this.savedAnswersCache).forEach(subject => {
                    if (!allSubjects.includes(subject)) {
                        console.log(`Adding subject from saved answers: ${subject}`);
                        allSubjects.push(subject);
                    }
                });
            }
            
            // Show all subjects, not just those with answers
            console.log("Showing all subjects:", allSubjects);
            
            // Load all subjects regardless of whether they have answers
            await Promise.all(allSubjects.map(subject => this.loadSubjectData(subject)));
            
            // Add CSS for empty state messages
            const style = document.createElement('style');
            style.textContent = `
                .no-answers-message-chapter {
                    padding: 15px;
                    color: #666;
                    font-style: italic;
                    text-align: center;
                    background: rgba(200, 200, 200, 0.1);
                    border-radius: 4px;
                    margin: 10px 0;
                }
            `;
            document.head.appendChild(style);
            
            // Refresh expand/collapse state after loading all content
            this.refreshExpandCollapseState();
            
        } catch (error) {
            console.error('Error loading subjects:', error);
            showToast(`Error: ${error.message}`, true);
        }
    }

    async loadSubjectData(subject) {
        try {
            if (!subject) {
                console.error("Invalid subject provided to loadSubjectData");
                return;
            }
            
            console.log(`Loading chapters for subject: ${subject}`);

            // Check if we have saved answers for this subject
            const hasAnswersForSubject = this.savedAnswersCache && 
                                       this.savedAnswersCache[subject] && 
                                       Object.keys(this.savedAnswersCache[subject]).length > 0;
            
            console.log(`Subject ${subject} has answers: ${hasAnswersForSubject}`);
            
            // Get chapters from API
            let chaptersData;
            try {
                const chaptersResponse = await fetch(`${window.apiBasePath}/api/navigation/chapters.php?grade=${this.userGrade}&subject=${encodeURIComponent(subject)}`);
                if (!chaptersResponse.ok) {
                    const errorText = await chaptersResponse.text();
                    console.error('Server response for chapters:', errorText);
                    throw new Error(`Failed to load chapters: ${chaptersResponse.status} ${chaptersResponse.statusText}`);
                }
                chaptersData = await chaptersResponse.json();
                console.log(`Loaded ${chaptersData.chapters.length} chapters for ${subject}:`, chaptersData.chapters);
            } catch (error) {
                console.error(`Error fetching chapters for ${subject}:`, error);
                
                // If we have saved answers for this subject, continue with those chapters
                if (hasAnswersForSubject) {
                    chaptersData = { 
                        chapters: Object.keys(this.savedAnswersCache[subject]) 
                    };
                    console.log(`Using chapters from saved answers for ${subject}:`, chaptersData.chapters);
                } else {
                    // Skip this subject if we can't get chapters and have no saved answers
                    return;
                }
            }
            
            // Enhanced clean up of subject name - remove "chapters" and any chapter counters
            const cleanSubjectName = subject
                .replace(/\s*chapters$/i, '')  // Remove "chapters" at the end with optional space
                .replace(/\s*\(\d+\s*chapters?\)$/i, '')  // Remove "(X chapters)" pattern
                .replace(/\s*\(\d+\)$/i, '')  // Remove "(X)" pattern
                .trim();  // Remove any trailing spaces
            
            // Generate HTML for all subjects, even if they don't have answers
            console.log(`Generating HTML for subject: ${cleanSubjectName}`);
            
            // Get all chapters from both API and saved answers
            const chaptersFromApi = chaptersData.chapters || [];
            const chaptersFromSavedAnswers = hasAnswersForSubject ? 
                Object.keys(this.savedAnswersCache[subject]) : [];
            
            // Clean up and normalize chapter names to avoid duplicates with whitespace differences
            const normalizedChapters = new Map();
            
            // First add chapters with saved answers to ensure they're prioritized
            if (hasAnswersForSubject) {
                chaptersFromSavedAnswers.forEach(chapter => {
                    // Normalize chapter name by trimming and replacing multiple spaces with single space
                    const normalizedName = chapter.trim().replace(/\s+/g, ' ');
                    normalizedChapters.set(normalizedName, {
                        originalName: chapter,
                        hasAnswers: true,
                        answers: this.savedAnswersCache[subject][chapter]
                    });
                });
            }
            
            // Then add chapters from API if they don't conflict with saved answer chapters
            chaptersFromApi.forEach(chapter => {
                const normalizedName = chapter.trim().replace(/\s+/g, ' ');
                if (!normalizedChapters.has(normalizedName)) {
                    normalizedChapters.set(normalizedName, {
                        originalName: chapter,
                        hasAnswers: false,
                        answers: []
                    });
                }
            });
            
            // Use the normalized chapter map instead of raw arrays
            console.log(`Normalized chapters for ${cleanSubjectName}:`, Array.from(normalizedChapters.keys()));
            
            if (normalizedChapters.size === 0) {
                console.log(`No chapters found for ${cleanSubjectName}, skipping`);
                return;
            }
            
            const subjectHtml = `
                <div class="accordion-item">
                    <div class="accordion-header">
                        <div class="header-content">
                            <span class="subject-name">${cleanSubjectName}</span>
                        </div>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="accordion-content">
                        ${await this.generateChaptersHtml(subject, normalizedChapters)}
                    </div>
                </div>
            `;

            this.answersTree.innerHTML += subjectHtml;
            
            // Check expand state after adding each subject
            this.refreshExpandCollapseState();
            
        } catch (error) {
            console.error(`Error loading chapters for ${subject}:`, error);
            showToast(`Error loading chapters: ${error.message}`, true);
        }
    }

    generateChaptersHtml(subject, normalizedChapters) {
        let chaptersHtml = '';
        
        // Generate HTML for all chapters
        if (normalizedChapters.size === 0) {
            return '<div class="no-chapters-message">No chapters found for this subject.</div>';
        }
        
        // Use the normalized chapter information
        for (const [normalizedName, chapterInfo] of normalizedChapters) {
            const hasAnswers = chapterInfo.hasAnswers;
            const chapterAnswers = hasAnswers ? chapterInfo.answers : [];
            
            console.log(`Generating HTML for chapter ${normalizedName} with ${chapterAnswers.length} answers`);
            if (hasAnswers) {
                console.log('Chapter answers:', chapterAnswers.map(a => a.id));
                
                // Add data attribute to track that this chapter has answers
                const questionsHtml = this.generateQuestionsHtml(chapterAnswers);
                console.log(`Generated questions HTML for chapter ${normalizedName} (length: ${questionsHtml.length})`);
            
            chaptersHtml += `
                    <div class="chapter-item highlighted-chapter" data-has-answers="true" data-answer-count="${chapterAnswers.length}">
                    <div class="chapter-header">
                        <div class="header-content">
                            <div class="header-title">
                                    <span>${normalizedName}</span>
                                    <span class="answer-count">${chapterAnswers.length}</span>
                            </div>
                            <div class="header-actions">
                                <button class="toggle-section-btn" title="Expand/Collapse this chapter">
                                    <i class="fas fa-expand-alt"></i>
                                </button>
                                <i class="fas fa-chevron-right arrow"></i>
                            </div>
                        </div>
                    </div>
                    <div class="chapter-content">
                            ${questionsHtml}
                        </div>
                    </div>`;
            } else {
                chaptersHtml += `
                    <div class="chapter-item" data-has-answers="false">
                        <div class="chapter-header">
                            <div class="header-content">
                                <div class="header-title">
                                    <span>${normalizedName}</span>
                                </div>
                                <div class="header-actions">
                                    <button class="toggle-section-btn" title="Expand/Collapse this chapter">
                                        <i class="fas fa-expand-alt"></i>
                                    </button>
                                    <i class="fas fa-chevron-right arrow"></i>
                                </div>
                            </div>
                        </div>
                        <div class="chapter-content">
                            <div class="no-answers-message-chapter">No saved answers for this chapter yet.</div>
                    </div>
                </div>`;
            }
        }
        
        return chaptersHtml;
    }

    generateQuestionsHtml(answers) {
        if (!answers || answers.length === 0) {
            return '<div class="no-answers-message-chapter">No saved answers found.</div>';
        }
        
        console.log(`Generating HTML for ${answers.length} answers`);
        
        const MAX_PREVIEW_LENGTH = 150;
        
        // If we only have one answer, just show it directly
        if (answers.length === 1) {
            const answer = answers[0];
            console.log('Displaying single answer:', answer.id);
            
            // Create preview text (plain text)
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = answer.answer_text || '';
            const textContent = tempDiv.textContent || 'No content';
            const previewText = textContent.length > MAX_PREVIEW_LENGTH ? 
                textContent.substring(0, MAX_PREVIEW_LENGTH) + '...' : 
                textContent;
            
            // Use question_identifier or fallback
            const questionId = answer.question_identifier || 'Unnamed Question';
            
            return `
                <div class="question-item single-answer">
                    <div class="question-header">
                        <span>${questionId}</span>
                        <i class="fas fa-chevron-right arrow"></i>
                    </div>
                    <div class="question-content">
                        <div class="answer-item" data-id="${answer.id}" data-save-type="${answer.save_type || ''}" data-full-answer="${encodeURIComponent(answer.answer_text || '')}">
                            <div class="answer-header">
                                <span class="save-type-badge ${formatSaveTypeClass(answer.save_type)}">${answer.save_type || 'Question Related'}</span>
                                <span class="answer-date">${new Date(answer.created_at || Date.now()).toLocaleDateString()}</span>
                            </div>
                            <div class="answer-body">
                                ${previewText}
                            </div>
                            <button class="view-full-answer">View Full Answer</button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Group answers by question_identifier
        const groupedAnswers = answers.reduce((groups, answer) => {
            if (!answer.question_identifier) {
                console.warn('Answer missing question_identifier:', answer.id);
                const fallbackId = 'Unnamed Question';
                if (!groups[fallbackId]) {
                    groups[fallbackId] = [];
                }
                groups[fallbackId].push(answer);
                return groups;
            }
            
            if (!groups[answer.question_identifier]) {
                groups[answer.question_identifier] = [];
            }
            groups[answer.question_identifier].push(answer);
            return groups;
        }, {});
        
        console.log('Grouped answers by question:', Object.keys(groupedAnswers));
        
        return Object.entries(groupedAnswers).map(([questionId, questionAnswers]) => {
            console.log(`Question "${questionId}" has ${questionAnswers.length} answers`);
            
            const answersHtml = questionAnswers.map(answer => {
                // Create preview text (plain text)
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = answer.answer_text || '';
                const textContent = tempDiv.textContent || 'No content';
                const previewText = textContent.length > MAX_PREVIEW_LENGTH ? 
                    textContent.substring(0, MAX_PREVIEW_LENGTH) + '...' : 
                    textContent;
                
                return `
                    <div class="answer-item" data-id="${answer.id}" data-save-type="${answer.save_type || ''}" data-full-answer="${encodeURIComponent(answer.answer_text || '')}">
                        <div class="answer-header">
                            <span class="save-type-badge ${formatSaveTypeClass(answer.save_type)}">${answer.save_type || 'Question Related'}</span>
                            <span class="answer-date">${new Date(answer.created_at || Date.now()).toLocaleDateString()}</span>
                        </div>
                        <div class="answer-body">
                            ${previewText}
                        </div>
                        <button class="view-full-answer">View Full Answer</button>
                    </div>
                `;
            }).join('');

            return `
                <div class="question-item">
                    <div class="question-header">
                        <span>${questionId || 'Unnamed Question'}</span>
                        <i class="fas fa-chevron-right arrow"></i>
                    </div>
                    <div class="question-content">
                        ${answersHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    setupEventListeners() {
        // Toggle all sections button
        const toggleAllBtn = document.querySelector('.toggle-all-btn');
        let isExpanded = false;

        toggleAllBtn?.addEventListener('click', () => {
            isExpanded = !isExpanded;
            toggleAllBtn.classList.toggle('active');
            toggleAllBtn.innerHTML = isExpanded ? 
                '<i class="fas fa-compress-alt"></i>' : 
                '<i class="fas fa-expand-alt"></i>';
            
            // Enhanced implementation for the toggle all functionality
            console.log(`### GLOBAL EXPAND BUTTON CLICKED: ${isExpanded ? 'EXPANDING' : 'COLLAPSING'} ###`);
            
            // Add direct style rule to ensure content is visible when active
            if (isExpanded) {
                // Add inline style to force visibility
                console.log("Adding explicit display:block styles to ensure content visibility");
                
                const styleEl = document.createElement('style');
                styleEl.id = 'force-expand-styles';
                styleEl.textContent = `
                    .accordion-item.active > .accordion-content,
                    .chapter-item.active > .chapter-content,
                    .question-item.active > .question-content {
                        display: block !important;
                    }
                `;
                document.head.appendChild(styleEl);
            } else {
                // Remove the forced styles if we're collapsing
                const existingStyle = document.getElementById('force-expand-styles');
                if (existingStyle) {
                    existingStyle.remove();
                }
            }
            
            // Count elements before processing
            const subjectsBefore = document.querySelectorAll('.accordion-item').length;
            const chaptersBefore = document.querySelectorAll('.chapter-item').length;
            const questionsBefore = document.querySelectorAll('.question-item').length;
            const answersBefore = document.querySelectorAll('.answer-item').length;
            
            console.log(`Before toggle: ${subjectsBefore} subjects, ${chaptersBefore} chapters, ${questionsBefore} questions, ${answersBefore} answers`);
            
            // DEBUG: Check if any answers exist at all
            const allAnswers = document.querySelectorAll('.answer-item');
            console.log(`Found ${allAnswers.length} total answers in the DOM:`);
            allAnswers.forEach((answer, i) => {
                const id = answer.dataset.id;
                const saveType = answer.dataset.saveType;
                const question = answer.closest('.question-item')?.querySelector('.question-header span')?.textContent;
                const chapter = answer.closest('.chapter-item')?.querySelector('.chapter-header .header-content span')?.textContent;
                const subject = answer.closest('.accordion-item')?.querySelector('.subject-name')?.textContent;
                
                console.log(`Answer ${i+1}: ID=${id}, Subject=${subject}, Chapter=${chapter}, Question=${question}, Type=${saveType}`);
            });
            
            // First toggle all subject-level items
            document.querySelectorAll('.accordion-item').forEach((item, i) => {
                const subjectName = item.querySelector('.subject-name')?.textContent;
                console.log(`Toggling subject ${i+1}: ${subjectName}`);
                
                if (isExpanded) {
                    item.classList.add('active');
                    console.log(`  - Expanded subject: ${subjectName}`);
                } else {
                    item.classList.remove('active');
                    console.log(`  - Collapsed subject: ${subjectName}`);
                }
            });
            
            // Then toggle all chapter-level items with proper icon updates
            document.querySelectorAll('.chapter-item').forEach((chapter, i) => {
                const chapterName = chapter.querySelector('.chapter-header .header-content span')?.textContent;
                const hasAnswers = chapter.querySelector('.answer-count') !== null;
                console.log(`Toggling chapter ${i+1}: ${chapterName} (has answers: ${hasAnswers})`);
                
                if (isExpanded) {
                    // Check chapter content BEFORE expanding
                    const contentBefore = chapter.querySelector('.chapter-content').innerHTML;
                    const hasNoAnswersMsg = contentBefore.includes('No saved answers');
                    console.log(`  - Chapter content BEFORE expanding: ${hasNoAnswersMsg ? 'Shows "No saved answers"' : 'Has answer content'}`);
                    
                    chapter.classList.add('active');
                    
                    // Check chapter content AFTER expanding
                    const contentAfter = chapter.querySelector('.chapter-content').innerHTML;
                    const hasNoAnswersMsgAfter = contentAfter.includes('No saved answers');
                    console.log(`  - Chapter content AFTER expanding: ${hasNoAnswersMsgAfter ? 'Shows "No saved answers"' : 'Has answer content'}`);
                    
                    const toggleBtn = chapter.querySelector('.toggle-section-btn');
                    if (toggleBtn) {
                        toggleBtn.innerHTML = '<i class="fas fa-compress-alt"></i>';
                        toggleBtn.classList.add('active');
                    }
                } else {
                    chapter.classList.remove('active');
                    const toggleBtn = chapter.querySelector('.toggle-section-btn');
                    if (toggleBtn) {
                        toggleBtn.innerHTML = '<i class="fas fa-expand-alt"></i>';
                        toggleBtn.classList.remove('active');
                    }
                }
            });
            
            // Finally toggle all question-level items
            document.querySelectorAll('.question-item').forEach((question, i) => {
                const questionText = question.querySelector('.question-header span')?.textContent;
                console.log(`Toggling question ${i+1}: ${questionText}`);
                
                if (isExpanded) {
                    question.classList.add('active');
                    // Check question content visibility
                    const content = question.querySelector('.question-content');
                    const isDisplayed = window.getComputedStyle(content).display !== 'none';
                    console.log(`  - Question content visible after expanding: ${isDisplayed}`);
                } else {
                    question.classList.remove('active');
                }
            });
            
            // Count elements after processing and check display state
            const subjectsAfter = document.querySelectorAll('.accordion-item.active').length;
            const chaptersAfter = document.querySelectorAll('.chapter-item.active').length;
            const questionsAfter = document.querySelectorAll('.question-item.active').length;
            
            console.log(`After toggle: ${subjectsAfter}/${subjectsBefore} subjects active, ${chaptersAfter}/${chaptersBefore} chapters active, ${questionsAfter}/${questionsBefore} questions active`);
            
            // DEBUG: Check if any "No saved answers" messages are showing when they shouldn't
            if (isExpanded) {
                document.querySelectorAll('.chapter-item.active').forEach((chapter, i) => {
                    const chapterName = chapter.querySelector('.chapter-header .header-content span')?.textContent;
                    const hasAnswersBadge = chapter.querySelector('.answer-count') !== null;
                    const content = chapter.querySelector('.chapter-content');
                    const hasNoAnswersMsg = content.innerHTML.includes('No saved answers');
                    
                    if (hasAnswersBadge && hasNoAnswersMsg) {
                        console.error(`INCONSISTENCY: Chapter "${chapterName}" has answer count badge but shows "No saved answers" message`);
                        console.log(`Chapter HTML:`, chapter.outerHTML);
                    }
                });
            }

            // Add scroll handling for expanded content
            if (isExpanded) {
                // After toggling everything open, ensure the page can scroll to the bottom
                setTimeout(() => {
                    // Calculate the total height of all expanded content
                    const totalExpandedHeight = Array.from(document.querySelectorAll('.chapter-content'))
                        .reduce((sum, el) => sum + el.scrollHeight, 0);
                    
                    console.log(`Total expanded content height: ${totalExpandedHeight}px`);
                    
                    // Adjust container height if needed
                    const answersTree = document.querySelector('.answers-tree');
                    if (answersTree) {
                        // Ensure the container can accommodate all expanded content
                        answersTree.style.paddingBottom = '150px';
                        console.log("Added padding to ensure scrollability to bottom content");
                        
                        // Force a reflow to ensure proper layout after expansion
                        document.body.offsetHeight;
                        
                        // Check for any potentially invisible elements
                        const lastChapters = document.querySelectorAll('.accordion-item:last-child .chapter-item');
                        if (lastChapters.length > 0) {
                            console.log(`Found ${lastChapters.length} chapters in last subject, verifying visibility...`);
                            lastChapters.forEach((chapter, i) => {
                                const rect = chapter.getBoundingClientRect();
                                console.log(`Last subject, chapter ${i+1}: visible=${rect.top < window.innerHeight}, position=${rect.top}px from top`);
                            });
                        }
                    }
                }, 300); // Small delay to ensure DOM has updated
            } else {
                // Reset padding when collapsing
                const answersTree = document.querySelector('.answers-tree');
                if (answersTree) {
                    answersTree.style.paddingBottom = '';
                }
                
                // Remove the forced styles from before
                const existingStyle = document.getElementById('force-expand-styles');
                if (existingStyle) {
                    existingStyle.remove();
                }
            }
        });

        // Use event delegation for accordion functionality
        // This ensures events work for dynamically added content
        this.answersTree.addEventListener('click', (e) => {
            // Subject level accordion
            if (e.target.closest('.accordion-header')) {
                const accordionItem = e.target.closest('.accordion-item');
                accordionItem.classList.toggle('active');
                e.stopPropagation();
                return;
            }

            // Chapter level accordion
            if (e.target.closest('.chapter-header')) {
                const chapterItem = e.target.closest('.chapter-item');
                chapterItem.classList.toggle('active');
                e.stopPropagation();
                return;
            }

            // Question level accordion
            if (e.target.closest('.question-header')) {
                const questionItem = e.target.closest('.question-item');
                questionItem.classList.toggle('active');
                e.stopPropagation();
                return;
            }

            // View full answer button
            if (e.target.closest('.view-full-answer')) {
                const answerItem = e.target.closest('.answer-item');
                const questionItem = answerItem.closest('.question-item');
                
                // Get all answers in the current chapter for navigation
                const chapterItem = questionItem.closest('.chapter-item');
                this.currentAnswers = Array.from(chapterItem.querySelectorAll('.answer-item'));
                this.currentIndex = this.currentAnswers.indexOf(answerItem);
                
                this.openModal(answerItem);
                e.stopPropagation();
                return;
            }
        });

        // Modal navigation
        document.querySelector('.navigation-buttons')?.addEventListener('click', (e) => {
            const navBtn = e.target.closest('.nav-btn');
            if (!navBtn) return;

            if (navBtn.classList.contains('prev-btn') && this.currentIndex > 0) {
                this.currentIndex--;
                this.updateModalContent();
            } else if (navBtn.classList.contains('next-btn') && this.currentIndex < this.currentAnswers.length - 1) {
                this.currentIndex++;
                this.updateModalContent();
            }
        });

        // Close modal
        document.querySelector('.close-modal')?.addEventListener('click', () => {
            if (this.modal) {
            this.modal.style.display = 'none';
            document.body.style.overflow = 'auto';
            }
        });
    }

    // Private method to decode HTML entities
    decodeHtml(html) {
        const txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
    }

    openModal(answerItem) {
        if (!answerItem || !this.modal) {
            console.error('Cannot open modal: Missing answer item or modal element');
            return;
        }

        try {
        const questionItem = answerItem.closest('.question-item');
            const chapterItem = questionItem?.closest('.chapter-item');
            const accordionItem = chapterItem?.closest('.accordion-item');

            if (!questionItem || !chapterItem || !accordionItem) {
                console.error('Cannot find question, chapter or subject elements');
                return;
            }

            const subject = accordionItem.querySelector('.subject-name')?.textContent || 'Unknown Subject';
            const chapter = chapterItem.querySelector('.chapter-header .header-content span')?.textContent || 'Unknown Chapter';
            const question = questionItem.querySelector('.question-header span')?.textContent || 'Unknown Question';
            const saveType = answerItem.dataset.saveType || 'question_related';
        const answerId = answerItem.dataset.id;

            if (!answerId) {
                console.warn('Answer ID not found in dataset');
                showToast('Error: Cannot identify this answer. Please try again.', true);
                return;
            }

        console.log('Opening modal for answer:', answerId, 'with save type:', saveType);

        // Decode the stored full answer
            const fullAnswer = this.decodeHtml(decodeURIComponent(answerItem.dataset.fullAnswer || ''));

        // Update modal content
            const modalTitle = document.querySelector('.modal-title h3');
            const answerMeta = document.querySelector('.answer-meta');
            const questionSection = document.querySelector('.question-section h4');
            const answerText = document.querySelector('.answer-text');
            const saveBtn = document.querySelector('.save-btn');

            if (modalTitle) modalTitle.textContent = 'Saved Answer';
            if (answerMeta) answerMeta.textContent = `${subject} > ${chapter}`;
            if (questionSection) questionSection.textContent = question;
            if (answerText) {
                answerText.innerHTML = `
            <div class="formatted-content">
                ${fullAnswer}
            </div>
        `;
            }

        // Set the answer ID in the save button for the save type handler
            if (saveBtn) {
        saveBtn.setAttribute('data-answer-id', answerId);
                console.log('Set data-answer-id attribute on save button:', saveBtn.getAttribute('data-answer-id'));
            } else {
                console.error('Save button not found in the modal');
            }
        
        // Update the save type handler with the current answer ID
        if (window.saveTypeHandler) {
            console.log('Setting current answer ID in save type handler:', answerId);
            window.saveTypeHandler.setCurrentAnswerId(answerId);
            window.saveTypeHandler.updateButtonText(saveType || 'Question Related');
                
                // Verify the answer ID was set correctly
                console.log('Verifying save type handler has correct answer ID:', 
                    window.saveTypeHandler.currentAnswerId === answerId ? 'OK' : 'FAILED');
        } else {
                console.error('Save type handler not found. The page may be missing required JavaScript.');
                showToast('Error: Save type handler not initialized. Please refresh the page.', true);
        }

        // Update navigation buttons state
            const prevBtn = document.querySelector('.prev-btn');
            const nextBtn = document.querySelector('.next-btn');
            
            if (prevBtn) prevBtn.disabled = this.currentIndex === 0;
            if (nextBtn) nextBtn.disabled = this.currentIndex === this.currentAnswers.length - 1;

        // Show modal and prevent body scroll
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        } catch (error) {
            console.error('Error opening modal:', error);
            showToast('Error opening answer details. Please try again.', true);
        }
    }

    updateModalContent() {
        const answerItem = this.currentAnswers[this.currentIndex];
        this.openModal(answerItem);
    }

    openModalFromData(answer) {
        if (!answer) return;

        // Clean up subject name by removing " chapters" if present
        // const cleanSubjectName = answer.subject ? answer.subject.replace(/\s+chapters$/i, '') : '';
        
        // Enhanced clean up of subject name - remove "chapters" and any chapter counters
        const cleanSubjectName = answer.subject ? 
            answer.subject
                .replace(/\s*chapters$/i, '')  // Remove "chapters" at the end with optional space
                .replace(/\s*\(\d+\s*chapters?\)$/i, '')  // Remove "(X chapters)" pattern
                .replace(/\s*\(\d+\)$/i, '')  // Remove "(X)" pattern
                .trim() : '';  // Remove any trailing spaces


        // Update modal content directly from answer data
        document.querySelector('.modal-title h3').textContent = 'Saved Answer';
        document.querySelector('.answer-meta').textContent = 
            `${cleanSubjectName} > ${answer.chapter || ''}`;
        document.querySelector('.question-section h4').textContent = 
            answer.question_identifier || '';
        
        // Safely parse the answer text
        // const answerText = answer.answer_text || '';
        // const formattedAnswer = marked.parse(answerText);
        
        document.querySelector('.answer-text').innerHTML = `            <div class="formatted-content">
                ${answer.answer_text || ''}
            </div>
        `;

        // Update save type and navigation buttons
        const saveBtn = document.querySelector('.save-btn');
        saveBtn.textContent = answer.save_type || 'Question Related';
        
        // Update navigation state
        document.querySelector('.nav-btn:first-child').disabled = this.currentIndex === 0;
        document.querySelector('.nav-btn:last-child').disabled = 
            this.currentIndex === this.currentAnswers.length - 1;
    }

    // Add this new method to the SavedAnswersManager class
    refreshExpandCollapseState() {
        console.log("### REFRESHING EXPAND/COLLAPSE STATE ###");
        
        // Get the toggle all button
        const toggleAllBtn = document.querySelector('.toggle-all-btn');
        if (!toggleAllBtn) {
            console.error("Toggle all button not found");
            return;
        }
        
        // Check if it's currently in expanded state
        const isExpanded = toggleAllBtn.classList.contains('active');
        console.log(`Current global expand state: ${isExpanded ? 'EXPANDED' : 'COLLAPSED'}`);
        
        if (isExpanded) {
            // Re-apply expansion to all elements
            console.log("Re-applying expanded state to all elements");
            
            // Count elements before processing
            const subjectsBefore = document.querySelectorAll('.accordion-item').length;
            const chaptersBefore = document.querySelectorAll('.chapter-item').length;
            const questionsBefore = document.querySelectorAll('.question-item').length;
            
            console.log(`Before refresh: ${subjectsBefore} subjects, ${chaptersBefore} chapters, ${questionsBefore} questions`);
            
            // First open all subjects
            document.querySelectorAll('.accordion-item').forEach((item, i) => {
                const subjectName = item.querySelector('.subject-name')?.textContent;
                console.log(`Setting subject ${i+1} (${subjectName}) to active`);
                item.classList.add('active');
            });
            
            // Then open all chapters
            document.querySelectorAll('.chapter-item').forEach((chapter, i) => {
                const chapterName = chapter.querySelector('.chapter-header .header-content span')?.textContent;
                const hasAnswers = chapter.querySelector('.answer-count') !== null;
                console.log(`Setting chapter ${i+1} (${chapterName}) to active (has answers: ${hasAnswers})`);
                
                // Check chapter content BEFORE setting active
                const contentBefore = chapter.querySelector('.chapter-content').innerHTML;
                const hasNoAnswersMsg = contentBefore.includes('No saved answers');
                console.log(`  - Chapter content BEFORE: ${hasNoAnswersMsg ? 'Shows "No saved answers"' : 'Has answer content'}`);
                
                chapter.classList.add('active');
                
                // Check chapter content AFTER setting active
                const contentAfter = chapter.querySelector('.chapter-content').innerHTML;
                const hasNoAnswersMsgAfter = contentAfter.includes('No saved answers');
                console.log(`  - Chapter content AFTER: ${hasNoAnswersMsgAfter ? 'Shows "No saved answers"' : 'Has answer content'}`);
                
                const toggleBtn = chapter.querySelector('.toggle-section-btn');
                if (toggleBtn) {
                    toggleBtn.innerHTML = '<i class="fas fa-compress-alt"></i>';
                    toggleBtn.classList.add('active');
                }
            });
            
            // Finally open all questions
            document.querySelectorAll('.question-item').forEach((question, i) => {
                const questionText = question.querySelector('.question-header span')?.textContent;
                console.log(`Setting question ${i+1} (${questionText}) to active`);
                question.classList.add('active');
                
                // Check question content visibility
                const content = question.querySelector('.question-content');
                const isDisplayed = window.getComputedStyle(content).display !== 'none';
                console.log(`  - Question content visible: ${isDisplayed}`);
            });
            
            // Count elements after processing 
            const subjectsAfter = document.querySelectorAll('.accordion-item.active').length;
            const chaptersAfter = document.querySelectorAll('.chapter-item.active').length;
            const questionsAfter = document.querySelectorAll('.question-item.active').length;
            
            console.log(`After refresh: ${subjectsAfter}/${subjectsBefore} subjects active, ${chaptersAfter}/${chaptersBefore} chapters active, ${questionsAfter}/${questionsBefore} questions active`);
        }
    }
}

// Add this to saved_answers.js
class FilterManager {
    constructor() {
        this.userGrade = localStorage.getItem('userGrade');
        
        // Fix selector to match the actual HTML classes in the document
        this.subjectSelect = document.querySelector('.subject-select');
        this.chapterSelect = document.querySelector('.chapter-select');
        
        // If elements aren't found, try alternative selectors (for compatibility)
        if (!this.subjectSelect) {
            console.log("Subject select not found with .subject-select, trying alternative selector");
            this.subjectSelect = document.querySelectorAll('.filter-select')[0];
        }
        
        if (!this.chapterSelect) {
            console.log("Chapter select not found with .chapter-select, trying alternative selector");
            this.chapterSelect = document.querySelectorAll('.filter-select')[1];
        }
        
        if (this.subjectSelect && this.chapterSelect) {
            console.log("Filter selects found:", { 
                subject: this.subjectSelect, 
                chapter: this.chapterSelect 
            });
        this.init();
        } else {
            console.error("Could not find subject or chapter select elements:", {
                subjectSelect: this.subjectSelect,
                chapterSelect: this.chapterSelect
            });
        }
    }

    async init() {
        await this.loadSubjects();
        this.setupEventListeners();
    }

    async loadSubjects() {
        try {
            if (!this.userGrade) {
                console.error("User grade not found in localStorage");
                return;
            }
            
            const response = await fetch(`${window.apiBasePath}/api/navigation/subjects.php?grade=${this.userGrade}`);
            if (!response.ok) {
                throw new Error(`Failed to load subjects: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log("Loaded subjects data:", data);
            
            // Populate subject filter
            this.subjectSelect.innerHTML = '<option value="">All Subjects</option>';
            data.subjects.forEach(subject => {
                // Enhanced clean up of subject name - remove "chapters" and any chapter counters
                const cleanSubjectName = subject
                    .replace(/\s*chapters$/i, '')  // Remove "chapters" at the end with optional space
                    .replace(/\s*\(\d+\s*chapters?\)$/i, '')  // Remove "(X chapters)" pattern
                    .replace(/\s*\(\d+\)$/i, '')  // Remove "(X)" pattern
                    .trim();  // Remove any trailing spaces
                
                // Keep the original subject name as the value for API calls, but display the clean name
                this.subjectSelect.innerHTML += `<option value="${subject}">${cleanSubjectName}</option>`;
            });
        } catch (error) {
            console.error('Error loading subjects:', error);
            // Show toast message to user
            showToast(`Failed to load subjects: ${error.message}`, true);
        }
    }

    async loadChapters(subject) {
        try {
            if (!this.userGrade) {
                console.error("User grade not found in localStorage");
                return;
            }
            
            console.log(`Loading chapters for subject: ${subject}`);
            const response = await fetch(`${window.apiBasePath}/api/navigation/chapters.php?grade=${this.userGrade}&subject=${encodeURIComponent(subject)}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load chapters: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log("Loaded chapters data:", data);
            
            // Populate chapter filter
            this.chapterSelect.innerHTML = '<option value="">All Chapters</option>';
            data.chapters.forEach(chapter => {
                this.chapterSelect.innerHTML += `<option value="${chapter}">${chapter}</option>`;
            });
        } catch (error) {
            console.error('Error loading chapters:', error);
            // Show toast message to user
            showToast(`Failed to load chapters: ${error.message}`, true);
        }
    }

    setupEventListeners() {
        // When subject changes, load corresponding chapters
        this.subjectSelect.addEventListener('change', (e) => {
            const subject = e.target.value;
            console.log(`Subject changed to: ${subject}`);
            
            if (subject) {
                this.loadChapters(subject);
            } else {
                // Reset chapter select if "All Subjects" is chosen
                this.chapterSelect.innerHTML = '<option value="">All Chapters</option>';
            }
        });
    }
}

// Initialize when the page loads - using a single event listener for both managers
document.addEventListener('DOMContentLoaded', () => {
    // SavedAnswersManager is already initialized in the main DOMContentLoaded event
    const filterManager = new FilterManager();
});


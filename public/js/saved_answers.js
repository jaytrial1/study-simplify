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

document.addEventListener('DOMContentLoaded', () => {
    // Add new chat button handler
    document.querySelector('.new-chat-btn')?.addEventListener('click', () => {
        window.location.href = `${window.apiBasePath}/public/html/chatbot.html`;
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

    console.log("Using global API base path in saved_answers.js:", window.apiBasePath);
    
    // Initialize the saved answers manager
    const savedAnswersManager = new SavedAnswersManager();
    savedAnswersManager.init();
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

// Toggle all sections
const toggleAllBtn = document.querySelector('.toggle-all-btn');
let isExpanded = false;

toggleAllBtn.addEventListener('click', () => {
    isExpanded = !isExpanded;
    toggleAllBtn.classList.toggle('active');
    toggleAllBtn.innerHTML = isExpanded ? 
        '<i class="fas fa-compress-alt"></i>' : 
        '<i class="fas fa-expand-alt"></i>';
    
    // Toggle all sections
    document.querySelectorAll('.accordion-item, .chapter-item, .question-item').forEach(item => {
        if (isExpanded) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
});

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
        const subjectHeader = subject.querySelector('.accordion-header span').textContent.toLowerCase();
        const chapters = subject.querySelectorAll('.chapter-item');
        let subjectHasMatch = false;
        
        // Check if subject matches filters
        const subjectMatches = !selectedSubject || subjectHeader.includes(selectedSubject);
        
        chapters.forEach(chapter => {
            const chapterHeader = chapter.querySelector('.chapter-header span').textContent.toLowerCase();
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
            .find(item => item.querySelector('.accordion-header span')
                .textContent.toLowerCase().includes(subject.toLowerCase()));
            
        if (subjectElement) {
            const chapters = Array.from(subjectElement.querySelectorAll('.chapter-header span'))
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
            const formattedAnswer = marked.parse(rawAnswer || '');
            
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
    const subject = questionItem.closest('.accordion-item').querySelector('.accordion-header span').textContent;
    const chapter = questionItem.closest('.chapter-item').querySelector('.chapter-header span').textContent;
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
        this.apiBasePath = window.apiBasePath || '';
        
        // Initialize properties
        this.userGrade = localStorage.getItem('userGrade');
        this.userId = localStorage.getItem('user_id');
        this.savedAnswers = [];
        this.subjectChapterMap = new Map();
        this.allSubjects = new Set();
        this.allChapters = new Set();
        
        // DOM elements
        this.answersContainer = document.querySelector('.answers-tree');
        this.subjectSelect = document.querySelector('.subject-select');
        this.chapterSelect = document.querySelector('.chapter-select');
        this.searchInput = document.querySelector('.search-input');
        this.expandAllButton = document.querySelector('.toggle-all-btn');
        this.clearFiltersButton = document.querySelector('.clear-filters');
    }
    
    init() {
        this.setupEventListeners();
        this.loadSavedAnswers();
    }
    
    async loadSavedAnswers() {
        try {
            const userId = localStorage.getItem('user_id');
            if (!userId) {
                window.location.href = 'login.html';
                return;
            }
            
            // Load saved answers data based on current grade and filters
            const url = `${this.apiBasePath}/api/saved-answers/saved_answers.php?grade=${encodeURIComponent(this.userGrade)}&user_id=${encodeURIComponent(userId)}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Server response:', errorData);
                throw new Error(errorData.error || 'Failed to fetch saved answers');
            }

            const data = await response.json();
            console.log('Received saved answers:', data);
            
            // Group answers by subject and chapter
            this.savedAnswersCache = {};
            if (data.answers && Array.isArray(data.answers)) {
                data.answers.forEach(answer => {
                    if (!this.savedAnswersCache[answer.subject]) {
                        this.savedAnswersCache[answer.subject] = {};
                    }
                    if (!this.savedAnswersCache[answer.subject][answer.chapter]) {
                        this.savedAnswersCache[answer.subject][answer.chapter] = [];
                    }
                    this.savedAnswersCache[answer.subject][answer.chapter].push(answer);
                });
            }
        } catch (error) {
            console.error('Error loading saved answers:', error);
            this.savedAnswersCache = {};
        }
    }
    
    async loadSubjects() {
        try {
            const response = await fetch(`${this.apiBasePath}/api/navigation/subjects.php?grade=${this.userGrade}`);
            const data = await response.json();
            
            // Populate subject filter
            this.subjectSelect.innerHTML = '<option value="">All Subjects</option>';
            data.subjects.forEach(subject => {
                this.subjectSelect.innerHTML += `<option value="${subject}">${subject}</option>`;
            });
        } catch (error) {
            console.error('Error loading subjects:', error);
        }
    }
    
    async loadChapters(subject) {
        try {
            const chaptersResponse = await fetch(`${this.apiBasePath}/api/navigation/chapters.php?grade=${this.userGrade}&subject=${subject}`);
            const data = await chaptersResponse.json();
            
            // Populate chapter filter
            this.chapterSelect.innerHTML = '<option value="">All Chapters</option>';
            data.chapters.forEach(chapter => {
                this.chapterSelect.innerHTML += `<option value="${chapter}">${chapter}</option>`;
            });
        } catch (error) {
            console.error('Error loading chapters:', error);
        }
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
            
            document.querySelectorAll('.accordion-item, .chapter-item, .question-item').forEach(item => {
                if (isExpanded) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });
        });

        // Subject level accordion
        this.answersContainer.addEventListener('click', (e) => {
            const accordionHeader = e.target.closest('.accordion-header');
            if (accordionHeader) {
                const accordionItem = accordionHeader.closest('.accordion-item');
                accordionItem.classList.toggle('active');
                e.stopPropagation();
            }

            // Chapter level accordion
            const chapterHeader = e.target.closest('.chapter-header');
            if (chapterHeader) {
                const chapterItem = chapterHeader.closest('.chapter-item');
                chapterItem.classList.toggle('active');
                e.stopPropagation();
            }

            // Question level accordion
            const questionHeader = e.target.closest('.question-header');
            if (questionHeader) {
                const questionItem = questionHeader.closest('.question-item');
                questionItem.classList.toggle('active');
                e.stopPropagation();
            }

            // Individual toggle buttons
            const toggleBtn = e.target.closest('.toggle-section-btn');
            if (toggleBtn) {
                const section = toggleBtn.closest('.accordion-item, .chapter-item');
                const isExpanded = section.classList.contains('active');
                
                toggleBtn.innerHTML = isExpanded ? 
                    '<i class="fas fa-expand-alt"></i>' : 
                    '<i class="fas fa-compress-alt"></i>';
                e.stopPropagation();
            }
        });

        // Add modal-related event listeners
        this.answersContainer.addEventListener('click', (e) => {
            const viewFullBtn = e.target.closest('.view-full-answer');
            if (viewFullBtn) {
                const answerItem = viewFullBtn.closest('.answer-item');
                const questionItem = answerItem.closest('.question-item');
                
                // Get all answers in the current chapter for navigation
                const chapterItem = questionItem.closest('.chapter-item');
                this.currentAnswers = Array.from(chapterItem.querySelectorAll('.answer-item'));
                this.currentIndex = this.currentAnswers.indexOf(answerItem);
                
                this.openModal(answerItem);
            }
        });

        // Modal navigation
        document.querySelector('.navigation-buttons').addEventListener('click', (e) => {
            const navBtn = e.target.closest('.nav-btn');
            if (!navBtn) return;

            if (navBtn.textContent.includes('Previous') && this.currentIndex > 0) {
                this.currentIndex--;
                this.updateModalContent();
            } else if (navBtn.textContent.includes('Next') && this.currentIndex < this.currentAnswers.length - 1) {
                this.currentIndex++;
                this.updateModalContent();
            }
        });

        // Close modal
        document.querySelector('.close-modal').addEventListener('click', () => {
            this.modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }

    // Private method to decode HTML entities
    decodeHtml(html) {
        const txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
    }

    openModal(answerItem) {
        const questionItem = answerItem.closest('.question-item');
        const subject = questionItem.closest('.accordion-item').querySelector('.header-title span').textContent;
        const chapter = questionItem.closest('.chapter-item').querySelector('.header-title span').textContent;
        const question = questionItem.querySelector('.question-header span').textContent;
        const saveType = answerItem.dataset.saveType;
        const answerId = answerItem.dataset.id;

        console.log('Opening modal for answer:', answerId, 'with save type:', saveType);

        // Decode the stored full answer
        const fullAnswer = this.decodeHtml(decodeURIComponent(answerItem.dataset.fullAnswer));

        // Update modal content
        document.querySelector('.modal-title h3').textContent = 'Saved Answer';
        document.querySelector('.answer-meta').textContent = `${subject} > ${chapter}`;
        document.querySelector('.question-section h4').textContent = question;
        document.querySelector('.answer-text').innerHTML = `
            <div class="formatted-content">
                ${fullAnswer}
            </div>
        `;

        // Set the answer ID in the save button for the save type handler
        const saveBtn = document.querySelector('.save-btn');
        saveBtn.setAttribute('data-answer-id', answerId);
        
        // Update the save type handler with the current answer ID
        if (window.saveTypeHandler) {
            console.log('Setting current answer ID in save type handler:', answerId);
            window.saveTypeHandler.setCurrentAnswerId(answerId);
            window.saveTypeHandler.updateButtonText(saveType || 'Question Related');
        } else {
            console.warn('Save type handler not found');
        }

        // Update navigation buttons state
        document.querySelector('.prev-btn').disabled = this.currentIndex === 0;
        document.querySelector('.next-btn').disabled = this.currentIndex === this.currentAnswers.length - 1;

        // Show modal and prevent body scroll
        this.modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    updateModalContent() {
        const answerItem = this.currentAnswers[this.currentIndex];
        this.openModal(answerItem);
    }

    openModalFromData(answer) {
        if (!answer) return;

        // Update modal content directly from answer data
        document.querySelector('.modal-title h3').textContent = 'Saved Answer';
        document.querySelector('.answer-meta').textContent = 
            `${answer.subject || ''} > ${answer.chapter || ''}`;
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
}

// Add this to saved_answers.js
class FilterManager {
    constructor() {
        this.userGrade = localStorage.getItem('userGrade');
        this.subjectSelect = document.querySelector('.subject-select');
        this.chapterSelect = document.querySelector('.chapter-select');
        
        // Use the global apiBasePath
        this.apiBasePath = window.apiBasePath || '';
        
        this.init();
    }

    async init() {
        await this.loadSubjects();
        this.setupEventListeners();
    }

    async loadSubjects() {
        try {
            const response = await fetch(`${this.apiBasePath}/api/navigation/subjects.php?grade=${this.userGrade}`);
            const data = await response.json();
            
            // Populate subject filter
            this.subjectSelect.innerHTML = '<option value="">All Subjects</option>';
            data.subjects.forEach(subject => {
                this.subjectSelect.innerHTML += `<option value="${subject}">${subject}</option>`;
            });
        } catch (error) {
            console.error('Error loading subjects:', error);
        }
    }

    async loadChapters(subject) {
        try {
            const response = await fetch(`${this.apiBasePath}/api/navigation/chapters.php?grade=${this.userGrade}&subject=${subject}`);
            const data = await response.json();
            
            // Populate chapter filter
            this.chapterSelect.innerHTML = '<option value="">All Chapters</option>';
            data.chapters.forEach(chapter => {
                this.chapterSelect.innerHTML += `<option value="${chapter}">${chapter}</option>`;
            });
        } catch (error) {
            console.error('Error loading chapters:', error);
        }
    }

    setupEventListeners() {
        // When subject changes, load corresponding chapters
        this.subjectSelect.addEventListener('change', (e) => {
            const subject = e.target.value;
            if (subject) {
                this.loadChapters(subject);
            } else {
                // Reset chapter select if "All Subjects" is chosen
                this.chapterSelect.innerHTML = '<option value="">All Chapters</option>';
            }
        });
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    const filterManager = new FilterManager();
});


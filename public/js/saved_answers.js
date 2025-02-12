document.addEventListener('DOMContentLoaded', () => {
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
        updateModalContent();
    });
});

function updateModalContent() {
    const answerItem = currentAnswers[currentIndex];
    const questionItem = answerItem.closest('.question-item');
    
    // Get hierarchy from DOM
    const subject = questionItem.closest('.accordion-item').querySelector('.accordion-header span').textContent;
    const chapter = questionItem.closest('.chapter-item').querySelector('.chapter-header span').textContent;
    const question = questionItem.querySelector('.question-header span').textContent;

    // Update modal content
    document.querySelector('.modal-title h3').textContent = 'Saved Answer';
    document.querySelector('.answer-meta').textContent = `${subject} > ${chapter}`;
    document.querySelector('.question-section h4').textContent = question;
    document.querySelector('.answer-text').textContent = answerItem.dataset.fullAnswer;

    // Update navigation state
    document.querySelector('.nav-btn:first-child').disabled = currentIndex === 0;
    document.querySelector('.nav-btn:last-child').disabled = currentIndex === currentAnswers.length - 1;
}

document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('answerModal').classList.remove('active');
    document.body.style.overflow = '';
});

// Save type dropdown with current selection
const saveTypeBtn = document.querySelector('.save-type-dropdown .action-btn');
const dropdownContent = document.querySelector('.dropdown-content');

// Update button text to show current selection
function updateSaveTypeButton(text) {
    saveTypeBtn.innerHTML = `
        <i class="fas fa-bookmark"></i>
        ${text} <i class="fas fa-chevron-down"></i>
    `;
}

saveTypeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownContent.classList.toggle('active');
});

document.querySelectorAll('.dropdown-content a').forEach(option => {
    option.addEventListener('click', (e) => {
        e.preventDefault();
        const newType = e.target.textContent;
        document.querySelectorAll('.dropdown-content a').forEach(a => a.classList.remove('active'));
        option.classList.add('active');
        updateSaveTypeButton(newType);
        dropdownContent.classList.remove('active');
    });
});

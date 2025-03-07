document.addEventListener('DOMContentLoaded', () => {
    // Get UI elements
    const searchToggle = document.querySelector('.search-toggle');
    const filterToggle = document.querySelector('.filter-toggle');
    const searchPanel = document.querySelector('.history-search-panel');
    const filterPanel = document.querySelector('.history-filters');
    const searchInput = document.querySelector('.history-search');
    const subjectFilter = document.querySelector('.subject-filter');
    const chapterFilter = document.querySelector('.chapter-filter');
    const historyItems = document.querySelector('.history-items');
    const clearFiltersBtn = document.querySelector('.clear-filters-btn');

    // Check if we're on the chatbot page (where history features are available)
    // If elements don't exist, exit early
    if (!searchToggle || !searchPanel || !historyItems) {
        console.log('Chat history elements not found - likely on a different page');
        return;
    }

    // Toggle search panel
    searchToggle.addEventListener('click', () => {
        searchPanel.classList.toggle('active');
        if (!searchPanel.classList.contains('active')) {
            filterPanel.classList.remove('active');
        }
    });

    // Toggle filters
    if (filterToggle && filterPanel) {
        filterToggle.addEventListener('click', () => {
            filterPanel.classList.toggle('active');
        });
    }

    // Real-time search
    let debounceTimer;
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                filterHistoryItems();
            }, 300);
        });
    }

    // Filter changes
    if (subjectFilter) {
        subjectFilter.addEventListener('change', filterHistoryItems);
    }
    
    if (chapterFilter) {
        chapterFilter.addEventListener('change', filterHistoryItems);
    }

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (subjectFilter) subjectFilter.value = '';
            if (chapterFilter) chapterFilter.value = '';
            filterHistoryItems();
            
            // On mobile, close the filter panel after clearing
            if (window.innerWidth <= 768 && filterPanel) {
                filterPanel.classList.remove('active');
            }
        });
    }

    function filterHistoryItems() {
        if (!historyItems) return;
        
        const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
        const selectedSubject = subjectFilter ? subjectFilter.value : '';
        const selectedChapter = chapterFilter ? chapterFilter.value : '';

        const items = historyItems.querySelectorAll('.history-item');
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            const subject = item.dataset.subject;
            const chapter = item.dataset.chapter;
            
            const matchesSearch = text.includes(searchTerm);
            const matchesSubject = !selectedSubject || subject === selectedSubject;
            const matchesChapter = !selectedChapter || chapter === selectedChapter;

            item.style.display = 
                matchesSearch && matchesSubject && matchesChapter ? 'flex' : 'none';
        });
    }

    // Populate filters with available options
    function populateFilters() {
        if (!historyItems || !subjectFilter || !chapterFilter) return;
        
        const subjects = new Set();
        const chapters = new Set();

        document.querySelectorAll('.history-item').forEach(item => {
            if (item.dataset.subject) subjects.add(item.dataset.subject);
            if (item.dataset.chapter) chapters.add(item.dataset.chapter);
        });

        subjects.forEach(subject => {
            const option = new Option(subject, subject);
            subjectFilter.add(option);
        });

        chapters.forEach(chapter => {
            const option = new Option(chapter, chapter);
            chapterFilter.add(option);
        });
    }

    // Only populate filters if we're on the chatbot page
    if (historyItems && subjectFilter && chapterFilter) {
        populateFilters();
    }
});

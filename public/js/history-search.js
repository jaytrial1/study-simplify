document.addEventListener('DOMContentLoaded', () => {
    const searchToggle = document.querySelector('.search-toggle');
    const filterToggle = document.querySelector('.filter-toggle');
    const searchPanel = document.querySelector('.history-search-panel');
    const filterPanel = document.querySelector('.history-filters');
    const searchInput = document.querySelector('.history-search');
    const subjectFilter = document.querySelector('.subject-filter');
    const chapterFilter = document.querySelector('.chapter-filter');
    const historyItems = document.querySelector('.history-items');
    const clearFiltersBtn = document.querySelector('.clear-filters-btn');

    // Toggle search panel
    searchToggle.addEventListener('click', () => {
        searchPanel.classList.toggle('active');
        if (!searchPanel.classList.contains('active')) {
            filterPanel.classList.remove('active');
        }
    });

    // Toggle filters
    filterToggle.addEventListener('click', () => {
        filterPanel.classList.toggle('active');
    });

    // Real-time search
    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            filterHistoryItems();
        }, 300);
    });

    // Filter changes
    subjectFilter.addEventListener('change', filterHistoryItems);
    chapterFilter.addEventListener('change', filterHistoryItems);

    clearFiltersBtn.addEventListener('click', () => {
        searchInput.value = '';
        subjectFilter.value = '';
        chapterFilter.value = '';
        filterHistoryItems();
        
        // On mobile, close the filter panel after clearing
        if (window.innerWidth <= 768) {
            filterPanel.classList.remove('active');
        }
    });

    function filterHistoryItems() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedSubject = subjectFilter.value;
        const selectedChapter = chapterFilter.value;

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

    populateFilters();
});

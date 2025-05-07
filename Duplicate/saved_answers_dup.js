// Add this function at the top of the file
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
    
    // --- ADD IMAGE BLOCK HANDLING (from script.js) ---
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
    // ... existing code ...
    
    return {
        markdown: processed,
        chartData: chartData
    };
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
    document.querySelector('.new-chat-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Navigate to chatbot page
        window.location.href = `${window.apiBasePath}/public/html/chatbot.html`;
        
        // The rest of the functionality will be handled by the script in chatbot.html
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
            background-color: color-mix(in srgb, var(--color-gray-light) 93%, var(--color-white));
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .no-answers-message p {
            margin: 10px 0;
            color: var(--color-secondary);
        }
        
        .no-chapters-message, .no-answers-message-chapter {
            padding: 15px;
            color: var(--color-muted-blue);
            font-style: italic;
            text-align: center;
            background: color-mix(in srgb, var(--color-accent) 35%, var(--color-black));
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
            background-color: color-mix(in srgb, var(--color-accent) 80%, var(--color-black)); /* Default blue for all badges */
            color: var(--color-white);
        }
        
        .save-type-badge.best-response,
        .save-type-badge.best_response {
            background-color: var(--color-success);
        }
        
        .save-type-badge.question-related,
        .save-type-badge.question_related {
            background-color: var(--color-success);
        }
        
        .save-type-badge.important {
            background-color: var(--color-warning);
        }
        
        .save-type-badge.exam-related,
        .save-type-badge.exam_related {
            background-color: #9C27B0;
        }
        
        .answer-date {
            font-size: 0.75rem;
            color: color-mix(in srgb, var(--color-accent) 60%, var(--color-white));
        }
        
        .answer-item {
            margin-bottom: 15px;
            padding: 12px;
            border-radius: 8px;
            background-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-black));
            border: 1px solid color-mix(in srgb, var(--color-accent) 40%, var(--color-black));
        }
        
        .answer-body {
            margin-bottom: 10px;
            color: var(--color-secondary);
            font-size: 0.9rem;
            line-height: 1.4;
        }
        
        .view-full-answer {
            background-color: color-mix(in srgb, var(--color-accent) 50%, var(--color-black));
            color: var(--color-white);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8rem;
        }
        
        .view-full-answer:hover {
            background-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-black));
        }
        
        /* New styles for better visibility */
        .answer-count {
            background-color: color-mix(in srgb, var(--color-accent) 60%, var(--color-black));
            color: var(--color-white);
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
        
        /* Subject (outermost) - bright blue */
        .accordion-header {
            border: 1px solid var(--color-accent);
            background-color: color-mix(in srgb, var(--color-accent) 80%, var(--color-black));
            border-radius: 4px;
            color: var(--color-white);
            padding: 15px 15px;
        }
        /* When active, make it slightly darker */
        .accordion-item.active > .accordion-header {
            background-color: color-mix(in srgb, var(--color-accent) 80%, var(--color-black));
        }
        
        /* Chapter - much darker */
        .chapter-item {
            background-color: color-mix(in srgb, var(--color-accent) 60%, var(--color-black));
        }
        .chapter-header {
            background-color: color-mix(in srgb, var(--color-accent) 60%, var(--color-black));
            color: var(--color-white);
        }
        .chapter-item.active > .chapter-header {
            background-color: color-mix(in srgb, var(--color-accent) 70%, var(--color-black));
        }
        
        /* Topic/Question - even darker */
        .question-item {
            background-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-black));
        }
        .question-header {
            background-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-black));
            color: var(--color-white);
        }
        .question-item.active > .question-header {
            background-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-black));
        }
        
        /* Answer - darkest, blending with background */
        .answer-item {
            background-color: color-mix(in srgb, var(--color-accent) 20%, var(--color-black));
            border: 1px solid color-mix(in srgb, var(--color-accent) 20%, var(--color-black));
        }
        
        .accordion-content, .chapter-content, .question-content {
            display: none;
            padding: 10px;
            border-radius: 0 0 4px 4px;
            background: transparent;
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
            background-color: color-mix(in srgb, var(--color-accent) 60%, var(--color-black));
            border: none;
            color: var(--color-white);
            border-radius: 4px;
            padding: 2px 6px;
            cursor: pointer;
        }
        .toggle-section-btn:hover {
            background-color: color-mix(in srgb, var(--color-accent) 70%, var(--color-black));
        }
        /* Highlight chapters with saved answers */
        .highlighted-chapter {
            border-left: 3px solid color-mix(in srgb, var(--color-accent) 60%, var(--color-black));
            background-color: color-mix(in srgb, var(--color-accent) 60%, var(--color-black));
        }
        .highlighted-chapter .chapter-header {
            background-color: color-mix(in srgb, var(--color-accent) 70%, var(--color-black));
        }
        .highlighted-chapter.active .chapter-header {
            background-color: color-mix(in srgb, var(--color-accent) 80%, var(--color-black));
        }
        body, html {
            height: 100%;
            max-height: 100%;
            overflow-x: hidden;
        }
        main {
            min-height: 100%;
            padding-bottom: 80px;
            position: relative;
        }
        .answers-container {
            overflow-y: auto;
            position: relative;
        }
        .answers-tree {
            margin-bottom: 100px;
        }
        .accordion-content {
            max-height: none !important;
        }
        footer {
            position: relative;
            z-index: 10;
        }
        .toggle-all-btn.active ~ .answers-tree {
            padding-bottom: 150px;
        }
        .accordion-header i,
        .accordion-header .toggle-section-btn {
            color: var(--color-white);
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
                    formattedAnswer = marked.parse(processedMarkdown.markdown);
                } else {
                    console.warn('Marked library not fully loaded, displaying raw text');
                    formattedAnswer = `<pre>${processedMarkdown.markdown}</pre>`;
                }
            } catch (error) {
                console.error('Error parsing markdown:', error);
                formattedAnswer = `<pre>${processedMarkdown.markdown}</pre>`;
            }
            
            updateModalContent();
            
            // Update the answer text with formatted content
            const answerTextElement = document.querySelector('.answer-text');
            answerTextElement.innerHTML = `
                <div class="formatted-content">
                    ${formattedAnswer}
                </div>
            `;
            
            // Render LaTeX expressions with MathJax if available
            if (typeof MathJax !== 'undefined') {
                try {
                    // Use typesetPromise for better performance
                    MathJax.typesetPromise([answerTextElement]).then(() => {
                        // After MathJax has rendered, wrap equation blocks in scrollable container
                        const displayMath = answerTextElement.querySelectorAll('.MathJax');
                        displayMath.forEach(mathElement => {
                            // Skip if already wrapped
                            if (mathElement.closest('.scrollable-wrapper')) {
                                return;
                            }
                            
                            // Check if it's a display equation (block equation)
                            // We should wrap all display math elements to ensure proper scrolling
                            const rect = mathElement.getBoundingClientRect();
                            const isDisplayEquation = rect.width > 200 || mathElement.getAttribute('display') === 'block';
                            
                            if (isDisplayEquation || rect.width > answerTextElement.clientWidth * 0.7) {
                                // Create scrollable wrapper
                                const wrapper = document.createElement('div');
                                wrapper.classList.add('scrollable-wrapper');
                                // Use separate properties for overflow-x and overflow-y instead of shorthand
                                wrapper.style.overflowY = 'visible'; // Ensure vertical visibility
                                wrapper.style.overflowX = 'auto';    // Enable horizontal scroll on wrapper
                                
                                // Replace equation with wrapper containing equation
                                mathElement.parentNode.insertBefore(wrapper, mathElement);
                                wrapper.appendChild(mathElement);
                                
                                // Ensure MathJax element can wrap or expand naturally.
                                // mathElement.style.display = 'inline-block'; // Removed
                                // mathElement.style.width = 'auto'; // Removed
                                // mathElement.style.maxWidth = 'none'; // Removed
                            }
                        });
                    }).catch((err) => {
                        console.error('MathJax typesetting error:', err);
                    });
                } catch (error) {
                    console.error('Error rendering LaTeX with MathJax:', error);
                }
            }
        }
    });
});

// Also add a function to wrap tables in scrollable wrappers
function wrapTablesInScrollableContainers(element) {
    if (!element) return;
    
    // Find all tables
    const tables = element.querySelectorAll('table');
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
}

// Function to enhance code blocks and render charts
function enhanceCodeBlocks(messageElement, chartData) {
    if (!messageElement) return;
    
    console.log('Enhancing code blocks and charts for element:', messageElement);
    
    // Process code blocks if needed
    const codeBlocks = messageElement.querySelectorAll('pre code');
    codeBlocks.forEach(codeBlock => {
        // Process code blocks if needed
    });

    // Wrap tables in scrollable wrapper
    wrapTablesInScrollableContainers(messageElement);
    
    // Get chart data either from passed parameter or from the dataset
    let finalChartData = chartData;
    
    // If no chart data passed but element has chartData in dataset, use that
    if ((!finalChartData || finalChartData.length === 0) && messageElement.dataset.chartData) {
        try {
            console.log('Trying to parse chart data from dataset');
            finalChartData = JSON.parse(messageElement.dataset.chartData);
            console.log('Successfully parsed chart data from dataset:', finalChartData);
        } catch (error) {
            console.error('Error parsing chart data from dataset:', error);
            finalChartData = [];
        }
    }
    
    // Process chart placeholders
    const chartPlaceholders = messageElement.querySelectorAll('.chart-placeholder');
    console.log('Found chart placeholders:', chartPlaceholders.length, 'Chart data available:', finalChartData ? finalChartData.length : 0);
    
    if (!finalChartData || finalChartData.length === 0) {
        console.log('No chart data found in parameter or dataset');
        if (chartPlaceholders.length > 0) {
            chartPlaceholders.forEach(placeholder => {
                placeholder.innerHTML = '<div class="chart-error">No chart data available</div>';
            });
        }
        // return; // <--- REMOVING THIS LINE
    }
    
    chartPlaceholders.forEach(placeholder => {
        // Clear any existing content to prevent duplicates
        placeholder.innerHTML = '';
        
        const chartIndex = parseInt(placeholder.getAttribute('data-chart-index'));
        console.log('Processing chart at index:', chartIndex);
        
        if (!finalChartData[chartIndex]) {
            console.log('No chart data available at index:', chartIndex);
            placeholder.innerHTML = '<div class="chart-error">No chart data available</div>';
            return;
        }
        
        const chartConfig = finalChartData[chartIndex];
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
        chartContainer.style.height = '300px'; // Set a fixed height
        chartContainer.style.width = '100%';
        chartContainer.style.maxWidth = '600px'; // Set a maximum width
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
                aspectRatio: 2, // Set a reasonable aspect ratio
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
    // --- REMOVED MATHJAX LOGIC FROM HERE ---
    // The MathJax typesetting will now be handled in the calling function (e.g., updateModalContent) 
    // after enhanceCodeBlocks is finished.

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

function updateModalContent() {
    const answerItem = currentAnswers[currentIndex];
    const questionItem = answerItem.closest('.question-item');
    
    // Get hierarchy from DOM
    const subject = questionItem.closest('.accordion-item').querySelector('.subject-name').textContent;
    const chapter = questionItem.closest('.chapter-item').querySelector('.chapter-header .header-content span').textContent;
    const question = questionItem.querySelector('.question-header span').textContent;

    // Get the full answer text
    const rawAnswer = decodeURIComponent(answerItem.dataset.fullAnswer || '');

    // Process markdown content first (extracts charts, ensures string)
    const processedResult = preprocessMarkdown(rawAnswer);
    let markdownToParse = processedResult.markdown;
    const chartData = processedResult.chartData;

    // --- BEGIN MathJax Protection ---
    const mathPlaceholders = {};
    let placeholderIndex = 0;

    // Protect block math $$...$$
    const blockMathPattern = /(?<!`)((?<!`)\\$\\$([\\s\\S]*?)\\$\\$(?!`))/g;
    markdownToParse = markdownToParse.replace(blockMathPattern, (match) => {
        const placeholder = `__MATHJAX_BLOCK_${placeholderIndex}__`;
        mathPlaceholders[placeholder] = match;
        placeholderIndex++;
        return placeholder;
    });

    // Protect inline math $...$
    const inlineMathPattern = /(?<!`|\\$)((?<!`)\\$([^\\$\\n`]+?)\\$(?![\\$`]))/g;
     markdownToParse = markdownToParse.replace(inlineMathPattern, (match) => {
        const placeholder = `__MATHJAX_INLINE_${placeholderIndex}__`;
        mathPlaceholders[placeholder] = match;
        placeholderIndex++;
        return placeholder;
    });
    // --- END MathJax Protection ---


    // Convert Markdown (with placeholders) to HTML using marked.js
    let formattedAnswer = '';
    try {
        if (typeof marked !== 'undefined' && marked) {
            formattedAnswer = marked.parse(markdownToParse); // Parse the string with placeholders
        } else {
            console.warn('Marked library not fully loaded, displaying raw text');
            // If marked fails, still restore math placeholders in the raw text
            Object.keys(mathPlaceholders).forEach(placeholder => {
                 markdownToParse = markdownToParse.replace(placeholder, mathPlaceholders[placeholder]);
            });
            formattedAnswer = `<pre>${markdownToParse}</pre>`; // Use the restored markdown
        }
    } catch (error) {
        console.error('Error parsing markdown:', error);
         // If marked errors, still restore math placeholders in the raw text
        Object.keys(mathPlaceholders).forEach(placeholder => {
             markdownToParse = markdownToParse.replace(placeholder, mathPlaceholders[placeholder]);
        });
        formattedAnswer = `<pre>${markdownToParse}</pre>`; // Use the restored markdown
    }

    // --- BEGIN Restore MathJax ---
    // Replace placeholders with original math content in the final HTML
    Object.keys(mathPlaceholders).forEach(placeholder => {
        // Use a function with replace to handle potential special characters in the placeholder key
        const regex = new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\\\$&'), 'g'); // Escape regex special chars
        formattedAnswer = formattedAnswer.replace(regex, () => mathPlaceholders[placeholder]);
    });
    // --- END Restore MathJax ---

    // Update modal content
    document.querySelector('.modal-title h3').textContent = 'Saved Answer';
    document.querySelector('.answer-meta').textContent = `${subject} > ${chapter}`;
    document.querySelector('.question-section h4').textContent = question;

    const answerTextElement = document.querySelector('.answer-text');
    answerTextElement.innerHTML = `
        <div class="formatted-content">
            ${formattedAnswer}
        </div>
    `;

    // Store chart data in the element's dataset if available
    if (chartData && chartData.length > 0) {
        answerTextElement.dataset.chartData = JSON.stringify(chartData);
    }

    // Enhance code blocks, render charts, AND RENDER MATHJAX
    enhanceCodeBlocks(answerTextElement, chartData); // This function already calls MathJax.typesetPromise

    // --- BEGIN Reinstated MathJax Rendering & Wrapping ---
    // Render LaTeX expressions with MathJax if available
    if (typeof MathJax !== 'undefined') {
        try {
            // Use typesetPromise for better performance
            MathJax.typesetPromise([answerTextElement]).then(() => {
                console.log("MathJax typesetting complete for modal.");
                // After MathJax has rendered, wrap equation blocks in scrollable container
                const displayMath = answerTextElement.querySelectorAll('.MathJax, mjx-container[display="true"]');
                console.log(`Found ${displayMath.length} MathJax elements to check for wrapping.`);
                
                displayMath.forEach((mathElement, index) => {
                    // Skip if already wrapped
                    if (mathElement.closest('.scrollable-wrapper')) {
                        console.log(`Skipping MathJax element ${index + 1} (already wrapped).`);
                        return;
                    }

                    // Check if it's a display equation (block equation)
                    // MathJax v3 uses mjx-container[display="true"]
                    const isDisplayEquation = mathElement.tagName === 'MJX-CONTAINER' && mathElement.getAttribute('display') === 'true';
                    const clientWidth = answerTextElement.clientWidth;
                    const mathWidth = mathElement.offsetWidth; // Use offsetWidth for actual rendered width
                    
                    console.log(`Checking MathJax element ${index + 1}: Display=${isDisplayEquation}, Width=${mathWidth}, ContainerWidth=${clientWidth}`);

                    // Wrap if it's a display equation OR if its width exceeds 90% of the container width
                    if (isDisplayEquation || mathWidth > clientWidth * 0.9) {
                        console.log(`Wrapping MathJax element ${index + 1}.`);
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
                    } else {
                         console.log(`Skipping MathJax element ${index + 1} (inline or not wide enough).`);
                    }
                });
            }).catch((err) => {
                console.error('MathJax typesetting error in modal:', err);
            });
        } catch (error) {
            console.error('Error initiating MathJax typesetting or wrapping in modal:', error);
        }
    }
     // --- END Reinstated MathJax Rendering & Wrapping ---

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
                            <p>Long press at any of the ai answer that you like to save for the futuer for quick revision.</p>
                            <p>there are 2 type of save</p>
                            <p>1. save response - save the response is good for you to revise for your exams</p>
                            <p>2. question related - save the respose whcih is not your answer of quetsion, but help you to remember that answer</p>
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
                    color: #bcbcbc;
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
        
        const MAX_PREVIEW_LENGTH = 150; // Restored from 60 to 150 characters as requested
        
        // If we only have one answer, just show it directly
        if (answers.length === 1) {
            const answer = answers[0];
            console.log('Displaying single answer:', answer.id);
            
            // Process markdown content first
            const processedResult = preprocessMarkdown(answer.answer_text || '');
            let markdownToParse = processedResult.markdown;
            
            // Convert Markdown to HTML using marked.js
            let formattedAnswer = '';
            try {
                if (typeof marked !== 'undefined' && marked) {
                    formattedAnswer = marked.parse(markdownToParse);
                } else {
                    console.warn('Marked library not fully loaded, displaying raw text');
                    formattedAnswer = `<pre>${markdownToParse}</pre>`;
                }
            } catch (error) {
                console.error('Error parsing markdown:', error);
                formattedAnswer = `<pre>${markdownToParse}</pre>`;
            }
            
            // Create preview text from HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = formattedAnswer;
            const hasImageCard = tempDiv.querySelector('.ai-image-card');
            let previewHtml;
            if (hasImageCard) {
                // Handle images with text preview and indicator
                const textContent = tempDiv.textContent || 'No content';
                previewHtml = textContent.length > MAX_PREVIEW_LENGTH ? 
                    textContent.substring(0, MAX_PREVIEW_LENGTH) + '... 📷' : 
                    textContent + ' 📷';
            } else {
                const textContent = tempDiv.textContent || 'No content';
                previewHtml = textContent.length > MAX_PREVIEW_LENGTH ? 
                    textContent.substring(0, MAX_PREVIEW_LENGTH) + '...' : 
                    textContent;
            }
            
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
                                ${previewHtml}
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
                // Process markdown content first
                const processedResult = preprocessMarkdown(answer.answer_text || '');
                let markdownToParse = processedResult.markdown;
                
                // Convert Markdown to HTML using marked.js
                let formattedAnswer = '';
                try {
                    if (typeof marked !== 'undefined' && marked) {
                        formattedAnswer = marked.parse(markdownToParse);
                    } else {
                        console.warn('Marked library not fully loaded, displaying raw text');
                        formattedAnswer = `<pre>${markdownToParse}</pre>`;
                    }
                } catch (error) {
                    console.error('Error parsing markdown:', error);
                    formattedAnswer = `<pre>${markdownToParse}</pre>`;
                }
                
                // Create preview text from HTML
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = formattedAnswer;
                const hasImageCard = tempDiv.querySelector('.ai-image-card');
                let previewHtml;
                if (hasImageCard) {
                    // Handle images with text preview and indicator
                    const textContent = tempDiv.textContent || 'No content';
                    previewHtml = textContent.length > MAX_PREVIEW_LENGTH ? 
                        textContent.substring(0, MAX_PREVIEW_LENGTH) + '... 📷' : 
                        textContent + ' 📷';
                } else {
                    const textContent = tempDiv.textContent || 'No content';
                    previewHtml = textContent.length > MAX_PREVIEW_LENGTH ? 
                        textContent.substring(0, MAX_PREVIEW_LENGTH) + '...' : 
                        textContent;
                }
                
                return `
                    <div class="answer-item" data-id="${answer.id}" data-save-type="${answer.save_type || ''}" data-full-answer="${encodeURIComponent(answer.answer_text || '')}">
                        <div class="answer-header">
                            <span class="save-type-badge ${formatSaveTypeClass(answer.save_type)}">${answer.save_type || 'Question Related'}</span>
                            <span class="answer-date">${new Date(answer.created_at || Date.now()).toLocaleDateString()}</span>
                        </div>
                        <div class="answer-body">
                            ${previewHtml}
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
                showToast('Error displaying answer context. Please refresh.', true);
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

            // === BEGIN CONSOLIDATED PROCESSING LOGIC ===
            // Decode the stored full answer
            const rawAnswer = this.decodeHtml(decodeURIComponent(answerItem.dataset.fullAnswer || ''));

            // Process markdown content first (extracts charts, ensures string)
            const processedResult = preprocessMarkdown(rawAnswer);
            let markdownToParse = processedResult.markdown;
            const chartData = processedResult.chartData;

            // Protect MathJax delimiters
            const mathPlaceholders = {};
            let placeholderIndex = 0;
            const blockMathPattern = /(?<!`)((?<!`)\\$\\$([\\s\\S]*?)\\$\\$(?!`))/g;
            markdownToParse = markdownToParse.replace(blockMathPattern, (match) => {
                const placeholder = `__MATHJAX_BLOCK_${placeholderIndex}__`;
                mathPlaceholders[placeholder] = match;
                placeholderIndex++;
                return placeholder;
            });
            const inlineMathPattern = /(?<!`|\\$)((?<!`)\\$([^\\$\\n`]+?)\\$(?![\\$`]))/g;
            markdownToParse = markdownToParse.replace(inlineMathPattern, (match) => {
                const placeholder = `__MATHJAX_INLINE_${placeholderIndex}__`;
                mathPlaceholders[placeholder] = match;
                placeholderIndex++;
                return placeholder;
            });

            // Convert Markdown (with placeholders) to HTML
            let formattedAnswer = '';
            try {
                if (typeof marked !== 'undefined' && marked) {
                    formattedAnswer = marked.parse(markdownToParse);
                } else {
                    console.warn('Marked library not fully loaded, displaying raw text');
                    Object.keys(mathPlaceholders).forEach(placeholder => {
                        markdownToParse = markdownToParse.replace(placeholder, mathPlaceholders[placeholder]);
                    });
                    formattedAnswer = `<pre>${markdownToParse}</pre>`;
                }
            } catch (error) {
                console.error('Error parsing markdown:', error);
                Object.keys(mathPlaceholders).forEach(placeholder => {
                    markdownToParse = markdownToParse.replace(placeholder, mathPlaceholders[placeholder]);
                });
                formattedAnswer = `<pre>${markdownToParse}</pre>`;
            }

            // Restore MathJax placeholders in the HTML
            Object.keys(mathPlaceholders).forEach(placeholder => {
                const regex = new RegExp(placeholder.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\\\$&'), 'g');
                formattedAnswer = formattedAnswer.replace(regex, () => mathPlaceholders[placeholder]);
            });

            // Update modal DOM elements
            const modalTitle = document.querySelector('.modal-title h3');
            const answerMeta = document.querySelector('.answer-meta');
            const questionSection = document.querySelector('.question-section h4');
            const answerTextElement = document.querySelector('.answer-text'); // Renamed from answerText
            const saveBtn = document.querySelector('.save-btn');

            if (modalTitle) modalTitle.textContent = 'Saved Answer';
            if (answerMeta) answerMeta.textContent = `${subject} > ${chapter}`;
            if (questionSection) questionSection.textContent = question;

            // Set the final HTML content
            if (answerTextElement) {
                answerTextElement.innerHTML = `
                    <div class="formatted-content">
                        ${formattedAnswer}
                    </div>
                `;

                // Store chart data in the element's dataset if available
                if (chartData && chartData.length > 0) {
                    answerTextElement.dataset.chartData = JSON.stringify(chartData);
                }

                // Enhance code blocks and render charts (MathJax removed from here)
                enhanceCodeBlocks(answerTextElement, chartData);

                // Render LaTeX expressions with MathJax and wrap if necessary
                if (typeof MathJax !== 'undefined') {
                    try {
                        MathJax.typesetPromise([answerTextElement]).then(() => {
                            console.log("MathJax typesetting complete for modal.");
                            const displayMath = answerTextElement.querySelectorAll('.MathJax, mjx-container[display="true"]');
                            console.log(`Found ${displayMath.length} MathJax elements to check for wrapping.`);
                            displayMath.forEach((mathElement, index) => {
                                if (mathElement.closest('.scrollable-wrapper')) {
                                    console.log(`Skipping MathJax element ${index + 1} (already wrapped).`);
                                    return;
                                }
                                const isDisplayEquation = mathElement.tagName === 'MJX-CONTAINER' && mathElement.getAttribute('display') === 'true';
                                const clientWidth = answerTextElement.clientWidth;
                                const mathWidth = mathElement.offsetWidth;
                                console.log(`Checking MathJax element ${index + 1}: Display=${isDisplayEquation}, Width=${mathWidth}, ContainerWidth=${clientWidth}`);
                                if (isDisplayEquation || mathWidth > clientWidth * 0.9) {
                                    console.log(`Wrapping MathJax element ${index + 1}.`);
                                    const wrapper = document.createElement('div');
                                    wrapper.classList.add('scrollable-wrapper');
                                    mathElement.parentNode.insertBefore(wrapper, mathElement);
                                    wrapper.appendChild(mathElement);
                                    mathElement.style.maxWidth = '100%';
                                    mathElement.style.overflowX = 'auto';
                                } else {
                                    console.log(`Skipping MathJax element ${index + 1} (inline or not wide enough).`);
                                }
                            });
                        }).catch((err) => {
                            console.error('MathJax typesetting error in modal:', err);
                        });
                    } catch (error) {
                        console.error('Error initiating MathJax typesetting or wrapping in modal:', error);
                    }
                }
            }
            // === END CONSOLIDATED PROCESSING LOGIC ===

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
                console.log('Verifying save type handler has correct answer ID:',
                    window.saveTypeHandler.currentAnswerId === answerId ? 'OK' : 'FAILED');
            } else {
                console.error('Save type handler not found.');
                showToast('Error: Save type handler not initialized.', true);
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
            // Ensure modal is hidden and scrolling restored on error
             if (this.modal) this.modal.style.display = 'none';
             document.body.style.overflow = 'auto';
        }
    }

    updateModalContent() {
        // This function now correctly calls openModal which contains the full logic
        const answerItem = this.currentAnswers[this.currentIndex];
        if (answerItem) {
            this.openModal(answerItem);
        } else {
             console.error("Cannot update modal content: current answer item not found at index", this.currentIndex);
             showToast("Error navigating answers. Please close and reopen.", true);
        }
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
        
        // Process markdown content first
        const answerText = answer.answer_text || '';
        const processedMarkdown = preprocessMarkdown(answerText);
        
        // Convert Markdown to HTML using marked.js with failsafe
        let formattedAnswer = '';
        try {
            if (typeof marked !== 'undefined' && marked) {
                formattedAnswer = marked.parse(processedMarkdown.markdown);
            } else {
                console.warn('Marked library not fully loaded, displaying raw text');
                formattedAnswer = `<pre>${processedMarkdown.markdown}</pre>`;
            }
        } catch (error) {
            console.error('Error parsing markdown:', error);
            formattedAnswer = `<pre>${processedMarkdown.markdown}</pre>`;
        }
        
        const answerTextElement = document.querySelector('.answer-text');
        answerTextElement.innerHTML = `            <div class="formatted-content">
                ${formattedAnswer}
            </div>
        `;
        
        // Store chart data in the element's dataset if available
        if (processedMarkdown.chartData && processedMarkdown.chartData.length > 0) {
            answerTextElement.dataset.chartData = JSON.stringify(processedMarkdown.chartData);
        }
        
        // Enhance code blocks and render charts
        enhanceCodeBlocks(answerTextElement, processedMarkdown.chartData);

        // Update save type and navigation buttons
        const saveBtn = document.querySelector('.save-btn');
        saveBtn.textContent = answer.save_type || 'Question Related';
        
        // Update navigation state
        document.querySelector('.nav-btn:first-child').disabled = this.currentIndex === 0;
        document.querySelector('.nav-btn:last-child').disabled = 
            this.currentIndex === this.currentAnswers.length - 1;
            
        // Show modal
        if (this.modal) {
            this.modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
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



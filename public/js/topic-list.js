// Topic List Handler
// This file handles the loading and displaying of topic headers from markdown files

// Global variables
let topicListData = null;

// Function to load the topic list data
async function loadTopicList(grade, subject, chapter) {
    try {
        // Always use window.apiBasePath from the global context
        console.log("Loading topic list with path:", window.apiBasePath);
        
        // Build the request URL
        const requestUrl = `${window.apiBasePath}/api/navigation/topic_list.php?grade=${encodeURIComponent(grade)}&subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}`;
        console.log("Topic list request URL:", requestUrl);
        
        // Fetch topic list data with authentication
        const response = await fetch(requestUrl, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        // Log response status
        console.log("Topic list response status:", response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Topic list data received:", data);
        
        // Store the data globally
        topicListData = data;
        
        return data;
    } catch (error) {
        console.error('Error loading topic list:', error);
        return { found: false, topics: [] };
    }
}

// Function to find topic data by name (case insensitive)
function findTopicByName(topicName) {
    if (!topicListData || !topicListData.topics) {
        return null;
    }
    
    // Normalize the topic name for comparison (remove .md, lowercase, trim)
    const normalizedName = topicName.replace(/\.md$/i, '').toLowerCase().trim();
    
    // Find the topic in the list
    return topicListData.topics.find(topic => 
        topic.name.toLowerCase().trim() === normalizedName
    );
}

// Function to create a topic button with header previews
function createTopicButtonWithPreview(question, topicData) {
    // Clean up question text - remove leading slash if present
    let displayText = question;
    
    if (displayText.startsWith('/')) {
        displayText = displayText.substring(1).trim();
    }
    
    // Create container for the button and preview
    const container = document.createElement('div');
    container.className = 'topic-container';
    
    // Create the button
    const topicButton = document.createElement('button');
    topicButton.className = 'topic-button';
    topicButton.textContent = displayText;
    topicButton.dataset.question = question;
    topicButton.setAttribute('type', 'button');
    
    // Add button to container
    container.appendChild(topicButton);
    
    // Add header points if we have them
    if (topicData && topicData.bullets && topicData.bullets.length > 0) {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'topic-preview';
        
        // Add bullet points
        const bulletList = document.createElement('ul');
        bulletList.className = 'bullet-list';
        
        // Sort bullets by their original position in the document
        const sortedBullets = [...topicData.bullets].sort((a, b) => a.position - b.position);
        
        sortedBullets.forEach(bullet => {
            const bulletItem = document.createElement('li');
            bulletItem.className = `bullet-level-${bullet.level}`;
            bulletItem.textContent = bullet.text;
            bulletList.appendChild(bulletItem);
        });
        
        previewContainer.appendChild(bulletList);
        container.appendChild(previewContainer);
    } else {
        // If no bullets, make the button have rounded corners on all sides
        topicButton.style.borderRadius = '8px';
    }
    
    return container;
}

// Function to render topic list
function renderTopicList(topicButtonsContainer, questions, topicListData) {
    // Sort questions alphabetically
    questions.sort((a, b) => {
        // Remove leading slash if present for sorting
        const textA = a.startsWith('/') ? a.substring(1).trim() : a;
        const textB = b.startsWith('/') ? b.substring(1).trim() : b;
        return textA.localeCompare(textB);
    });
    
    // Clear container
    topicButtonsContainer.innerHTML = '';
    
    // Create topic buttons
    if (questions.length > 0) {
        questions.forEach(question => {
            // Find topic data if available
            let topicData = null;
            if (topicListData.found) {
                topicData = findTopicByName(question);
            }
            
            let topicElement;
            
            // Use the new topic container with preview if we have data
            if (topicData) {
                topicElement = createTopicButtonWithPreview(question, topicData);
                topicButtonsContainer.appendChild(topicElement);
            } else {
                // Fallback to the old style if no preview data
                // Clean up question text - remove leading slash if present
                let displayText = question;
                
                if (displayText.startsWith('/')) {
                    displayText = displayText.substring(1).trim();
                }
                
                const simpleContainer = document.createElement('div');
                simpleContainer.className = 'topic-container';
                
                const topicButton = document.createElement('button');
                topicButton.className = 'topic-button';
                topicButton.textContent = displayText;
                topicButton.dataset.question = question;
                topicButton.setAttribute('type', 'button');
                
                simpleContainer.appendChild(topicButton);
                topicButtonsContainer.appendChild(simpleContainer);
            }
        });
        
        return true;
    } else {
        // Show a message if no topics are found
        const noTopics = document.createElement('div');
        noTopics.style.padding = '15px';
        noTopics.style.color = '#aaa';
        noTopics.style.textAlign = 'center';
        noTopics.textContent = 'No topics available for this chapter';
        topicButtonsContainer.appendChild(noTopics);
        
        return false;
    }
}

// Export functions for use in script.js
window.topicList = {
    loadTopicList,
    findTopicByName,
    createTopicButtonWithPreview,
    renderTopicList
}; 
/**
 * User Session Manager
 * Handles user session data storage and retrieval
 */

console.log("Using global API base path in user-session.js:", window.apiBasePath);

// Function to set user data in localStorage
function setUserData(userData) {
    if (userData.userId) {
        localStorage.setItem('userId', userData.userId);
    }
    
    if (userData.grade) {
        localStorage.setItem('userGrade', userData.grade);
    }
    
    if (userData.name) {
        localStorage.setItem('userName', userData.name);
    }
}

// Function to get user data from localStorage
function getUserData() {
    return {
        userId: localStorage.getItem('userId'),
        grade: localStorage.getItem('userGrade'),
        name: localStorage.getItem('userName')
    };
}

// Function to clear user data from localStorage
function clearUserData() {
    localStorage.removeItem('userId');
    localStorage.removeItem('userGrade');
    localStorage.removeItem('userName');
}

// Load user data from server if not in localStorage
async function loadUserData() {
    // Check if we already have user data
    const userId = localStorage.getItem('userId');
    
    if (!userId) {
        try {
            const response = await fetch(`${window.apiBasePath}/api/user/session.php`);
            const data = await response.json();
            
            if (data.success && data.user) {
                setUserData({
                    userId: data.user.id,
                    grade: data.user.grade,
                    name: data.user.name
                });
                
                return data.user;
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }
    
    return getUserData();
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    const userData = await loadUserData();
    console.log('User session initialized:', userData);
}); 
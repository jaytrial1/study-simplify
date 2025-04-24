function showError(message) {
    const errorDiv = document.getElementById('error-message');
    const errorText = errorDiv.querySelector('.error-text');
    errorText.textContent = message;
    errorDiv.classList.add('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function hideError() {
    const errorDiv = document.getElementById('error-message');
    errorDiv.classList.remove('show');
}

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.querySelector('.remember-me input[type="checkbox"]');
    
    // Check for saved credentials and autofill if present
    const savedCredentials = getSavedCredentials();
    if (savedCredentials) {
        emailInput.value = savedCredentials.email || '';
        if (savedCredentials.rememberMe) {
            rememberMeCheckbox.checked = true;
        }
    }
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            
            const formData = {
                email: emailInput.value.trim(),
                password: passwordInput.value,
                rememberMe: rememberMeCheckbox.checked
            };

            // Basic validation
            if (!formData.email || !formData.password) {
                throw new Error('All fields are required');
            }

            const response = await fetch(`${window.apiBasePath}/api/auth/login.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Store the token in localStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('user_id', data.user_id);
            localStorage.setItem('userGrade', data.grade);
            localStorage.setItem('tuitionClass', data.tuition_class);
            
            // Store approval status information
            if (data.is_approved_by_owner !== undefined) {
                localStorage.setItem('is_approved_by_owner', data.is_approved_by_owner);
            }
            if (data.is_active_by_owner !== undefined) {
                localStorage.setItem('is_active_by_owner', data.is_active_by_owner);
            }
            if (data.is_active_by_admin !== undefined) {
                localStorage.setItem('is_active_by_admin', data.is_active_by_admin);
            }
            
            // Handle "Remember me" by saving credentials securely if checked
            handleRememberMe(formData.email, formData.password, formData.rememberMe);

            // Get the current hostname to check if we're on a subdomain
            const currentHostname = window.location.hostname;
            const isSubdomain = currentHostname.includes('.studysimplify.in') && 
                               currentHostname !== 'studysimplify.in';
            
            console.log("Login.js - Current hostname:", currentHostname);
            console.log("Login.js - Is subdomain:", isSubdomain);
            console.log("Login.js - tuitionClass:", data.tuition_class);

            // Conditional redirect based on tuition class AND subdomain status
            const tuitionClass = localStorage.getItem('tuitionClass');
            if (isSubdomain && tuitionClass && tuitionClass !== 'null' && tuitionClass !== '') {
                console.log("Login.js - Redirecting to tuition_home.html - subdomain user");
                // User belongs to a tuition class and is on a subdomain, redirect to intermediate page
                window.location.href = 'tuition_home.html';
            } else {
                console.log("Login.js - Redirecting to chatbot.html - main domain or no tuition class");
                // Main domain user or not on a subdomain, redirect to chatbot
                window.location.href = 'chatbot.html';
            }

        } catch (error) {
            console.error('Error:', error);
            showError(error.message || 'An error occurred. Please try again.');
        } finally {
            const submitButton = loginForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });

    // Add this to hide error when form inputs change
    document.querySelectorAll('#loginForm input').forEach(input => {
        input.addEventListener('input', hideError);
    });
});

// Function to handle the "Remember me" logic
function handleRememberMe(email, password, rememberMe) {
    if (rememberMe) {
        // Important: Don't save the raw password. 
        // We'll save the email and the rememberMe preference.
        // The token is already saved separately.
        saveCredentials(email, rememberMe);
    } else {
        clearSavedCredentials();
    }
}

// Function to save credentials to localStorage
function saveCredentials(email, rememberMe) {
    try {
        const credentials = {
            email: email,
            rememberMe: rememberMe,
            timestamp: new Date().getTime()
        };
        localStorage.setItem('savedCredentials', JSON.stringify(credentials));
    } catch (error) {
        console.error('Error saving credentials:', error);
    }
}

// Function to get saved credentials
function getSavedCredentials() {
    try {
        const savedCredentials = localStorage.getItem('savedCredentials');
        if (!savedCredentials) return null;
        
        const credentials = JSON.parse(savedCredentials);
        
        // Check if credentials are expired (30 days expiration)
        const currentTime = new Date().getTime();
        const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
        
        if (credentials.timestamp && (currentTime - credentials.timestamp) > thirtyDaysInMs) {
            clearSavedCredentials();
            return null;
        }
        
        return credentials;
    } catch (error) {
        console.error('Error retrieving credentials:', error);
        return null;
    }
}

// Function to clear saved credentials
function clearSavedCredentials() {
    localStorage.removeItem('savedCredentials');
} 
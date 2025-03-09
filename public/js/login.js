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

            const response = await fetch(baseUrl + 'api/auth/login.php', {
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
            
            // Handle "Remember me" by saving credentials securely if checked
            if (rememberMeCheckbox.checked) {
                saveCredentials(formData.email, data.token, true);
            } else {
                // If not checked, clear any previously saved credentials
                clearSavedCredentials();
            }

            // Success - redirect to chatbot.html
            window.location.href = 'chatbot.html';

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

// Function to save credentials to localStorage
function saveCredentials(email, token, rememberMe) {
    try {
        const credentials = {
            email: email,
            token: token,
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
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
    const loginForm = document.getElementById('ownerLoginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('rememberMe');
    const togglePasswordBtn = document.getElementById('togglePassword');
    
    // Check for saved credentials and autofill if present
    const savedCredentials = getSavedCredentials();
    if (savedCredentials) {
        emailInput.value = savedCredentials.email || '';
        if (savedCredentials.rememberMe) {
            rememberMeCheckbox.checked = true;
        }
    }
    
    // Toggle password visibility
    togglePasswordBtn.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
    
    // Form submission
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
                throw new Error('Email and password are required');
            }

            const host = window.location.hostname;
            const protocol = window.location.protocol;
            let basePath = window.apiBasePath || '';
            
            const endpoint = `${protocol}//${host}${basePath}/api/owner/login.php`;
            
            console.log('Debug - Login Endpoint:', endpoint);

            const response = await fetch(endpoint, {
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

            // Debug token value
            console.log('Debug - Received token from server:', data.token ? data.token.substring(0,5) + '...' : 'missing');

            // Store the owner information in localStorage
            localStorage.setItem('ownerToken', data.token);
            localStorage.setItem('owner_id', data.owner_id);
            localStorage.setItem('ownerName', data.full_name);
            localStorage.setItem('className', data.class_name);
            localStorage.setItem('subdomain', data.subdomain_identifier);
            
            // Store plan info if available
            if (data.plan_id) {
                localStorage.setItem('plan_id', data.plan_id);
                localStorage.setItem('plan_type', data.plan_type);
                localStorage.setItem('plan_status', data.plan_status);
            }
            
            // Handle "Remember me" by saving credentials securely if checked
            handleRememberMe(formData.email, formData.password, formData.rememberMe);

            // Redirect to dashboard
            window.location.href = 'dashboard.html';

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
    document.querySelectorAll('#ownerLoginForm input').forEach(input => {
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
        localStorage.setItem('ownerSavedCredentials', JSON.stringify(credentials));
    } catch (error) {
        console.error('Error saving credentials:', error);
    }
}

// Function to get saved credentials
function getSavedCredentials() {
    try {
        const savedCredentials = localStorage.getItem('ownerSavedCredentials');
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
    localStorage.removeItem('ownerSavedCredentials');
} 
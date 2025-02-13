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
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            
            const formData = {
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value
            };

            // Basic validation
            if (!formData.email || !formData.password) {
                throw new Error('All fields are required');
            }

            const response = await fetch('/main/api/auth/login.php', {
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
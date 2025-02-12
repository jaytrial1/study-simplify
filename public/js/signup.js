document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            
            const formData = {
                name: document.getElementById('name').value.trim(),
                email: document.getElementById('email').value.trim(),
                password: document.getElementById('password').value,
                confirm_password: document.getElementById('confirm_password').value,
                grade: document.getElementById('grade').value
            };

            // Basic validation
            if (!formData.name || !formData.email || !formData.password || !formData.confirm_password || !formData.grade) {
                throw new Error('All fields are required');
            }

            // Log the request URL and data
            console.log('Sending request to:', '/main/api/auth/register.php');
            console.log('Request data:', formData);

            const response = await fetch('/main/api/auth/register.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            // Log the raw response
            const rawResponse = await response.text();
            console.log('Raw server response:', rawResponse);

            // Try to parse the response as JSON
            let data;
            try {
                data = JSON.parse(rawResponse);
            } catch (parseError) {
                console.error('Failed to parse JSON:', parseError);
                throw new Error('Server returned invalid JSON. Raw response: ' + rawResponse.substring(0, 100));
            }

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // Success
            alert('Registration successful! Please login.');
            window.location.href = 'login.html';

        } catch (error) {
            console.error('Error:', error);
            alert(error.message || 'An error occurred. Please try again.');
        } finally {
            const submitButton = signupForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });

    // Password confirmation validation
    const password = document.getElementById('password');
    const confirmPassword = document.getElementById('confirm_password');

    function validatePassword() {
        if (password.value !== confirmPassword.value) {
            confirmPassword.setCustomValidity("Passwords don't match");
        } else {
            confirmPassword.setCustomValidity('');
        }
    }

    password.addEventListener('change', validatePassword);
    confirmPassword.addEventListener('keyup', validatePassword);
}); 

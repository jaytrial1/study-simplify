document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    
    const gradeSelect = document.getElementById('grade-level');

    // Detect environment
    const isLocalServer = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' || 
                         window.location.hostname.includes('192.168.') || 
                         window.location.hostname.includes('10.0.');
    
    console.log("Server detection in signup.js:", isLocalServer ? "LOCAL SERVER" : "PRODUCTION SERVER");

    // Set API paths based on environment
    let apiBasePath;
    if (isLocalServer) {
        // Local development - use current baseUrl from base-url.js
        apiBasePath = baseUrl;
    } else {
        // Production - use absolute paths
        apiBasePath = window.location.origin + '/';
    }

    // Log the API path we're using
    console.log("Using API base path:", apiBasePath);
    
    // Fetch available grades from PDF repository
    fetch(apiBasePath + 'api/navigation/grades.php')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Grades data:", data);
            gradeSelect.innerHTML = data.grades.map(grade => 
                `<option value="${grade}">${grade}</option>`
            ).join('');
        })
        .catch(error => {
            console.error('Error loading grades:', error);
            // Add fallback grades if API fails
            const fallbackGrades = ['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
            gradeSelect.innerHTML = fallbackGrades.map(grade => 
                `<option value="${grade}">${grade}</option>`
            ).join('');
        });

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
                grade: document.getElementById('grade-level').value
            };

            // Basic validation
            if (!formData.name || !formData.email || !formData.password || !formData.confirm_password || !formData.grade) {
                throw new Error('All fields are required');
            }

            // Log the request URL and data
            const apiUrl = apiBasePath + 'api/auth/register.php';
            console.log('Sending request to:', apiUrl);
            console.log('Request data:', formData);

            const response = await fetch(apiUrl, {
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
                throw new Error(data.error || 'Registration failed');
            }

            // Success
            alert('Registration successful! Please login.');
            window.location.href = 'login.html';

        } catch (error) {
            console.error('Error:', error);
            showError(error.message || 'An error occurred. Please try again.');
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

    // Add this function to hide error
    function hideError() {
        const errorDiv = document.getElementById('error-message');
        errorDiv.classList.remove('show');
    }

    // Add this to hide error when form inputs change
    document.querySelectorAll('#signupForm input, #signupForm select').forEach(input => {
        input.addEventListener('input', hideError);
    });
});

// Add this function at the start
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    const errorText = errorDiv.querySelector('.error-text');
    errorText.textContent = message;
    errorDiv.classList.add('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
} 

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
    const signupForm = document.getElementById('ownerSignupForm');
    const fullNameInput = document.getElementById('fullName');
    const classNameInput = document.getElementById('className');
    const emailInput = document.getElementById('email');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const subdomainInput = document.getElementById('subdomainIdentifier');
    const subdomainPreview = document.getElementById('subdomainPreview');
    const subdomainFeedback = document.getElementById('subdomainFeedback');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const togglePasswordBtn = document.getElementById('togglePassword');
    const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
    
    // Subdomain live preview
    subdomainInput.addEventListener('input', function() {
        const subdomain = this.value.trim();
        subdomainPreview.textContent = subdomain || 'classA';
        
        // Validate subdomain format (letters and numbers only, no spaces)
        if (subdomain && !/^[a-zA-Z0-9]+$/.test(subdomain)) {
            subdomainInput.classList.add('is-invalid');
            subdomainFeedback.classList.add('show');
        } else {
            subdomainInput.classList.remove('is-invalid');
            subdomainFeedback.classList.remove('show');
        }
    });
    
    // Toggle password visibility
    togglePasswordBtn.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
    
    toggleConfirmPasswordBtn.addEventListener('click', function() {
        const type = confirmPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        confirmPasswordInput.setAttribute('type', type);
        this.classList.toggle('fa-eye');
        this.classList.toggle('fa-eye-slash');
    });
    
    // Form submission
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        try {
            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            
            // Validate subdomain format
            const subdomain = subdomainInput.value.trim();
            if (!/^[a-zA-Z0-9]+$/.test(subdomain)) {
                throw new Error('Subdomain must contain only letters and numbers with no spaces');
            }
            
            // Check password match
            if (passwordInput.value !== confirmPasswordInput.value) {
                throw new Error('Passwords do not match');
            }
            
            const formData = {
                full_name: fullNameInput.value.trim(),
                class_name: classNameInput.value.trim(),
                email: emailInput.value.trim(),
                phone_number: phoneNumberInput.value.trim(),
                subdomain_identifier: subdomain,
                password: passwordInput.value,
                confirm_password: confirmPasswordInput.value
            };

            // Basic validation
            if (!formData.full_name || !formData.class_name || !formData.email || !formData.subdomain_identifier || !formData.password) {
                throw new Error('All fields except phone number are required');
            }

            const response = await fetch(`${window.apiBasePath}/api/owner/register.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
            }

            // Show success message and redirect to login
            alert('Registration successful! You can now log in.');
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

    // Add this to hide error when form inputs change
    document.querySelectorAll('#ownerSignupForm input').forEach(input => {
        input.addEventListener('input', hideError);
    });
});
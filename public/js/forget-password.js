// Function to show error message
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    const errorText = errorDiv.querySelector('.error-text');
    errorText.textContent = message;
    errorDiv.classList.add('show');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Function to hide error message
function hideError() {
    const errorDiv = document.getElementById('error-message');
    errorDiv.classList.remove('show');
}

// Function to show success message
function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    const successText = successDiv.querySelector('.success-text');
    successText.textContent = message;
    successDiv.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Function to hide success message
function hideSuccess() {
    const successDiv = document.getElementById('success-message');
    successDiv.style.display = 'none';
}

// Function to switch between steps
function goToStep(stepNumber) {
    // Update step indicators
    document.querySelectorAll('.step').forEach((step, index) => {
        step.classList.remove('active', 'completed');
        if (index + 1 < stepNumber) {
            step.classList.add('completed');
        } else if (index + 1 === stepNumber) {
            step.classList.add('active');
        }
    });
    
    // Show the appropriate step container
    document.querySelectorAll('.step-container').forEach((container, index) => {
        container.classList.remove('active');
        if (index + 1 === stepNumber) {
            container.classList.add('active');
        }
    });
}

// Handle OTP input functionality
function setupOtpInputs() {
    const inputs = document.querySelectorAll('.otp-input');
    const otpValue = document.getElementById('otpValue');
    
    inputs.forEach((input, index) => {
        // Focus on first input when the container becomes active
        if (index === 0 && document.getElementById('step-2-container').classList.contains('active')) {
            setTimeout(() => input.focus(), 100);
        }
        
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            
            // Only allow numbers
            if (/[^0-9]/.test(value)) {
                input.value = '';
                return;
            }
            
            // Move to next input if a digit is entered
            if (value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
            
            // Update the hidden OTP value input
            otpValue.value = Array.from(inputs).map(i => i.value).join('');
        });
        
        // Handle backspace
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && index > 0) {
                inputs[index - 1].focus();
            }
        });
        
        // Handle paste
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData('text');
            const digits = pasteData.match(/\d/g) || [];
            
            inputs.forEach((input, i) => {
                if (i < digits.length) {
                    input.value = digits[i];
                    if (i === inputs.length - 1) {
                        input.focus();
                    }
                }
            });
            
            // Update the hidden OTP value input
            otpValue.value = Array.from(inputs).map(i => i.value).join('');
            
            // Focus on last filled input or next empty one
            const lastFilledIndex = Math.min(digits.length - 1, inputs.length - 1);
            inputs[lastFilledIndex].focus();
        });
    });
}

document.addEventListener('DOMContentLoaded', function() {
    // Hide error message when inputs change
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', hideError);
    });
    
    // Setup OTP inputs
    setupOtpInputs();
    
    // Handle Email Form Submission (Step 1)
    const emailForm = document.getElementById('emailForm');
    emailForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideError();
        hideSuccess();
        
        try {
            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            
            const email = document.getElementById('email').value.trim();
            
            // Send request to the server
            const response = await fetch(`${window.apiBasePath}/api/auth/send-otp.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            
            // Get response text first to check if it's valid JSON
            const responseText = await response.text();
            let data;
            
            try {
                // Try to parse as JSON
                data = JSON.parse(responseText);
            } catch (jsonError) {
                console.error('Invalid JSON response:', responseText);
                throw new Error('Server returned an invalid response. Please try again later.');
            }
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to send OTP. Please try again.');
            }
            
            // Check if we got a development OTP for testing
            if (data.dev_otp) {
                console.log('Development OTP:', data.dev_otp);
            }
            
            // Store email for later steps
            document.getElementById('emailValue').value = email;
            document.getElementById('passwordEmailValue').value = email;
            
            // Show success and move to next step
            showSuccess(data.message || 'OTP sent successfully. Please check your email.');
            goToStep(2);
            
        } catch (error) {
            console.error('Error:', error);
            showError(error.message || 'An error occurred. Please try again.');
        } finally {
            const submitButton = emailForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP';
            }
        }
    });
    
    // Handle OTP Form Submission (Step 2)
    const otpForm = document.getElementById('otpForm');
    otpForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideError();
        hideSuccess();
        
        try {
            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
            
            // Get the OTP and email values
            const otp = document.getElementById('otpValue').value;
            const email = document.getElementById('emailValue').value;
            
            // Validate OTP
            if (otp.length !== 6 || !/^\d+$/.test(otp)) {
                throw new Error('Please enter a valid 6-digit OTP');
            }
            
            // Send request to the server
            const response = await fetch(`${window.apiBasePath}/api/auth/verify-otp.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, otp })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Invalid or expired OTP. Please try again.');
            }
            
            // Store OTP for the password reset step
            document.getElementById('passwordOtpValue').value = otp;
            
            // Show success and move to next step
            showSuccess(data.message || 'OTP verified successfully. Please set your new password.');
            goToStep(3);
            
        } catch (error) {
            console.error('Error:', error);
            showError(error.message || 'An error occurred. Please try again.');
        } finally {
            const submitButton = otpForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-check-circle"></i> Verify OTP';
            }
        }
    });
    
    // Handle Password Form Submission (Step 3)
    const passwordForm = document.getElementById('passwordForm');
    passwordForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideError();
        hideSuccess();
        
        try {
            const submitButton = this.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
            
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const email = document.getElementById('passwordEmailValue').value;
            const otp = document.getElementById('passwordOtpValue').value;
            
            // Validate password
            if (password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }
            
            // Validate password match
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }
            
            // Send request to the server
            const response = await fetch(`${window.apiBasePath}/api/auth/reset-password.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, otp, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset password. Please try again.');
            }
            
            // Show success message
            showSuccess(data.message || 'Password reset successfully. You will be redirected to login.');
            
            // Redirect to login page after 3 seconds
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
            
        } catch (error) {
            console.error('Error:', error);
            showError(error.message || 'An error occurred. Please try again.');
        } finally {
            const submitButton = passwordForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-save"></i> Reset Password';
            }
        }
    });
    
    // Handle Resend OTP link
    const resendLink = document.getElementById('resendLink');
    resendLink.addEventListener('click', async function(e) {
        e.preventDefault();
        hideError();
        
        try {
            this.textContent = 'Sending...';
            this.style.pointerEvents = 'none';
            
            const email = document.getElementById('emailValue').value;
            
            // Send request to the server
            const response = await fetch(`${window.apiBasePath}/api/auth/send-otp.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, resend: true })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Failed to resend OTP. Please try again.');
            }
            
            // Show success message
            showSuccess(data.message || 'OTP resent successfully. Please check your email.');
            
            // Reset OTP inputs
            document.querySelectorAll('.otp-input').forEach(input => {
                input.value = '';
            });
            document.getElementById('otpValue').value = '';
            document.querySelectorAll('.otp-input')[0].focus();
            
            // Disable resend button for 60 seconds
            let countdown = 60;
            const resendText = document.getElementById('resendText');
            const originalText = resendText.innerHTML;
            
            const countdownInterval = setInterval(() => {
                resendText.textContent = `Resend OTP in ${countdown} seconds`;
                countdown--;
                
                if (countdown < 0) {
                    clearInterval(countdownInterval);
                    resendText.innerHTML = originalText;
                    resendLink.style.pointerEvents = 'auto';
                }
            }, 1000);
            
        } catch (error) {
            console.error('Error:', error);
            showError(error.message || 'An error occurred. Please try again.');
            this.textContent = 'Resend OTP';
            this.style.pointerEvents = 'auto';
        }
    });
}); 
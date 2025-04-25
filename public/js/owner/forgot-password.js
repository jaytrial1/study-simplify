document.addEventListener('DOMContentLoaded', () => {
    const sendOtpForm = document.getElementById('sendOtpForm');
    const verifyOtpForm = document.getElementById('verifyOtpForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const messageContainer = document.getElementById('message-container');
    const displayEmail = document.getElementById('displayEmail');
    const resendOtpBtn = document.getElementById('resendOtpBtn');

    const emailInput = document.getElementById('email');
    const otpInput = document.getElementById('otp');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    let currentEmail = ''; // Store the email used for OTP sending

    // Function to display messages
    function showMessage(message, type = 'error') {
        messageContainer.innerHTML = `<div class="message ${type}">${message}</div>`;
        messageContainer.style.display = 'block';
        // Automatically hide after 5 seconds
        setTimeout(() => {
             if (messageContainer.innerHTML.includes(message)) { // Only hide if it's still the same message
                 messageContainer.style.display = 'none';
                 messageContainer.innerHTML = '';
             }
        }, 5000);
    }

    // Function to show a specific step
    function showStep(stepId) {
        document.querySelectorAll('.step-form').forEach(form => form.classList.remove('active-step'));
        document.getElementById(stepId).classList.add('active-step');
        messageContainer.style.display = 'none'; // Clear messages when changing steps
        messageContainer.innerHTML = '';
    }

    // Function to handle API requests
    async function handleApiRequest(url, data, buttonElement) {
        const originalButtonText = buttonElement.innerHTML;
        buttonElement.disabled = true;
        buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }
            
            return result;

        } catch (error) {
            console.error('API Request Error:', error);
            showMessage(error.message || 'An unexpected error occurred. Please try again.', 'error');
            return null; // Indicate failure
        } finally {
            buttonElement.disabled = false;
            buttonElement.innerHTML = originalButtonText;
        }
    }

    // Step 1: Send OTP
    sendOtpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        currentEmail = emailInput.value;
        const button = sendOtpForm.querySelector('button[type="submit"]');
        
        const result = await handleApiRequest(
            `${apiBasePath}/api/owner/auth/send-otp.php`, 
            { email: currentEmail },
            button
        );

        if (result && result.success) {
            showMessage(result.message || 'OTP sent successfully.', 'success');
            displayEmail.textContent = currentEmail;
            showStep('verifyOtpForm');
        }
    });

    // Resend OTP
    resendOtpBtn.addEventListener('click', async () => {
         if (!currentEmail) {
            showMessage('Email address not found. Please start over.', 'error');
            showStep('sendOtpForm');
            return;
         }
        
        const result = await handleApiRequest(
            `${apiBasePath}/api/owner/auth/send-otp.php`, 
            { email: currentEmail, resend: true },
            resendOtpBtn
        );

        if (result && result.success) {
            showMessage(result.message || 'OTP resent successfully.', 'success');
        } else if (result && result.error) {
             // Specific error from backend
            showMessage(result.error, 'error');
        } else if (!result) {
            // Generic error handled by handleApiRequest
        }
    });

    // Step 2: Verify OTP
    verifyOtpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const otp = otpInput.value;
        const button = verifyOtpForm.querySelector('button[type="submit"]');
        
        const result = await handleApiRequest(
            `${apiBasePath}/api/owner/auth/verify-otp.php`, 
            { email: currentEmail, otp: otp },
            button
        );

        if (result && result.success) {
             showMessage(result.message || 'OTP verified.', 'success');
            showStep('resetPasswordForm');
        }
    });

    // Step 3: Reset Password
    resetPasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const otp = otpInput.value; // OTP is needed for final reset
        const button = resetPasswordForm.querySelector('button[type="submit"]');

        if (newPassword !== confirmPassword) {
            showMessage('Passwords do not match.', 'error');
            return;
        }
        if (newPassword.length < 6) {
             showMessage('Password must be at least 6 characters long.', 'error');
            return;
        }

        const result = await handleApiRequest(
            `${apiBasePath}/api/owner/auth/reset-password.php`, 
            { email: currentEmail, otp: otp, password: newPassword },
            button
        );

        if (result && result.success) {
            // Hide all form steps
            document.querySelectorAll('.step-form').forEach(form => form.style.display = 'none');
            // Hide any previous messages
            messageContainer.style.display = 'none';
            
            // Update and show the success block
            const successBlock = document.getElementById('successMessageBlock');
            const successMessageText = document.getElementById('successMessageText');
            successMessageText.textContent = result.message || 'Password reset successfully!'; // Use backend message if available
            successBlock.style.display = 'block';

            // Remove the automatic redirect
            // setTimeout(() => {
            //     window.location.href = 'login.html';
            // }, 3000); 
        }
    });

    // Password toggle visibility
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const targetInputId = toggle.getAttribute('data-target');
            const passwordInput = document.getElementById(targetInputId);
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggle.classList.remove('fa-eye-slash');
                toggle.classList.add('fa-eye');
            } else {
                passwordInput.type = 'password';
                toggle.classList.remove('fa-eye');
                toggle.classList.add('fa-eye-slash');
            }
        });
    });

    // Initial setup - show step 1
    showStep('sendOtpForm');
}); 
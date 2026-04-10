// Automatic API URL detection based on current environment
const API_BASE_URL = (() => {
  const currentHost = window.location.hostname;
  const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';
  const isNetlify = currentHost.includes('netlify.app');
  
  if (isLocalhost) {
    return ''; // Same origin for local development
  } else if (isNetlify || window.location.protocol === 'https:') {
    return 'https://library-backend-j90e.onrender.com';
  } else {
    return 'https://library-backend-j90e.onrender.com';
  }
})();

// ─── JWT Auto-Inject ───────────────────────────────────────────────────────
// Intercept every fetch() call on this page. If the request targets the
// Render backend, automatically attach the stored JWT.
(function injectJwtOnBackendRequests() {
  const _fetch = window.fetch;
  window.fetch = function(input, init = {}) {
    const url = typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input));
    const isBackendCall = API_BASE_URL && url.startsWith(API_BASE_URL);
    if (isBackendCall) {
      const token = localStorage.getItem('authToken');
      if (token) {
        init.headers = Object.assign({ 'Authorization': `Bearer ${token}` }, init.headers || {});
      }
    }
    return _fetch.call(this, input, init);
  };
})();

// Check if user is already authenticated on page load
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔍 auth.html loaded - checking if user is already authenticated...');
    
    // If user is already logged in, redirect to main app
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/current-user`, {
            method: 'GET',
            credentials: 'include'
        });
        
        console.log('🔍 Auth check response status:', response.status);
        
        if (response.ok) {
            const user = await response.json();
            console.log('✅ User is authenticated:', user);
            // User is authenticated, redirect to main app
            window.location.href = 'index.html';
        } else {
            console.log('❌ User is NOT authenticated');
            // Clear any stale token
            localStorage.removeItem('authToken');
        }
    } catch (error) {
        console.log('❌ Auth check error:', error);
        console.log('Staying on auth page');
    }
});

// Function to display messages
function displayMessage(elementId, message, type) {
    const messageElement = document.getElementById(elementId);
    if (!messageElement) return;
    
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'error' ? 'alert-danger' : 
                      'alert-info';
    
    messageElement.innerHTML = `
        <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                <span aria-hidden="true">&times;</span>
            </button>
        </div>
    `;
}

// Show/hide button spinner
function showButtonSpinner(buttonElement, originalText) {
    buttonElement.disabled = true;
    buttonElement.setAttribute('data-original-text', originalText);
    buttonElement.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Processing...
    `;
}

function hideButtonSpinner(buttonElement) {
    buttonElement.disabled = false;
    const originalText = buttonElement.getAttribute('data-original-text') || 'Submit';
    buttonElement.innerHTML = originalText;
}

// Email validation
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Show login form
function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('resend-verification-modal').style.display = 'none';
    document.getElementById('forgot-password-modal').style.display = 'none';
    
    // Show footer on login page
    const footer = document.getElementById('auth-footer');
    if (footer) footer.style.display = 'block';
}

// Show register form
function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('resend-verification-modal').style.display = 'none';
    document.getElementById('forgot-password-modal').style.display = 'none';
    
    // Show footer on register page
    const footer = document.getElementById('auth-footer');
    if (footer) footer.style.display = 'block';
}

// Show resend verification
function showResendVerification() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('resend-verification-modal').style.display = 'block';
    document.getElementById('forgot-password-modal').style.display = 'none';
    
    // HIDE footer on resend verification page
    const footer = document.getElementById('auth-footer');
    if (footer) footer.style.display = 'none';
}

// Hide resend verification
function hideResendVerification() {
    showLoginForm();
    document.getElementById('resend-email').value = '';
    document.getElementById('resend-messages').innerHTML = '';
}

// Show forgot password form
function showForgotPasswordForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('resend-verification-modal').style.display = 'none';
    document.getElementById('forgot-password-modal').style.display = 'block';
    
    // HIDE footer on forgot password page
    const footer = document.getElementById('auth-footer');
    if (footer) footer.style.display = 'none';
}

// Hide forgot password form
function hideForgotPasswordForm() {
    showLoginForm();
    document.getElementById('forgot-password-email').value = '';
    document.getElementById('forgot-password-messages').innerHTML = '';
}

// Handle Login
async function login() {
    const emailOrUsername = document.getElementById('login-email-username').value.trim();
    const password = document.getElementById('login-password').value;
    const loginButton = document.querySelector('#login-form .btn-primary');

    document.getElementById('login-messages').innerHTML = '';

    if (!emailOrUsername || !password) {
        displayMessage('login-messages', 'Please fill in all fields', 'error');
        return;
    }

    showButtonSpinner(loginButton, 'Sign In');

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                emailOrUsername: emailOrUsername,
                password: password 
            })
        });

        if (response.ok) {
            // Login successful
            const user = await response.json();
            console.log('Login successful:', user);

            // Store JWT token for cross-origin requests (Netlify → Render)
            if (user.token) {
                localStorage.setItem('authToken', user.token);
            }

            // Verify the token works before redirecting
            let retries = 0;
            const maxRetries = 8;
            const verifyAndRedirect = async () => {
                try {
                    const check = await fetch(`${API_BASE_URL}/current-user`, {
                        method: 'GET',
                        credentials: 'include'
                    });
                    if (check.ok) {
                        window.location.replace('index.html');
                    } else if (retries < maxRetries) {
                        retries++;
                        setTimeout(verifyAndRedirect, 400);
                    } else {
                        hideButtonSpinner(loginButton);
                        displayMessage('login-messages', 'Session could not be established. Please try again.', 'error');
                    }
                } catch (e) {
                    if (retries < maxRetries) {
                        retries++;
                        setTimeout(verifyAndRedirect, 400);
                    } else {
                        hideButtonSpinner(loginButton);
                        displayMessage('login-messages', 'Network error verifying session. Please try again.', 'error');
                    }
                }
            };
            setTimeout(verifyAndRedirect, 300);
        } else {
            const data = await response.json();
            let errorMessage = data.error || data.message || 'Login failed';
            
            if (data.error === 'Email not verified') {
                errorMessage = data.message + '<br><small><a href="#" onclick="showResendVerification()">Click here to resend verification email</a></small>';
            }
            
            displayMessage('login-messages', errorMessage, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        displayMessage('login-messages', 'Network error. Please try again.', 'error');
        // Only re-enable button on outer catch (login request itself failed)
        hideButtonSpinner(loginButton);
    }
    // Note: no finally here - on success the verify loop manages button state
    // to keep the spinner going while we confirm the session is saved.
}

// Handle Registration
async function register() {
    const email = document.getElementById('register-email').value.trim();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    const registerButton = document.getElementById('register-btn');

    document.getElementById('register-messages').innerHTML = '';

    // Validation
    if (!email || !username || !password || !confirmPassword) {
        displayMessage('register-messages', 'Please fill in all fields', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        displayMessage('register-messages', 'Please enter a valid email address', 'error');
        return;
    }

    if (password.length < 6) {
        displayMessage('register-messages', 'Password must be at least 6 characters long', 'error');
        return;
    }

    if (password !== confirmPassword) {
        displayMessage('register-messages', 'Passwords do not match', 'error');
        return;
    }

    showButtonSpinner(registerButton, 'Create Account');

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username, password })
        });

        const data = await response.json();

        if (response.ok) {
            displayMessage('register-messages', 
                `${data.message}<br><br><strong>Next Steps:</strong><br>
                1. Check your email (${email})<br>
                2. Click the verification link<br>
                3. Come back here to log in<br><br>
                <small>Didn't receive it? Check spam folder or <a href="#" onclick="showResendVerification()">resend verification email</a></small>`, 
                'success'
            );
            
            // Clear form
            document.getElementById('register-email').value = '';
            document.getElementById('register-username').value = '';
            document.getElementById('register-password').value = '';
            document.getElementById('register-confirm-password').value = '';
            
            // Automatically switch to login after 8 seconds
            setTimeout(() => {
                showLoginForm();
                displayMessage('login-messages', 'Please verify your email and log in', 'info');
            }, 8000);
        } else {
            displayMessage('register-messages', data.error || data.message || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        displayMessage('register-messages', 'Network error. Please try again.', 'error');
    } finally {
        hideButtonSpinner(registerButton);
    }
}

// Resend verification email
async function resendVerification() {
    const email = document.getElementById('resend-email').value.trim();
    const resendButton = document.querySelector('#resend-verification-modal .btn-success');
    
    document.getElementById('resend-messages').innerHTML = '';

    if (!email) {
        displayMessage('resend-messages', 'Email is required', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        displayMessage('resend-messages', 'Please enter a valid email address', 'error');
        return;
    }

    showButtonSpinner(resendButton, 'Resend Verification');

    try {
        const response = await fetch(`${API_BASE_URL}/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            displayMessage('resend-messages', 
                `${data.message}<br><br><strong>Remember:</strong><br>
                • Check your spam folder<br>
                • The link expires in 24 hours<br>
                • Come back here to log in after verifying`, 
                'success'
            );
            
            setTimeout(() => {
                hideResendVerification();
                displayMessage('login-messages', 'Verification email sent! Please check your email.', 'info');
            }, 6000);
        } else {
            displayMessage('resend-messages', data.message || data.error || 'Failed to resend verification email', 'error');
        }
    } catch (error) {
        console.error('Resend verification error:', error);
        displayMessage('resend-messages', 'Network error. Please try again.', 'error');
    } finally {
        hideButtonSpinner(resendButton);
    }
}

// Request password reset
async function requestPasswordReset() {
    const email = document.getElementById('forgot-password-email').value.trim();
    const resetButton = document.querySelector('#forgot-password-modal .btn-danger');
    
    document.getElementById('forgot-password-messages').innerHTML = '';

    if (!email) {
        displayMessage('forgot-password-messages', 'Email is required', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        displayMessage('forgot-password-messages', 'Please enter a valid email address', 'error');
        return;
    }

    showButtonSpinner(resetButton, 'Send Reset Link');

    try {
        const response = await fetch(`${API_BASE_URL}/request-password-reset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (response.ok) {
            displayMessage('forgot-password-messages', 
                `${data.message}<br><br><strong>Next Steps:</strong><br>
                1. Check your email<br>
                2. Click the reset link<br>
                3. Create a new password<br><br>
                <small>The link expires in 1 hour</small>`, 
                'success'
            );
            
            setTimeout(() => {
                hideForgotPasswordForm();
                displayMessage('login-messages', 'Password reset email sent! Check your inbox.', 'info');
            }, 6000);
        } else {
            displayMessage('forgot-password-messages', data.message || data.error || 'Failed to send reset email', 'error');
        }
    } catch (error) {
        console.error('Password reset error:', error);
        displayMessage('forgot-password-messages', 'Network error. Please try again.', 'error');
    } finally {
        hideButtonSpinner(resetButton);
    }
}

// Password strength indicator for registration
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('register-password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            const password = this.value;
            const strengthBar = document.querySelector('.password-strength-bar');
            
            if (!strengthBar) return;
            
            let strength = 0;
            if (password.length >= 6) strength++;
            if (password.length >= 10) strength++;
            if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
            if (/\d/.test(password)) strength++;
            if (/[^a-zA-Z\d]/.test(password)) strength++;
            
            strengthBar.className = 'password-strength-bar';
            if (strength <= 1) strengthBar.classList.add('weak');
            else if (strength <= 3) strengthBar.classList.add('medium');
            else strengthBar.classList.add('strong');
        });
    }
});

// Allow Enter key to submit forms
document.addEventListener('DOMContentLoaded', () => {
    const loginEmailUsername = document.getElementById('login-email-username');
    const loginPassword = document.getElementById('login-password');
    
    if (loginEmailUsername) {
        loginEmailUsername.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });
    }
    
    if (loginPassword) {
        loginPassword.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') login();
        });
    }
});

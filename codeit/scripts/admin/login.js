// Admin Login JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check if admin is already logged in
    checkAdminLoggedInState();
    
    // Set up login form
    setupLoginForm();
    
    // Set up forgot password functionality
    setupForgotPassword();
});

// Check if admin is already logged in
function checkAdminLoggedInState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // Check if user is admin
            isUserAdmin(user.uid).then(isAdmin => {
                if (isAdmin) {
                    // If admin is already logged in, redirect to dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    // If not admin, sign out
                    auth.signOut().then(() => {
                        showError('You do not have admin privileges.', 'error');
                    });
                }
            });
        }
    });
}

// Check if user is admin
function isUserAdmin(uid) {
    return db.collection('users').doc(uid).get()
        .then(doc => {
            if (doc.exists) {
                return doc.data().isAdmin === true;
            }
            return false;
        })
        .catch(error => {
            console.error("Error checking admin status:", error);
            return false;
        });
}

// Set up login form
function setupLoginForm() {
    const loginForm = document.getElementById('admin-login-form');
    
    if (!loginForm) {
        console.error("Admin login form not found");
        return;
    }
    
    console.log("Admin login form found, setting up event listener");
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log("Admin login form submitted");
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        
        // Simple validation
        if (!email || !password) {
            showError('Please enter both email and password', 'error');
            return;
        }
        
        console.log("Attempting admin login for:", email);
        
        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';
        
        // Simply try to sign in first
        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log("Login successful, checking admin status");
                const user = userCredential.user;
                
                // Now check if user is admin
                return db.collection('users').doc(user.uid).get().then(doc => {
                    if (doc.exists && doc.data().isAdmin === true) {
                        console.log("Admin status confirmed");
                        return true;
                    }
                    console.log("Not an admin:", doc.exists ? "User exists but not admin" : "User doc doesn't exist");
                    return false;
                });
            })
            .then(isAdmin => {
                if (isAdmin) {
                    // Redirect to admin dashboard
                    window.location.href = 'dashboard.html';
                } else {
                    // Not an admin, sign out and show error
                    auth.signOut();
                    throw new Error('not-admin');
                }
            })
            .catch(error => {
                console.error("Admin login error:", error.code, error.message);
                
                let errorMessage = 'Login failed. Please try again.';
                
                if (error.message === 'not-admin') {
                    errorMessage = 'You do not have admin privileges.';
                } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    errorMessage = 'Invalid email or password. Please try again.';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMessage = 'Too many failed login attempts. Please try again later.';
                } else {
                    errorMessage = `Login error: ${error.message}`;
                }
                
                showError(errorMessage, 'error');
                
                // Reset button
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            });
    });
}

// Set up forgot password functionality
function setupForgotPassword() {
    const forgotPasswordLink = document.getElementById('forgot-password');
    
    if (!forgotPasswordLink) return;
    
    forgotPasswordLink.addEventListener('click', function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value.trim();
        
        if (!email) {
            showError('Please enter your email address first', 'info');
            document.getElementById('email').focus();
            return;
        }
        
        if (confirm(`Send password reset email to ${email}?`)) {
            auth.sendPasswordResetEmail(email)
                .then(() => {
                    showError('Password reset email sent. Please check your inbox.', 'success');
                })
                .catch(error => {
                    console.error("Password reset error:", error);
                    
                    let errorMessage = 'Failed to send password reset email. Please try again.';
                    
                    if (error.code === 'auth/user-not-found') {
                        errorMessage = 'No account found with this email address.';
                    } else if (error.code === 'auth/invalid-email') {
                        errorMessage = 'Please enter a valid email address.';
                    }
                    
                    showError(errorMessage, 'error');
                });
        }
    });
}

// Show error or success message
function showError(message, type = 'error') {
    const errorElement = document.getElementById('login-error');
    
    if (!errorElement) return;
    
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Clear existing classes
    errorElement.classList.remove('success', 'info', 'error');
    
    // Add appropriate class
    if (type === 'success') {
        errorElement.classList.add('success');
    } else if (type === 'info') {
        errorElement.classList.add('info');
    } else {
        errorElement.classList.add('error');
    }
}

// Hide error message
function hideError() {
    const errorElement = document.getElementById('login-error');
    
    if (!errorElement) return;
    
    errorElement.style.display = 'none';
} 
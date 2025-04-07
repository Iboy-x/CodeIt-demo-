// Login JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    checkLoggedInState();
    
    // Set up login form
    setupLoginForm();
    
    // Set up forgot password functionality
    setupForgotPassword();
    
    // Set up social sign-in
    setupSocialSignIn();
});

// Check if user is already logged in
function checkLoggedInState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // If already logged in, redirect to dashboard
            window.location.href = 'dashboard.html';
        }
    });
}

// Set up login form
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    
    if (!loginForm) {
        console.error("Login form not found");
        return;
    }
    
    console.log("Login form found, setting up event listener");
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log("Login form submitted");
        
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        
        // Simple validation
        if (!email || !password) {
            showError('Please enter both email and password', 'error');
            return;
        }
        
        console.log("Attempting login for:", email);
        
        // Show loading state
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Logging in...';
        
        // Simply try to sign in without persistence for now
        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log("Login successful:", userCredential.user.email);
                
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            })
            .catch(error => {
                console.error("Login error:", error.code, error.message);
                
                let errorMessage = 'Login failed. Please try again.';
                
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    errorMessage = 'Invalid email or password. Please try again.';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMessage = 'Too many failed login attempts. Please try again later.';
                } else if (error.code === 'auth/user-disabled') {
                    errorMessage = 'This account has been disabled. Please contact support.';
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

// Set up social sign-in
function setupSocialSignIn() {
    const googleSignIn = document.getElementById('google-signin');
    const githubSignIn = document.getElementById('github-signin');
    
    if (googleSignIn) {
        googleSignIn.addEventListener('click', function() {
            const provider = new firebase.auth.GoogleAuthProvider();
            socialSignIn(provider, 'google');
        });
    }
    
    if (githubSignIn) {
        githubSignIn.addEventListener('click', function() {
            const provider = new firebase.auth.GithubAuthProvider();
            socialSignIn(provider, 'github');
        });
    }
}

// Handle social sign-in
function socialSignIn(provider, providerName) {
    auth.signInWithPopup(provider)
        .then(result => {
            const user = result.user;
            
            // Check if it's a new user
            const isNewUser = result.additionalUserInfo.isNewUser;
            
            if (isNewUser) {
                // Create new user document
                return db.collection('users').doc(user.uid).set({
                    email: user.email,
                    displayName: user.displayName || user.email.split('@')[0],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    solvedProblems: [],
                    isAdmin: false,
                    photoURL: user.photoURL || null,
                    provider: providerName
                });
            } else {
                // Update user document
                return db.collection('users').doc(user.uid).update({
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    photoURL: user.photoURL || null
                });
            }
        })
        .then(() => {
            // Log activity
            logUserActivity('login', { method: providerName });
            
            // Redirect to dashboard or intended page
            const redirectUrl = new URLSearchParams(window.location.search).get('redirect') || 'dashboard.html';
            window.location.href = redirectUrl;
        })
        .catch(error => {
            console.error(`${providerName} sign-in error:`, error);
            
            let errorMessage = `${providerName} sign-in failed. Please try again.`;
            
            if (error.code === 'auth/account-exists-with-different-credential') {
                errorMessage = 'An account already exists with the same email address but different sign-in credentials. Sign in using the method you used previously.';
            } else if (error.code === 'auth/popup-closed-by-user') {
                // User closed the popup, no need to show error
                return;
            }
            
            showError(errorMessage, 'error');
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
    errorElement.style.display = 'none';
} 
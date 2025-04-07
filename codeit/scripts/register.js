// Register JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    checkLoggedInState();
    
    // Set up registration form
    setupRegistrationForm();
    
    // Set up social sign-up
    setupSocialSignUp();
});

// Check if user is already logged in
function checkLoggedInState() {
    auth.onAuthStateChanged(user => {
        if (user) {
            // Redirect to home page or dashboard
            window.location.href = 'problems.html';
        }
    });
}

// Set up registration form submission
function setupRegistrationForm() {
    const registerForm = document.getElementById('register-form');
    
    registerForm.addEventListener('submit', e => {
        e.preventDefault();
        
        // Get form values
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        const termsAccepted = document.getElementById('terms').checked;
        
        // Hide any previous error
        hideError();
        
        // Validate form
        if (!validateForm(name, email, password, confirmPassword, termsAccepted)) {
            return;
        }
        
        // Show loading state
        showError('Creating your account...', 'info');
        
        // Create user with email/password
        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                // Update user profile
                return userCredential.user.updateProfile({
                    displayName: name
                }).then(() => {
                    // Create user document in Firestore
                    return db.collection('users').doc(userCredential.user.uid).set({
                        email: email,
                        displayName: name,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                        provider: 'Email',
                        isAdmin: false,
                        solvedProblems: [],
                        attemptedProblems: []
                    });
                });
            })
            .then(() => {
                // Send email verification
                auth.currentUser.sendEmailVerification()
                    .catch(error => {
                        console.error('Error sending verification email:', error);
                    });
                
                // Redirect to problems page
                window.location.href = 'problems.html';
            })
            .catch(error => {
                console.error('Registration error:', error);
                
                if (error.code === 'auth/email-already-in-use') {
                    showError('This email is already registered. Try logging in instead.');
                } else if (error.code === 'auth/weak-password') {
                    showError('Password is too weak. Please use a stronger password.');
                } else {
                    showError('Registration failed: ' + error.message);
                }
            });
    });
}

// Validate registration form
function validateForm(name, email, password, confirmPassword, termsAccepted) {
    if (name.trim().length < 2) {
        showError('Please enter your full name.');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address.');
        return false;
    }
    
    if (password.length < 8) {
        showError('Password must be at least 8 characters long.');
        return false;
    }
    
    if (!isStrongPassword(password)) {
        showError('Password must contain at least one number and one special character.');
        return false;
    }
    
    if (password !== confirmPassword) {
        showError('Passwords do not match.');
        return false;
    }
    
    if (!termsAccepted) {
        showError('You must accept the Terms of Service and Privacy Policy.');
        return false;
    }
    
    return true;
}

// Check if password is strong
function isStrongPassword(password) {
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    return hasNumber && hasSpecialChar;
}

// Check if email is valid
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Set up social sign-up
function setupSocialSignUp() {
    // Google Sign Up
    document.getElementById('google-signup').addEventListener('click', () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        signUpWithProvider(provider, 'Google');
    });
    
    // GitHub Sign Up
    document.getElementById('github-signup').addEventListener('click', () => {
        const provider = new firebase.auth.GithubAuthProvider();
        signUpWithProvider(provider, 'GitHub');
    });
}

// Sign up with a social provider
function signUpWithProvider(provider, providerName) {
    auth.signInWithPopup(provider)
        .then(result => {
            // Check if this is a new user
            const isNewUser = result.additionalUserInfo.isNewUser;
            
            // Create/update user document
            db.collection('users').doc(result.user.uid).set({
                email: result.user.email,
                displayName: result.user.displayName || result.user.email.split('@')[0],
                photoURL: result.user.photoURL,
                provider: providerName,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                isAdmin: false,
                createdAt: isNewUser ? firebase.firestore.FieldValue.serverTimestamp() : firebase.firestore.FieldValue.serverTimestamp(),
                solvedProblems: [],
                attemptedProblems: []
            }, { merge: true });
            
            // Redirect to problems page
            window.location.href = 'problems.html';
        })
        .catch(error => {
            console.error(`${providerName} sign-up error:`, error);
            showError(`${providerName} sign-up failed: ` + error.message);
        });
}

// Show error message
function showError(message, type = 'error') {
    const errorElement = document.getElementById('register-error');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Clear any existing classes
    errorElement.className = 'error-message';
    
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
    const errorElement = document.getElementById('register-error');
    errorElement.style.display = 'none';
} 
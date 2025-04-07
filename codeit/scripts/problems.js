// JavaScript for the problems page

document.addEventListener('DOMContentLoaded', function() {
    // Setup filter functionality
    const difficultyFilter = document.getElementById('difficulty');
    const languageFilter = document.getElementById('language');
    
    if (difficultyFilter && languageFilter) {
        const problemCards = document.querySelectorAll('.problem-card');
        
        // Filter problems when filters change
        function filterProblems() {
            const difficultyValue = difficultyFilter.value;
            const languageValue = languageFilter.value;
            
            problemCards.forEach(card => {
                const difficultyTag = card.querySelector('.difficulty');
                const languageTags = card.querySelectorAll('.language');
                
                let showByDifficulty = difficultyValue === 'all' || difficultyTag.classList.contains(difficultyValue);
                
                let showByLanguage = languageValue === 'all';
                if (!showByLanguage) {
                    languageTags.forEach(tag => {
                        if (tag.textContent.toLowerCase() === languageValue) {
                            showByLanguage = true;
                        }
                    });
                }
                
                if (showByDifficulty && showByLanguage) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        }
        
        // Add event listeners to filters
        difficultyFilter.addEventListener('change', filterProblems);
        languageFilter.addEventListener('change', filterProblems);
    }

    // Check authentication state and update UI
    checkAuthState();
});

// Check authentication state and update UI
function checkAuthState() {
    auth.onAuthStateChanged(user => {
        const userMenu = document.getElementById('user-menu');
        const authLinks = document.getElementById('auth-links');
        
        if (user) {
            // User is logged in
            console.log("User is logged in:", user.email);
            
            if (userMenu) {
                userMenu.style.display = 'block';
                
                // Update user info in dropdown
                const userDisplayName = document.getElementById('user-display-name');
                const userEmail = document.getElementById('user-email');
                
                if (userDisplayName) {
                    userDisplayName.textContent = user.displayName || user.email.split('@')[0];
                }
                
                if (userEmail) {
                    userEmail.textContent = user.email;
                }
                
                // Update user image if available
                const userImage = document.getElementById('user-image');
                if (userImage) {
                    if (user.photoURL) {
                        userImage.src = user.photoURL;
                    } else {
                        // Set default avatar with initials
                        userImage.src = "../assets/default-avatar.png";
                    }
                }
                
                // Set up logout button
                const logoutBtn = document.getElementById('logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', e => {
                        e.preventDefault();
                        auth.signOut().then(() => {
                            window.location.reload();
                        });
                    });
                }
            }
            
            if (authLinks) {
                authLinks.style.display = 'none';
            }
            
            // Fetch additional user data from Firestore
            db.collection('users').doc(user.uid).get()
                .then(doc => {
                    if (doc.exists) {
                        const userData = doc.data();
                        
                        // Update UI with user's progress
                        updateProblemStatusForUser(userData.solvedProblems || []);
                    }
                })
                .catch(error => {
                    console.error("Error fetching user data:", error);
                });
        } else {
            // User is logged out
            console.log("User is logged out");
            
            if (userMenu) {
                userMenu.style.display = 'none';
            }
            
            if (authLinks) {
                authLinks.style.display = 'flex';
            }
        }
    });
}

// Update problem cards to show completion status
function updateProblemStatusForUser(solvedProblems) {
    const problemCards = document.querySelectorAll('.problem-card');
    
    problemCards.forEach(card => {
        const problemId = card.dataset.id;
        
        if (solvedProblems.includes(problemId)) {
            card.classList.add('completed');
            
            // Add a completion badge
            if (!card.querySelector('.completion-badge')) {
                const badge = document.createElement('div');
                badge.className = 'completion-badge';
                badge.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20"><path fill="none" d="M0 0h24v24H0z"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg>';
                card.appendChild(badge);
            }
        }
    });
} 
// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication and load dashboard
    checkAuthState();
    
    // Set up event listeners
    setupEventListeners();
});

// Check authentication state
function checkAuthState() {
    const loadingContainer = document.getElementById('loading-container');
    const loginPrompt = document.getElementById('login-prompt');
    const dashboardContainer = document.getElementById('dashboard-container');
    
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is logged in
            console.log("User is logged in:", user.email);
            
            // Update user info in menu
            updateUserMenuInfo(user);
            
            // Load dashboard data
            loadDashboardData(user.uid);
            
            // Show dashboard content
            loadingContainer.style.display = 'none';
            loginPrompt.style.display = 'none';
            dashboardContainer.style.display = 'block';
        } else {
            // User is logged out
            console.log("User is logged out");
            
            // Show login prompt
            loadingContainer.style.display = 'none';
            loginPrompt.style.display = 'flex';
            dashboardContainer.style.display = 'none';
            
            // Update auth links display
            const authLinks = document.getElementById('auth-links');
            const userMenu = document.getElementById('user-menu');
            
            if (authLinks) {
                authLinks.style.display = 'flex';
            }
            
            if (userMenu) {
                userMenu.style.display = 'none';
            }
        }
    });
}

// Update user menu information
function updateUserMenuInfo(user) {
    const userMenu = document.getElementById('user-menu');
    const authLinks = document.getElementById('auth-links');
    const userDisplayName = document.getElementById('user-display-name');
    const userEmail = document.getElementById('user-email');
    const userImage = document.getElementById('user-image');
    
    if (userMenu) {
        userMenu.style.display = 'block';
        
        if (userDisplayName) {
            userDisplayName.textContent = user.displayName || user.email.split('@')[0];
        }
        
        if (userEmail) {
            userEmail.textContent = user.email;
        }
        
        if (userImage) {
            if (user.photoURL) {
                userImage.src = user.photoURL;
            } else {
                userImage.src = "../assets/default-avatar.png";
            }
        }
    }
    
    if (authLinks) {
        authLinks.style.display = 'none';
    }
}

// Set up event listeners
function setupEventListeners() {
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

// Load dashboard data
function loadDashboardData(userId) {
    // Get user data
    db.collection('users').doc(userId).get()
        .then(doc => {
            if (doc.exists) {
                const userData = doc.data();
                
                // Update stats
                updateDashboardStats(userData);
                
                // Load user activity
                loadUserActivity(userId);
                
                // Initialize charts
                initializeProgressChart(userData);
                initializeDifficultyChart(userData);
                
                // Load suggested problems
                loadSuggestedProblems(userData);
                
                // Get user ranking
                getUserRanking(userId);
            } else {
                console.error("No user data found!");
                
                // Create user document if it doesn't exist
                db.collection('users').doc(userId).set({
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    solvedProblems: [],
                    totalAttempts: 0,
                    lastActive: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(() => {
                    // Reload the page to initialize with empty data
                    window.location.reload();
                })
                .catch(error => {
                    console.error("Error creating user document:", error);
                });
            }
        })
        .catch(error => {
            console.error("Error getting user data:", error);
        });
}

// Update dashboard statistics
function updateDashboardStats(userData) {
    const problemsSolvedElement = document.getElementById('problems-solved');
    const totalAttemptsElement = document.getElementById('total-attempts');
    const completionRateElement = document.getElementById('completion-rate');
    
    const solvedProblems = userData.solvedProblems || [];
    const totalAttempts = userData.totalAttempts || 0;
    
    if (problemsSolvedElement) {
        problemsSolvedElement.textContent = solvedProblems.length;
    }
    
    if (totalAttemptsElement) {
        totalAttemptsElement.textContent = totalAttempts;
    }
    
    // Calculate and update completion rate
    if (completionRateElement) {
        if (totalAttempts > 0) {
            const completionRate = Math.round((solvedProblems.length / totalAttempts) * 100);
            completionRateElement.textContent = `${completionRate}%`;
        } else {
            completionRateElement.textContent = '0%';
        }
    }
}

// Get user ranking in leaderboard
function getUserRanking(userId) {
    const rankingElement = document.getElementById('ranking');
    
    if (!rankingElement) return;
    
    // Get all users and sort by number of solved problems
    db.collection('users').get()
        .then(querySnapshot => {
            const users = [];
            
            querySnapshot.forEach(doc => {
                const userData = doc.data();
                users.push({
                    id: doc.id,
                    solvedCount: userData.solvedProblems ? userData.solvedProblems.length : 0
                });
            });
            
            // Sort users by solved count (descending)
            users.sort((a, b) => b.solvedCount - a.solvedCount);
            
            // Find current user's position
            const userIndex = users.findIndex(user => user.id === userId);
            
            if (userIndex !== -1) {
                // +1 because array is 0-indexed
                rankingElement.textContent = `#${userIndex + 1}`;
            } else {
                rankingElement.textContent = '--';
            }
        })
        .catch(error => {
            console.error("Error getting user ranking:", error);
            rankingElement.textContent = '--';
        });
}

// Load user activity history
function loadUserActivity(userId) {
    const activityList = document.getElementById('user-activity-list');
    
    if (!activityList) return;
    
    // Clear previous content
    activityList.innerHTML = '';
    
    // Get user activity from Firestore
    db.collection('activity')
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get()
        .then(querySnapshot => {
            if (querySnapshot.empty) {
                activityList.innerHTML = '<li class="empty-state">No activity yet. Start solving problems!</li>';
                return;
            }
            
            querySnapshot.forEach(doc => {
                const activity = doc.data();
                const li = document.createElement('li');
                
                // Format date
                const date = activity.timestamp.toDate();
                const formattedDate = new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }).format(date);
                
                // Determine activity icon and message
                let activityIcon = '';
                let activityMessage = '';
                
                switch(activity.type) {
                    case 'problem_solved':
                        activityIcon = '<div class="activity-icon solved"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/></svg></div>';
                        activityMessage = `Solved <span class="highlight">${activity.problemTitle || 'a problem'}</span>`;
                        break;
                    case 'problem_attempted':
                        activityIcon = '<div class="activity-icon attempted"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/></svg></div>';
                        activityMessage = `Attempted <span class="highlight">${activity.problemTitle || 'a problem'}</span>`;
                        break;
                    case 'account_created':
                        activityIcon = '<div class="activity-icon account"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/></svg></div>';
                        activityMessage = 'Created account';
                        break;
                    default:
                        activityIcon = '<div class="activity-icon default"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/></svg></div>';
                        activityMessage = activity.message || 'Unknown activity';
                }
                
                li.innerHTML = `
                    <div class="activity-item">
                        ${activityIcon}
                        <div class="activity-details">
                            <div class="activity-message">${activityMessage}</div>
                            <div class="activity-time">${formattedDate}</div>
                        </div>
                    </div>
                `;
                
                activityList.appendChild(li);
            });
        })
        .catch(error => {
            console.error("Error loading user activity:", error);
            activityList.innerHTML = '<li class="error">Failed to load activity. Please try again.</li>';
        });
}

// Load suggested problems
function loadSuggestedProblems(userData) {
    const suggestedProblemsContainer = document.getElementById('suggested-problems');
    
    if (!suggestedProblemsContainer) return;
    
    // Clear previous content
    suggestedProblemsContainer.innerHTML = '';
    
    const solvedProblems = userData.solvedProblems || [];
    
    // Determine user's skill level based on solved problems
    let userSkillLevel = 'beginner';
    if (solvedProblems.length >= 15) {
        userSkillLevel = 'advanced';
    } else if (solvedProblems.length >= 5) {
        userSkillLevel = 'intermediate';
    }
    
    // Query for problems that match user's skill level and haven't been solved yet
    let difficultyQuery;
    if (userSkillLevel === 'beginner') {
        difficultyQuery = db.collection('problems')
            .where('difficulty', 'in', ['absolute-beginner', 'beginner'])
            .limit(4);
    } else if (userSkillLevel === 'intermediate') {
        difficultyQuery = db.collection('problems')
            .where('difficulty', '==', 'intermediate')
            .limit(4);
    } else {
        difficultyQuery = db.collection('problems')
            .where('difficulty', 'in', ['intermediate', 'advanced'])
            .limit(4);
    }
    
    difficultyQuery.get()
        .then(querySnapshot => {
            if (querySnapshot.empty) {
                suggestedProblemsContainer.innerHTML = '<div class="empty-state">No suggested problems available.</div>';
                return;
            }
            
            // Filter out problems the user has already solved
            const problems = [];
            querySnapshot.forEach(doc => {
                if (!solvedProblems.includes(doc.id)) {
                    problems.push({
                        id: doc.id,
                        ...doc.data()
                    });
                }
            });
            
            // If we have fewer than 4 problems after filtering, get more
            if (problems.length < 4) {
                // Get more problems with different criteria
                let additionalQuery = db.collection('problems')
                    .limit(8);  // Get more to ensure we can fill the remaining slots
                
                additionalQuery.get()
                    .then(additionalSnapshot => {
                        additionalSnapshot.forEach(doc => {
                            if (!solvedProblems.includes(doc.id) && !problems.some(p => p.id === doc.id)) {
                                problems.push({
                                    id: doc.id,
                                    ...doc.data()
                                });
                            }
                        });
                        
                        // Render up to 4 problems
                        renderSuggestedProblems(problems.slice(0, 4));
                    })
                    .catch(error => {
                        console.error("Error getting additional problems:", error);
                        renderSuggestedProblems(problems);
                    });
            } else {
                renderSuggestedProblems(problems);
            }
        })
        .catch(error => {
            console.error("Error getting suggested problems:", error);
            suggestedProblemsContainer.innerHTML = '<div class="error">Failed to load suggested problems. Please try again.</div>';
        });
}

// Render suggested problems
function renderSuggestedProblems(problems) {
    const suggestedProblemsContainer = document.getElementById('suggested-problems');
    
    if (!suggestedProblemsContainer) return;
    
    if (problems.length === 0) {
        suggestedProblemsContainer.innerHTML = '<div class="empty-state">No suggested problems available.</div>';
        return;
    }
    
    // Clear container
    suggestedProblemsContainer.innerHTML = '';
    
    // Create problem cards
    problems.forEach(problem => {
        const card = document.createElement('div');
        card.className = 'problem-card';
        card.dataset.id = problem.id;
        
        // Format difficulty class
        let difficultyClass = problem.difficulty || 'beginner';
        
        // Create language tags HTML
        let languageTags = '';
        if (problem.languages && Array.isArray(problem.languages)) {
            languageTags = problem.languages.map(lang => 
                `<span class="language">${lang}</span>`
            ).join('');
        }
        
        card.innerHTML = `
            <div class="problem-info">
                <h3>${problem.title || 'Unnamed Problem'}</h3>
                <p>${problem.description?.substring(0, 100) || 'No description'}...</p>
                <div class="problem-meta">
                    <span class="difficulty ${difficultyClass}">${problem.difficulty || 'Beginner'}</span>
                    <div class="language-tags">
                        ${languageTags}
                    </div>
                </div>
            </div>
        `;
        
        // Add click event to redirect to problem page
        card.addEventListener('click', () => {
            window.location.href = `problem.html?id=${problem.id}`;
        });
        
        suggestedProblemsContainer.appendChild(card);
    });
}

// Initialize progress chart
function initializeProgressChart(userData) {
    const progressChartCanvas = document.getElementById('progress-chart');
    
    if (!progressChartCanvas) return;
    
    // Get user activity for chart data
    db.collection('activity')
        .where('userId', '==', auth.currentUser.uid)
        .where('type', '==', 'problem_solved')
        .orderBy('timestamp', 'asc')
        .get()
        .then(querySnapshot => {
            // Group by day
            const solvedByDay = {};
            
            querySnapshot.forEach(doc => {
                const activity = doc.data();
                const date = activity.timestamp.toDate();
                const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD
                
                if (!solvedByDay[dateString]) {
                    solvedByDay[dateString] = 0;
                }
                
                solvedByDay[dateString]++;
            });
            
            // Generate last 30 days of data
            const labels = [];
            const data = [];
            const cumulativeData = [];
            
            let cumulative = 0;
            const today = new Date();
            
            for (let i = 29; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dateString = date.toISOString().split('T')[0];
                
                const formattedDate = new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric'
                }).format(date);
                
                labels.push(formattedDate);
                
                const dailySolved = solvedByDay[dateString] || 0;
                data.push(dailySolved);
                
                cumulative += dailySolved;
                cumulativeData.push(cumulative);
            }
            
            // Create chart
            new Chart(progressChartCanvas, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Cumulative Problems Solved',
                            data: cumulativeData,
                            backgroundColor: 'rgba(93, 142, 255, 0.1)',
                            borderColor: 'rgba(93, 142, 255, 1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.2
                        },
                        {
                            label: 'Daily Problems Solved',
                            data: data,
                            backgroundColor: 'rgba(255, 144, 102, 0.7)',
                            borderColor: 'rgba(255, 144, 102, 1)',
                            borderWidth: 2,
                            type: 'bar'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Problems'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error("Error loading progress chart data:", error);
        });
}

// Initialize difficulty chart
function initializeDifficultyChart(userData) {
    const difficultyChartCanvas = document.getElementById('difficulty-chart');
    
    if (!difficultyChartCanvas) return;
    
    const solvedProblems = userData.solvedProblems || [];
    
    if (solvedProblems.length === 0) {
        // If no problems solved, show empty chart
        new Chart(difficultyChartCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Beginner', 'Intermediate', 'Advanced'],
                datasets: [{
                    data: [0, 0, 0],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(255, 159, 64, 0.6)',
                        'rgba(255, 99, 132, 0.6)'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'right',
                    }
                }
            }
        });
        return;
    }
    
    // Count problems by difficulty
    const problemPromises = solvedProblems.map(id => {
        return db.collection('problems').doc(id).get();
    });
    
    Promise.all(problemPromises)
        .then(results => {
            const difficultyCounts = {
                beginner: 0,
                intermediate: 0,
                advanced: 0
            };
            
            results.forEach(doc => {
                if (doc.exists) {
                    const problem = doc.data();
                    
                    if (problem.difficulty === 'beginner') {
                        difficultyCounts.beginner++;
                    } else if (problem.difficulty === 'intermediate') {
                        difficultyCounts.intermediate++;
                    } else if (problem.difficulty === 'advanced') {
                        difficultyCounts.advanced++;
                    }
                }
            });
            
            // Create chart
            new Chart(difficultyChartCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['Beginner', 'Intermediate', 'Advanced'],
                    datasets: [{
                        data: [
                            difficultyCounts.beginner,
                            difficultyCounts.intermediate,
                            difficultyCounts.advanced
                        ],
                        backgroundColor: [
                            'rgba(75, 192, 192, 0.6)',
                            'rgba(255, 159, 64, 0.6)',
                            'rgba(255, 99, 132, 0.6)'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right',
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error("Error loading difficulty data:", error);
        });
} 
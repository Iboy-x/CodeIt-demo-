// Admin Dashboard JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated and is admin
    checkAdminAuth();
    
    // Set up quick actions
    setupQuickActions();
});

// Check admin authentication
function checkAdminAuth() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        // Check if user is admin
        isUserAdmin(user.uid).then(isAdmin => {
            if (!isAdmin) {
                alert('You do not have admin privileges.');
                auth.signOut().then(() => {
                    window.location.href = 'login.html';
                });
            } else {
                // Update admin name display
                if (document.getElementById('admin-name')) {
                    document.getElementById('admin-name').textContent = user.displayName || user.email.split('@')[0];
                }
                
                // Load dashboard data
                setupDashboard();
            }
        });
    });
    
    // Set up logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'login.html';
        });
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

// Set up dashboard with data
function setupDashboard() {
    loadUserStats();
    loadProblemStats();
    loadUserActivity();
    loadCharts();
    loadSolutionsCount();
    setupEventListeners();
}

// Load user statistics
function loadUserStats() {
    const userCountElement = document.getElementById('user-count');
    const activeUserCountElement = document.getElementById('active-user-count');
    
    // Get user counts from Firestore
    db.collection('users').get()
        .then(querySnapshot => {
            const totalUsers = querySnapshot.size;
            let activeUsers = 0;
            
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
            
            querySnapshot.forEach(doc => {
                const userData = doc.data();
                if (userData.lastActive && userData.lastActive.toDate() > thirtyDaysAgo) {
                    activeUsers++;
                }
            });
            
            // Update UI
            if (userCountElement) userCountElement.textContent = totalUsers;
            if (activeUserCountElement) activeUserCountElement.textContent = activeUsers;
        })
        .catch(error => {
            console.error("Error loading user stats:", error);
        });
}

// Load problem statistics
function loadProblemStats() {
    // Get problem counts from Firestore
    db.collection('problems').get()
        .then(querySnapshot => {
            // Total problems
            const problemsCountElement = document.getElementById('problems-count');
            if (problemsCountElement) {
                problemsCountElement.textContent = querySnapshot.size;
            }
            
            // Count by status and collect languages
            let publishedCount = 0;
            let draftCount = 0;
            let archivedCount = 0;
            
            const languages = new Set();
            const difficulties = {
                'absolute-beginner': 0,
                'beginner': 0,
                'intermediate': 0,
                'advanced': 0
            };
            
            querySnapshot.forEach(doc => {
                const problem = doc.data();
                
                // Count by status
                if (problem.status === 'published') {
                    publishedCount++;
                } else if (problem.status === 'draft') {
                    draftCount++;
                } else if (problem.status === 'archived') {
                    archivedCount++;
                }
                
                // Collect languages
                if (problem.languages && Array.isArray(problem.languages)) {
                    problem.languages.forEach(lang => languages.add(lang));
                }
                
                // Count by difficulty
                if (difficulties.hasOwnProperty(problem.difficulty)) {
                    difficulties[problem.difficulty]++;
                }
            });
            
            // Update UI
            const publishedElement = document.getElementById('published-count');
            const draftElement = document.getElementById('draft-count');
            const archivedElement = document.getElementById('archived-count');
            const languagesElement = document.getElementById('languages-count');
            
            if (publishedElement) publishedElement.textContent = publishedCount;
            if (draftElement) draftElement.textContent = draftCount;
            if (archivedElement) archivedElement.textContent = archivedCount;
            if (languagesElement) languagesElement.textContent = languages.size;
            
            // Update difficulty chart
            updateDifficultyChart(difficulties);
        })
        .catch(error => {
            console.error("Error loading problem stats:", error);
        });
}

// Load solutions count
function loadSolutionsCount() {
    const solutionsElement = document.getElementById('solutions-count');
    
    if (!solutionsElement) return;
    
    // Count all solution submissions
    db.collection('activity')
        .where('type', '==', 'problem_solved')
        .get()
        .then(querySnapshot => {
            solutionsElement.textContent = querySnapshot.size;
        })
        .catch(error => {
            console.error("Error loading solutions count:", error);
        });
}

// Load user activity
function loadUserActivity() {
    const activityList = document.getElementById('user-activity-list');
    
    if (!activityList) return;
    
    // Clear previous content
    activityList.innerHTML = '';
    
    // Get recent activity
    db.collection('activity')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get()
        .then(querySnapshot => {
            if (querySnapshot.empty) {
                activityList.innerHTML = '<li class="empty-state">No user activity yet.</li>';
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
                
                // Activity icon based on type
                let iconHTML = '';
                if (activity.type === 'problem_solved') {
                    iconHTML = `<div class="activity-icon solved">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                                        <path fill="none" d="M0 0h24v24H0z"/>
                                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
                                    </svg>
                                </div>`;
                } else if (activity.type === 'problem_attempted') {
                    iconHTML = `<div class="activity-icon attempted">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                                        <path fill="none" d="M0 0h24v24H0z"/>
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
                                    </svg>
                                </div>`;
                } else if (activity.type === 'user_registered') {
                    iconHTML = `<div class="activity-icon account">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                                        <path fill="none" d="M0 0h24v24H0z"/>
                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor"/>
                                    </svg>
                                </div>`;
                } else {
                    iconHTML = `<div class="activity-icon default">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                                        <path fill="none" d="M0 0h24v24H0z"/>
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/>
                                    </svg>
                                </div>`;
                }
                
                // Activity description based on type
                let activityDescription = '';
                if (activity.type === 'problem_solved') {
                    activityDescription = `<span class="highlight">${activity.userName || 'User'}</span> solved problem <span class="highlight">${activity.problemTitle || 'Unknown Problem'}</span>`;
                } else if (activity.type === 'problem_attempted') {
                    activityDescription = `<span class="highlight">${activity.userName || 'User'}</span> attempted problem <span class="highlight">${activity.problemTitle || 'Unknown Problem'}</span>`;
                } else if (activity.type === 'user_registered') {
                    activityDescription = `<span class="highlight">${activity.userName || 'User'}</span> registered`;
                } else {
                    activityDescription = `<span class="highlight">${activity.userName || 'User'}</span> ${activity.description || 'performed an action'}`;
                }
                
                li.innerHTML = `
                    <div class="activity-item">
                        ${iconHTML}
                        <div class="activity-details">
                            <div class="activity-message">${activityDescription}</div>
                            <div class="activity-time">${formattedDate}</div>
                        </div>
                    </div>
                `;
                
                activityList.appendChild(li);
            });
        })
        .catch(error => {
            console.error("Error loading activity:", error);
            activityList.innerHTML = '<li class="error">Error loading activity data. Please try again.</li>';
        });
}

// Load charts
function loadCharts() {
    loadUserGrowthChart();
    loadProblemSolvedChart();
    loadPlatformActivityChart();
    loadProblemEngagementChart();
    loadActivityByHourChart();
}

// Load user growth chart
function loadUserGrowthChart() {
    const userChartCanvas = document.getElementById('user-growth-chart');
    
    if (!userChartCanvas) return;
    
    // Get user registration data from Firestore
    db.collection('users')
        .orderBy('createdAt')
        .get()
        .then(querySnapshot => {
            const userData = [];
            
            querySnapshot.forEach(doc => {
                const user = doc.data();
                if (user.createdAt) {
                    userData.push({
                        date: user.createdAt.toDate()
                    });
                }
            });
            
            // Process data for chart
            const today = new Date();
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(today.getMonth() - 6);
            
            // Create month buckets
            const months = [];
            const userCounts = [];
            let cumulativeUsers = 0;
            
            for (let i = 0; i <= 6; i++) {
                const monthDate = new Date(sixMonthsAgo);
                monthDate.setMonth(sixMonthsAgo.getMonth() + i);
                
                const monthLabel = monthDate.toLocaleString('default', { month: 'short' });
                months.push(monthLabel);
                
                // Count users registered in this month
                const usersThisMonth = userData.filter(user => {
                    const userDate = user.date;
                    return userDate.getMonth() === monthDate.getMonth() && 
                           userDate.getFullYear() === monthDate.getFullYear();
                }).length;
                
                cumulativeUsers += usersThisMonth;
                userCounts.push(cumulativeUsers);
            }
            
            // Create chart
            new Chart(userChartCanvas, {
                type: 'line',
                data: {
                    labels: months,
                    datasets: [{
                        label: 'Total Users',
                        data: userCounts,
                        borderColor: 'rgba(93, 142, 255, 1)',
                        backgroundColor: 'rgba(93, 142, 255, 0.1)',
                        fill: true,
                        tension: 0.3
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Users'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error("Error loading user growth chart:", error);
        });
}

// Load problem solved chart
function loadProblemSolvedChart() {
    const solvedChartCanvas = document.getElementById('problem-solved-chart');
    
    if (!solvedChartCanvas) return;
    
    // Get problem solving activity from Firestore
    db.collection('activity')
        .where('type', '==', 'problem_solved')
        .orderBy('timestamp')
        .get()
        .then(querySnapshot => {
            const solvedData = [];
            
            querySnapshot.forEach(doc => {
                const activity = doc.data();
                if (activity.timestamp) {
                    solvedData.push({
                        date: activity.timestamp.toDate()
                    });
                }
            });
            
            // Process data for chart - last 7 days
            const today = new Date();
            const labels = [];
            const data = [];
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(today.getDate() - i);
                date.setHours(0, 0, 0, 0);
                
                const nextDate = new Date(date);
                nextDate.setDate(date.getDate() + 1);
                
                const formattedDate = new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric'
                }).format(date);
                
                labels.push(formattedDate);
                
                // Count problems solved on this day
                const solvedToday = solvedData.filter(item => {
                    return item.date >= date && item.date < nextDate;
                }).length;
                
                data.push(solvedToday);
            }
            
            // Create chart
            new Chart(solvedChartCanvas, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Problems Solved',
                        data: data,
                        backgroundColor: 'rgba(74, 222, 128, 0.6)',
                        borderColor: 'rgba(74, 222, 128, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Solutions'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error("Error loading problem solved chart:", error);
        });
}

// Load platform activity chart
function loadPlatformActivityChart(days = 30) {
    const platformActivityChart = document.getElementById('platform-activity-chart');
    if (!platformActivityChart) return;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Format for Firestore queries
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endDate);
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);
    
    // Get user registrations and problem completions for the time period
    const userRegistrationsPromise = db.collection('users')
        .where('createdAt', '>=', startTimestamp)
        .where('createdAt', '<=', endTimestamp)
        .get();
    
    const problemCompletionsPromise = db.collection('activity')
        .where('type', '==', 'problem_solved')
        .where('timestamp', '>=', startTimestamp)
        .where('timestamp', '<=', endTimestamp)
        .get();
    
    const problemAttemptsPromise = db.collection('activity')
        .where('type', '==', 'problem_attempt')
        .where('timestamp', '>=', startTimestamp)
        .where('timestamp', '<=', endTimestamp)
        .get();
    
    Promise.all([userRegistrationsPromise, problemCompletionsPromise, problemAttemptsPromise])
        .then(([userRegistrations, problemCompletions, problemAttempts]) => {
            // Prepare date labels for chart
            const dateLabels = [];
            const registrationsData = [];
            const completionsData = [];
            const attemptsData = [];
            
            // Initialize data arrays with zeros
            for (let i = 0; i < days; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                dateLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                registrationsData[i] = 0;
                completionsData[i] = 0;
                attemptsData[i] = 0;
            }
            
            // Count registrations by day
            userRegistrations.forEach(doc => {
                const userData = doc.data();
                if (userData.createdAt) {
                    const date = userData.createdAt.toDate();
                    const dayIndex = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
                    if (dayIndex >= 0 && dayIndex < days) {
                        registrationsData[dayIndex]++;
                    }
                }
            });
            
            // Count completions by day
            problemCompletions.forEach(doc => {
                const activityData = doc.data();
                if (activityData.timestamp) {
                    const date = activityData.timestamp.toDate();
                    const dayIndex = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
                    if (dayIndex >= 0 && dayIndex < days) {
                        completionsData[dayIndex]++;
                    }
                }
            });
            
            // Count attempts by day
            problemAttempts.forEach(doc => {
                const activityData = doc.data();
                if (activityData.timestamp) {
                    const date = activityData.timestamp.toDate();
                    const dayIndex = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
                    if (dayIndex >= 0 && dayIndex < days) {
                        attemptsData[dayIndex]++;
                    }
                }
            });
            
            // Create chart
            new Chart(platformActivityChart, {
                type: 'line',
                data: {
                    labels: dateLabels,
                    datasets: [
                        {
                            label: 'New Users',
                            data: registrationsData,
                            borderColor: '#5d8eff',
                            backgroundColor: 'rgba(93, 142, 255, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Problems Solved',
                            data: completionsData,
                            borderColor: '#4ade80',
                            backgroundColor: 'rgba(74, 222, 128, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Problem Attempts',
                            data: attemptsData,
                            borderColor: '#ff9066',
                            backgroundColor: 'rgba(255, 144, 102, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
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
                                text: 'Count'
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
            console.error("Error loading platform activity chart:", error);
        });
}

// Load problem engagement chart
function loadProblemEngagementChart() {
    const problemEngagementChart = document.getElementById('problem-engagement-chart');
    if (!problemEngagementChart) return;
    
    db.collection('problems').get()
        .then(querySnapshot => {
            // Count problems by difficulty
            const difficulties = {
                'absolute-beginner': 0,
                'beginner': 0,
                'intermediate': 0,
                'advanced': 0
            };
            
            querySnapshot.forEach(doc => {
                const problem = doc.data();
                if (difficulties.hasOwnProperty(problem.difficulty)) {
                    difficulties[problem.difficulty]++;
                }
            });
            
            // Create chart
            new Chart(problemEngagementChart, {
                type: 'doughnut',
                data: {
                    labels: ['Absolute Beginner', 'Beginner', 'Intermediate', 'Advanced'],
                    datasets: [{
                        data: [
                            difficulties['absolute-beginner'],
                            difficulties['beginner'],
                            difficulties['intermediate'],
                            difficulties['advanced']
                        ],
                        backgroundColor: [
                            '#4ade80',
                            '#5d8eff',
                            '#ff9066',
                            '#f87171'
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
            console.error("Error loading problem engagement chart:", error);
        });
}

// Load activity by hour chart
function loadActivityByHourChart() {
    const activityByHourChart = document.getElementById('activity-by-hour-chart');
    if (!activityByHourChart) return;
    
    // Get user activity for the past 2 weeks
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoTimestamp = firebase.firestore.Timestamp.fromDate(twoWeeksAgo);
    
    db.collection('activity')
        .where('timestamp', '>=', twoWeeksAgoTimestamp)
        .get()
        .then(querySnapshot => {
            // Count activity by hour
            const activityByHour = Array(24).fill(0);
            
            querySnapshot.forEach(doc => {
                const activityData = doc.data();
                if (activityData.timestamp) {
                    const hour = activityData.timestamp.toDate().getHours();
                    activityByHour[hour]++;
                }
            });
            
            // Create labels for hours
            const hourLabels = Array(24).fill().map((_, i) => {
                return i === 0 ? '12 AM' : 
                       i < 12 ? `${i} AM` : 
                       i === 12 ? '12 PM' : 
                       `${i - 12} PM`;
            });
            
            // Create chart
            new Chart(activityByHourChart, {
                type: 'bar',
                data: {
                    labels: hourLabels,
                    datasets: [{
                        label: 'User Activity',
                        data: activityByHour,
                        backgroundColor: 'rgba(93, 142, 255, 0.6)',
                        borderColor: '#5d8eff',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Activity Count'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Hour of Day'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error("Error loading activity by hour chart:", error);
        });
}

// Update difficulty chart
function updateDifficultyChart(difficulties) {
    const difficultyChartCanvas = document.getElementById('difficulty-chart');
    
    if (!difficultyChartCanvas) return;
    
    // Create chart
    new Chart(difficultyChartCanvas, {
        type: 'doughnut',
        data: {
            labels: ['Absolute Beginner', 'Beginner', 'Intermediate', 'Advanced'],
            datasets: [{
                data: [
                    difficulties['absolute-beginner'],
                    difficulties['beginner'],
                    difficulties['intermediate'],
                    difficulties['advanced']
                ],
                backgroundColor: [
                    'rgba(74, 222, 128, 0.6)',
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
}

// Set up quick actions
function setupQuickActions() {
    // Backup data action
    const backupBtn = document.getElementById('backup-data');
    if (backupBtn) {
        backupBtn.addEventListener('click', backupData);
    }
    
    // Restore data action
    const restoreBtn = document.getElementById('restore-data');
    if (restoreBtn) {
        restoreBtn.addEventListener('click', restoreData);
    }
}

// Backup data to JSON file
function backupData() {
    // Get all problems
    db.collection('problems').get()
        .then(querySnapshot => {
            const problems = [];
            
            querySnapshot.forEach(doc => {
                problems.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Create JSON file
            const data = {
                problems: problems,
                exportedAt: new Date().toISOString(),
                exportedBy: auth.currentUser ? auth.currentUser.email : 'unknown'
            };
            
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Create download link
            const a = document.createElement('a');
            a.href = url;
            a.download = `codeit_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // Log activity
            logActivity('Data backed up', 'backup_data');
        })
        .catch(error => {
            console.error("Error backing up data:", error);
            alert('Error backing up data: ' + error.message);
        });
}

// Restore data from JSON file
function restoreData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        
        reader.onload = event => {
            try {
                const data = JSON.parse(event.target.result);
                
                if (confirm(`This will import ${data.problems ? data.problems.length : 0} problems. Continue?`)) {
                    importDataToFirestore(data);
                }
            } catch (error) {
                console.error("Error parsing JSON:", error);
                alert('Error parsing backup file: ' + error.message);
            }
        };
        
        reader.readAsText(file);
    };
    
    input.click();
}

// Import data to Firestore
function importDataToFirestore(data) {
    const batch = db.batch();
    
    // Import problems
    if (data.problems && Array.isArray(data.problems)) {
        data.problems.forEach(problem => {
            const id = problem.id;
            delete problem.id;
            batch.set(db.collection('problems').doc(id), problem);
        });
    }
    
    // Execute the batch
    batch.commit()
        .then(() => {
            alert('Data imported successfully!');
            logActivity('Data imported', 'import_data');
            window.location.reload();
        })
        .catch(error => {
            console.error('Error importing data:', error);
            alert('Error importing data: ' + error.message);
        });
}

// Log admin activity
function logActivity(activity, type) {
    const currentUser = auth.currentUser;
    
    if (!currentUser) return;
    
    db.collection('admin_activity').add({
        activity: activity,
        type: type,
        adminId: currentUser.uid,
        adminEmail: currentUser.email,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => {
        console.error('Error logging activity:', error);
    });
}

// Add this function to loadCharts()
function loadPlatformActivityChart(days = 30) {
    const platformActivityChart = document.getElementById('platform-activity-chart');
    if (!platformActivityChart) return;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Format for Firestore queries
    const endTimestamp = firebase.firestore.Timestamp.fromDate(endDate);
    const startTimestamp = firebase.firestore.Timestamp.fromDate(startDate);
    
    // Get user registrations and problem completions for the time period
    const userRegistrationsPromise = db.collection('users')
        .where('createdAt', '>=', startTimestamp)
        .where('createdAt', '<=', endTimestamp)
        .get();
    
    const problemCompletionsPromise = db.collection('activity')
        .where('type', '==', 'problem_solved')
        .where('timestamp', '>=', startTimestamp)
        .where('timestamp', '<=', endTimestamp)
        .get();
    
    const problemAttemptsPromise = db.collection('activity')
        .where('type', '==', 'problem_attempt')
        .where('timestamp', '>=', startTimestamp)
        .where('timestamp', '<=', endTimestamp)
        .get();
    
    Promise.all([userRegistrationsPromise, problemCompletionsPromise, problemAttemptsPromise])
        .then(([userRegistrations, problemCompletions, problemAttempts]) => {
            // Prepare date labels for chart
            const dateLabels = [];
            const registrationsData = [];
            const completionsData = [];
            const attemptsData = [];
            
            // Initialize data arrays with zeros
            for (let i = 0; i < days; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + i);
                dateLabels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                registrationsData[i] = 0;
                completionsData[i] = 0;
                attemptsData[i] = 0;
            }
            
            // Count registrations by day
            userRegistrations.forEach(doc => {
                const userData = doc.data();
                if (userData.createdAt) {
                    const date = userData.createdAt.toDate();
                    const dayIndex = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
                    if (dayIndex >= 0 && dayIndex < days) {
                        registrationsData[dayIndex]++;
                    }
                }
            });
            
            // Count completions by day
            problemCompletions.forEach(doc => {
                const activityData = doc.data();
                if (activityData.timestamp) {
                    const date = activityData.timestamp.toDate();
                    const dayIndex = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
                    if (dayIndex >= 0 && dayIndex < days) {
                        completionsData[dayIndex]++;
                    }
                }
            });
            
            // Count attempts by day
            problemAttempts.forEach(doc => {
                const activityData = doc.data();
                if (activityData.timestamp) {
                    const date = activityData.timestamp.toDate();
                    const dayIndex = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
                    if (dayIndex >= 0 && dayIndex < days) {
                        attemptsData[dayIndex]++;
                    }
                }
            });
            
            // Create chart
            new Chart(platformActivityChart, {
                type: 'line',
                data: {
                    labels: dateLabels,
                    datasets: [
                        {
                            label: 'New Users',
                            data: registrationsData,
                            borderColor: '#5d8eff',
                            backgroundColor: 'rgba(93, 142, 255, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Problems Solved',
                            data: completionsData,
                            borderColor: '#4ade80',
                            backgroundColor: 'rgba(74, 222, 128, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
                        },
                        {
                            label: 'Problem Attempts',
                            data: attemptsData,
                            borderColor: '#ff9066',
                            backgroundColor: 'rgba(255, 144, 102, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.4
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
                                text: 'Count'
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
            console.error("Error loading platform activity chart:", error);
        });
}

// Add this function to loadCharts()
function loadProblemEngagementChart() {
    const problemEngagementChart = document.getElementById('problem-engagement-chart');
    if (!problemEngagementChart) return;
    
    db.collection('problems').get()
        .then(querySnapshot => {
            // Count problems by difficulty
            const difficulties = {
                'absolute-beginner': 0,
                'beginner': 0,
                'intermediate': 0,
                'advanced': 0
            };
            
            querySnapshot.forEach(doc => {
                const problem = doc.data();
                if (difficulties.hasOwnProperty(problem.difficulty)) {
                    difficulties[problem.difficulty]++;
                }
            });
            
            // Create chart
            new Chart(problemEngagementChart, {
                type: 'doughnut',
                data: {
                    labels: ['Absolute Beginner', 'Beginner', 'Intermediate', 'Advanced'],
                    datasets: [{
                        data: [
                            difficulties['absolute-beginner'],
                            difficulties['beginner'],
                            difficulties['intermediate'],
                            difficulties['advanced']
                        ],
                        backgroundColor: [
                            '#4ade80',
                            '#5d8eff',
                            '#ff9066',
                            '#f87171'
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
            console.error("Error loading problem engagement chart:", error);
        });
}

// Add this function to loadCharts()
function loadActivityByHourChart() {
    const activityByHourChart = document.getElementById('activity-by-hour-chart');
    if (!activityByHourChart) return;
    
    // Get user activity for the past 2 weeks
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const twoWeeksAgoTimestamp = firebase.firestore.Timestamp.fromDate(twoWeeksAgo);
    
    db.collection('activity')
        .where('timestamp', '>=', twoWeeksAgoTimestamp)
        .get()
        .then(querySnapshot => {
            // Count activity by hour
            const activityByHour = Array(24).fill(0);
            
            querySnapshot.forEach(doc => {
                const activityData = doc.data();
                if (activityData.timestamp) {
                    const hour = activityData.timestamp.toDate().getHours();
                    activityByHour[hour]++;
                }
            });
            
            // Create labels for hours
            const hourLabels = Array(24).fill().map((_, i) => {
                return i === 0 ? '12 AM' : 
                       i < 12 ? `${i} AM` : 
                       i === 12 ? '12 PM' : 
                       `${i - 12} PM`;
            });
            
            // Create chart
            new Chart(activityByHourChart, {
                type: 'bar',
                data: {
                    labels: hourLabels,
                    datasets: [{
                        label: 'User Activity',
                        data: activityByHour,
                        backgroundColor: 'rgba(93, 142, 255, 0.6)',
                        borderColor: '#5d8eff',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Activity Count'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Hour of Day'
                            }
                        }
                    }
                }
            });
        })
        .catch(error => {
            console.error("Error loading activity by hour chart:", error);
        });
}

// Add this function to the setupDashboard function
function setupEventListeners() {
    const timeRangeSelector = document.getElementById('time-range-selector');
    if (timeRangeSelector) {
        timeRangeSelector.addEventListener('change', function() {
            const days = parseInt(this.value);
            // Clear existing chart
            const chartContainer = document.getElementById('platform-activity-chart');
            if (chartContainer) {
                // Destroy existing chart instance if it exists
                const existingChart = Chart.getChart(chartContainer);
                if (existingChart) {
                    existingChart.destroy();
                }
                // Load new chart with selected time range
                loadPlatformActivityChart(days);
            }
        });
    }
}

// Make sure to call this in your main init function
setupEventListeners();

// Add a function to search users
function setupUserSearch() {
    const userSearchInput = document.getElementById('user-search');
    const userSearchResults = document.getElementById('user-search-results');
    
    if (!userSearchInput || !userSearchResults) return;
    
    let searchTimeout;
    
    userSearchInput.addEventListener('input', function() {
        const query = this.value.trim();
        
        // Clear previous timeout
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        
        // Clear results if query is empty
        if (!query) {
            userSearchResults.innerHTML = '';
            userSearchResults.style.display = 'none';
            return;
        }
        
        // Set a timeout to prevent too many queries while typing
        searchTimeout = setTimeout(() => {
            // Search for users
            db.collection('users')
                .where('email', '>=', query)
                .where('email', '<=', query + '\uf8ff')
                .limit(5)
                .get()
                .then(querySnapshot => {
                    // Clear previous results
                    userSearchResults.innerHTML = '';
                    
                    if (querySnapshot.empty) {
                        userSearchResults.innerHTML = '<div class="search-no-results">No users found</div>';
                        userSearchResults.style.display = 'block';
                        return;
                    }
                    
                    // Display results
                    querySnapshot.forEach(doc => {
                        const userData = doc.data();
                        const userItem = document.createElement('div');
                        userItem.className = 'search-result-item';
                        userItem.innerHTML = `
                            <div class="search-result-user">
                                <div class="user-avatar">
                                    <img src="${userData.photoURL || '../assets/default-avatar.png'}" alt="${userData.displayName || userData.email}">
                                </div>
                                <div class="user-info">
                                    <div class="user-name">${userData.displayName || userData.email.split('@')[0]}</div>
                                    <div class="user-email">${userData.email}</div>
                                </div>
                            </div>
                            <a href="user-details.html?id=${doc.id}" class="btn btn-sm">View</a>
                        `;
                        userSearchResults.appendChild(userItem);
                    });
                    
                    userSearchResults.style.display = 'block';
                })
                .catch(error => {
                    console.error("Error searching users:", error);
                    userSearchResults.innerHTML = '<div class="search-error">Error searching users</div>';
                    userSearchResults.style.display = 'block';
                });
        }, 300);
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', function(e) {
        if (!userSearchInput.contains(e.target) && !userSearchResults.contains(e.target)) {
            userSearchResults.style.display = 'none';
        }
    });
}

// Make sure to call this in your main init function
setupUserSearch(); 
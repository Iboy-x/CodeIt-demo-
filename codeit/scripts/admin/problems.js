// Problems Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated and is admin
    checkAdminAuth();
    
    // Set up filters
    setupFilters();
});

// Check admin authentication
function checkAdminAuth() {
    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        console.log("User authenticated:", user.email);
        
        // Check if we have this user in Firestore first
        db.collection('users').doc(user.uid).get()
            .then(doc => {
                // If user doesn't exist in Firestore yet, create them
                if (!doc.exists) {
                    return db.collection('users').doc(user.uid).set({
                        email: user.email,
                        displayName: user.displayName || user.email.split('@')[0],
                        isAdmin: true, // Make them admin by default
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else if (!doc.data().isAdmin) {
                    // If user exists but isn't admin, make them admin
                    return db.collection('users').doc(user.uid).update({
                        isAdmin: true,
                        lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                return Promise.resolve();
            })
            .then(() => {
                // After ensuring user is in Firestore, load problems
                loadProblems();
            })
            .catch(error => {
                console.error("Error in checkAdminAuth:", error);
                alert("Authentication error: " + error.message);
            });
    });
    
    // Set up logout button
    document.getElementById('logout-btn').addEventListener('click', () => {
        auth.signOut();
        window.location.href = 'login.html';
    });
}

// Load problems from Firestore
function loadProblems(filters = {}) {
    const tableBody = document.getElementById('problems-table-body');
    
    // Clear previous content
    tableBody.innerHTML = '<tr><td colspan="7" class="table-loading">Loading problems...</td></tr>';
    
    // Create a query - don't filter by status in the query to see all problems
    let query = db.collection('problems');
    
    // Apply difficulty filter if needed
    if (filters.difficulty && filters.difficulty !== 'all') {
        query = query.where('difficulty', '==', filters.difficulty);
    }
    
    // Order by title
    query = query.orderBy('title');
    
    // Execute query
    query.get()
        .then(querySnapshot => {
            // Clear loading message
            tableBody.innerHTML = '';
            
            if (querySnapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="7" class="table-empty">No problems found</td></tr>';
                return;
            }
            
            // Get all problems
            let problems = [];
            querySnapshot.forEach(doc => {
                problems.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Apply status filter client-side (to allow seeing all statuses)
            if (filters.status && filters.status !== 'all') {
                problems = problems.filter(problem => problem.status === filters.status);
            }
            
            // Apply search filter if needed
            if (filters.search && filters.search.trim() !== '') {
                const searchTerm = filters.search.toLowerCase().trim();
                problems = problems.filter(problem => 
                    problem.title.toLowerCase().includes(searchTerm) || 
                    (problem.description && problem.description.toLowerCase().includes(searchTerm)) ||
                    problem.id.toLowerCase().includes(searchTerm)
                );
            }
            
            // Check if we have any problems after filtering
            if (problems.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="table-empty">No problems match your filters</td></tr>';
                return;
            }
            
            // Render problems
            problems.forEach(problem => {
                const row = document.createElement('tr');
                row.className = problem.status === 'published' ? 'published' : (problem.status === 'draft' ? 'draft' : 'archived');
                
                const date = problem.updatedAt ? new Date(problem.updatedAt.toDate()) : new Date();
                const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                
                row.innerHTML = `
                    <td><a href="problem-editor.html?id=${problem.id}" class="problem-title">${problem.title}</a></td>
                    <td>${problem.id}</td>
                    <td>${formatDifficulty(problem.difficulty)}</td>
                    <td><span class="status-badge ${problem.status}">${problem.status}</span></td>
                    <td>${problem.createdBy || 'Admin'}</td>
                    <td>${formattedDate}</td>
                    <td class="actions">
                        <button class="btn-icon edit-btn" data-id="${problem.id}" title="Edit"><i class="icon-edit"></i></button>
                        <button class="btn-icon toggle-status-btn" data-id="${problem.id}" data-status="${problem.status}" title="Toggle Status">
                            ${getStatusToggleIcon(problem.status)}
                        </button>
                        <button class="btn-icon delete-btn" data-id="${problem.id}" title="Delete"><i class="icon-delete"></i></button>
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
            
            // Add event listeners for action buttons
            addProblemActionListeners();
        })
        .catch(error => {
            console.error('Error loading problems:', error);
            tableBody.innerHTML = `<tr><td colspan="7" class="table-error">Error loading problems: ${error.message}</td></tr>`;
        });
}

// Format difficulty for display
function formatDifficulty(difficulty) {
    switch (difficulty) {
        case 'absolute-beginner':
            return 'Absolute Beginner';
        case 'beginner':
            return 'Beginner';
        case 'intermediate':
            return 'Intermediate';
        default:
            return difficulty;
    }
}

// Capitalize first letter of string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Get status toggle icon based on current status
function getStatusToggleIcon(status) {
    switch (status) {
        case 'published':
            return '<i class="icon-unpublish"></i>'; // Icon to archive
        case 'draft':
            return '<i class="icon-publish"></i>'; // Icon to publish
        case 'archived':
            return '<i class="icon-restore"></i>'; // Icon to restore
        default:
            return '<i class="icon-publish"></i>';
    }
}

// Add event listeners for problem action buttons
function addProblemActionListeners() {
    // Edit button
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const problemId = btn.dataset.id;
            window.location.href = `problem-editor.html?id=${problemId}`;
        });
    });
    
    // Toggle status button
    document.querySelectorAll('.toggle-status-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const problemId = btn.dataset.id;
            const currentStatus = btn.dataset.status;
            
            // Determine next status
            let newStatus;
            switch (currentStatus) {
                case 'published':
                    newStatus = 'archived';
                    break;
                case 'draft':
                    newStatus = 'published';
                    break;
                case 'archived':
                    newStatus = 'draft';
                    break;
                default:
                    newStatus = 'draft';
            }
            
            // Update status in Firestore
            db.collection('problems').doc(problemId).update({
                status: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                // Log activity
                const statusVerb = newStatus === 'published' ? 'published' : 
                                  (newStatus === 'archived' ? 'archived' : 'set to draft');
                
                logActivity(`Problem ${problemId} ${statusVerb}`, `problem_${newStatus}`);
                
                // Reload problems
                loadProblems(getFilters());
            })
            .catch(error => {
                console.error('Error updating problem status:', error);
                alert('Error updating problem status: ' + error.message);
            });
        });
    });
    
    // Delete button
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const problemId = btn.dataset.id;
            
            // Confirm deletion
            if (confirm(`Are you sure you want to delete problem "${problemId}"? This cannot be undone.`)) {
                // Delete from Firestore
                db.collection('problems').doc(problemId).delete()
                .then(() => {
                    // Log activity
                    logActivity(`Problem ${problemId} deleted`, 'problem_deleted');
                    
                    // Reload problems
                    loadProblems(getFilters());
                })
                .catch(error => {
                    console.error('Error deleting problem:', error);
                    alert('Error deleting problem: ' + error.message);
                });
            }
        });
    });
}

// Helper to get current filters
function getFilters() {
    return {
        difficulty: document.getElementById('difficulty-filter').value,
        status: document.getElementById('status-filter').value,
        search: document.getElementById('problem-search').value
    };
}

// Set up filter functionality
function setupFilters() {
    const difficultyFilter = document.getElementById('difficulty-filter');
    const statusFilter = document.getElementById('status-filter');
    const searchInput = document.getElementById('problem-search');
    
    // Function to apply all filters
    const applyFilters = () => {
        const filters = {
            difficulty: difficultyFilter.value,
            status: statusFilter.value,
            search: searchInput.value
        };
        
        loadProblems(filters);
    };
    
    // Add event listeners to filters
    difficultyFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    
    // Add debounced search
    let debounceTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(applyFilters, 300);
    });
} 
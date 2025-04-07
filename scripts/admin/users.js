// User Management JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated and is admin
    checkAdminAuth();
    
    // Set up filters
    setupFilters();
    
    // Set up modals
    setupModals();
});

// Check admin authentication
function checkAdminAuth() {
    // First check if bypass is enabled
    const adminBypass = localStorage.getItem('adminBypass');
    if (adminBypass === 'true') {
        console.log("Using admin bypass");
        loadUsers();
        return;
    }

    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        // Check if user is admin
        isUserAdmin().then(isAdmin => {
            if (!isAdmin) {
                alert('You do not have admin privileges.');
                auth.signOut().then(() => {
                    window.location.href = 'login.html';
                });
            } else {
                // Load users data
                loadUsers();
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

// Load users from Firestore
function loadUsers(filters = {}) {
    const tableBody = document.getElementById('users-table-body');
    
    // Clear previous content
    tableBody.innerHTML = '<tr><td colspan="7" class="table-loading">Loading users...</td></tr>';
    
    // Get users from Firestore
    db.collection('users').get()
        .then(querySnapshot => {
            // Clear loading message
            tableBody.innerHTML = '';
            
            if (querySnapshot.empty) {
                tableBody.innerHTML = '<tr><td colspan="7" class="table-empty">No users found</td></tr>';
                return;
            }
            
            // Get all users
            let users = [];
            querySnapshot.forEach(doc => {
                users.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            // Apply role filter
            if (filters.role && filters.role !== 'all') {
                const isAdmin = filters.role === 'admin';
                users = users.filter(user => user.isAdmin === isAdmin);
            }
            
            // Apply status filter
            if (filters.status && filters.status !== 'all') {
                const isActive = filters.status === 'active';
                users = users.filter(user => user.disabled !== isActive);
            }
            
            // Apply search filter
            if (filters.search) {
                const searchTerm = filters.search.toLowerCase();
                users = users.filter(user => 
                    (user.displayName && user.displayName.toLowerCase().includes(searchTerm)) ||
                    (user.email && user.email.toLowerCase().includes(searchTerm))
                );
            }
            
            // Check if any users match the filters
            if (users.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="table-empty">No users match the selected filters</td></tr>';
                return;
            }
            
            // Sort users by name
            users.sort((a, b) => {
                const nameA = a.displayName || a.email || '';
                const nameB = b.displayName || b.email || '';
                return nameA.localeCompare(nameB);
            });
            
            // Render users table
            users.forEach(user => {
                const row = document.createElement('tr');
                
                // Format dates
                const lastLogin = user.lastLogin ? new Date(user.lastLogin.toDate()).toLocaleString() : 'Never';
                const created = user.createdAt ? new Date(user.createdAt.toDate()).toLocaleString() : 'Unknown';
                
                row.innerHTML = `
                    <td>${user.displayName || '-'}</td>
                    <td>${user.email}</td>
                    <td>${user.isAdmin ? '<span class="badge admin">Admin</span>' : '<span class="badge user">User</span>'}</td>
                    <td>${user.disabled ? '<span class="badge disabled">Disabled</span>' : '<span class="badge active">Active</span>'}</td>
                    <td>${lastLogin}</td>
                    <td>${created}</td>
                    <td class="actions">
                        <button class="edit-btn" data-id="${user.id}">Edit</button>
                        ${user.isAdmin ? '' : `<button class="delete-btn" data-id="${user.id}">Delete</button>`}
                    </td>
                `;
                
                tableBody.appendChild(row);
            });
            
            // Add event listeners to action buttons
            addActionButtonListeners();
        })
        .catch(error => {
            console.error('Error loading users:', error);
            tableBody.innerHTML = `<tr><td colspan="7" class="table-error">Error loading users: ${error.message}</td></tr>`;
        });
}

// Add event listeners to action buttons
function addActionButtonListeners() {
    // Edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-id');
            openEditUserModal(userId);
        });
    });
    
    // Delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const userId = btn.getAttribute('data-id');
            const userName = btn.closest('tr').querySelector('td:first-child').textContent;
            
            if (confirm(`Are you sure you want to delete the user "${userName}"? This action cannot be undone.`)) {
                deleteUser(userId);
            }
        });
    });
}

// Delete a user
function deleteUser(userId) {
    db.collection('users').doc(userId).delete()
        .then(() => {
            alert('User deleted successfully!');
            loadUsers(); // Reload users list
        })
        .catch(error => {
            console.error('Error deleting user:', error);
            alert('Error deleting user. Please try again.');
        });
}

// Set up filter functionality
function setupFilters() {
    const roleFilter = document.getElementById('role-filter');
    const statusFilter = document.getElementById('status-filter');
    const searchInput = document.getElementById('user-search');
    
    // Function to apply all filters
    const applyFilters = () => {
        const filters = {
            role: roleFilter.value,
            status: statusFilter.value,
            search: searchInput.value
        };
        
        loadUsers(filters);
    };
    
    // Add event listeners to filters
    roleFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    
    // Add debounced search
    let debounceTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(applyFilters, 300);
    });
}

// Set up modal functionality
function setupModals() {
    // Add user button
    document.getElementById('add-user-btn').addEventListener('click', openAddUserModal);
    document.getElementById('add-user-link').addEventListener('click', e => {
        e.preventDefault();
        openAddUserModal();
    });
    
    // Admin management
    document.getElementById('add-admin-link').addEventListener('click', e => {
        e.preventDefault();
        openAdminModal();
    });
    
    // Close buttons
    document.getElementById('close-user-modal').addEventListener('click', closeUserModal);
    document.getElementById('close-admin-modal').addEventListener('click', closeAdminModal);
    document.getElementById('cancel-user-btn').addEventListener('click', closeUserModal);
    
    // User form submission
    document.getElementById('user-form').addEventListener('submit', e => {
        e.preventDefault();
        saveUser();
    });
    
    // Admin management buttons
    document.getElementById('grant-admin-btn').addEventListener('click', grantAdminPrivileges);
    document.getElementById('revoke-admin-btn').addEventListener('click', revokeAdminPrivileges);
    
    // Close modals when clicking outside
    window.addEventListener('click', e => {
        const userModal = document.getElementById('user-modal');
        const adminModal = document.getElementById('admin-modal');
        
        if (e.target === userModal) {
            closeUserModal();
        }
        
        if (e.target === adminModal) {
            closeAdminModal();
        }
    });
}

// Open add user modal
function openAddUserModal() {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');
    const passwordGroup = document.getElementById('password-group');
    
    // Set modal title
    title.textContent = 'Add New User';
    
    // Show password field
    passwordGroup.style.display = 'block';
    
    // Reset form
    form.reset();
    
    // Set form mode
    form.dataset.mode = 'add';
    delete form.dataset.userId;
    
    // Show modal
    modal.style.display = 'flex';
}

// Open edit user modal
function openEditUserModal(userId) {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');
    const passwordGroup = document.getElementById('password-group');
    
    // Set modal title
    title.textContent = 'Edit User';
    
    // Hide password field (we don't want to change password when editing)
    passwordGroup.style.display = 'none';
    
    // Get user data
    db.collection('users').doc(userId).get()
        .then(doc => {
            if (!doc.exists) {
                alert('User not found');
                closeUserModal();
                return;
            }
            
            const user = doc.data();
            
            // Fill form with user data
            document.getElementById('user-name').value = user.displayName || '';
            document.getElementById('user-email').value = user.email || '';
            document.getElementById('user-role').value = user.isAdmin ? 'admin' : 'user';
            document.getElementById('user-status').value = user.disabled ? 'disabled' : 'active';
            
            // Store editing state
            form.dataset.mode = 'edit';
            form.dataset.userId = userId;
            
            // Show modal
            modal.style.display = 'flex';
        })
        .catch(error => {
            console.error('Error getting user:', error);
            alert('Error getting user: ' + error.message);
        });
}

// Close user modal
function closeUserModal() {
    const modal = document.getElementById('user-modal');
    modal.style.display = 'none';
}

// Open admin modal
function openAdminModal() {
    const modal = document.getElementById('admin-modal');
    const resultDiv = document.getElementById('admin-result');
    
    // Reset form
    document.getElementById('admin-email').value = '';
    resultDiv.style.display = 'none';
    
    // Show modal
    modal.style.display = 'flex';
}

// Close admin modal
function closeAdminModal() {
    const modal = document.getElementById('admin-modal');
    modal.style.display = 'none';
}

// Save user (add or edit)
function saveUser() {
    const form = document.getElementById('user-form');
    const mode = form.dataset.mode;
    const userId = form.dataset.userId;
    
    // Get form values
    const name = document.getElementById('user-name').value;
    const email = document.getElementById('user-email').value;
    const password = document.getElementById('user-password').value;
    const role = document.getElementById('user-role').value;
    const status = document.getElementById('user-status').value;
    
    if (mode === 'add') {
        // Create user in Firebase Auth (would normally be done via Firebase Admin SDK or Cloud Functions)
        // For this example, we'll simulate it by adding to Firestore with a random ID
        const newUserId = Math.random().toString(36).substring(2, 15);
        
        db.collection('users').doc(newUserId).set({
            displayName: name,
            email: email,
            isAdmin: role === 'admin',
            disabled: status === 'disabled',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            // In a real app, you'd use Firebase Auth to manage passwords securely
            // This is just for the demo
            passwordSet: true
        })
        .then(() => {
            alert('User added successfully!');
            closeUserModal();
            loadUsers();
        })
        .catch(error => {
            console.error('Error adding user:', error);
            alert('Error adding user: ' + error.message);
        });
    } else if (mode === 'edit') {
        // Update user in Firestore
        db.collection('users').doc(userId).update({
            displayName: name,
            email: email,
            isAdmin: role === 'admin',
            disabled: status === 'disabled',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            alert('User updated successfully!');
            closeUserModal();
            loadUsers();
        })
        .catch(error => {
            console.error('Error updating user:', error);
            alert('Error updating user: ' + error.message);
        });
    }
}

// Grant admin privileges
function grantAdminPrivileges() {
    const email = document.getElementById('admin-email').value;
    const resultDiv = document.getElementById('admin-result');
    
    if (!email) {
        showAdminResult('Please enter a valid email address.', 'error');
        return;
    }
    
    // Find user by email
    db.collection('users').where('email', '==', email).get()
        .then(querySnapshot => {
            if (querySnapshot.empty) {
                showAdminResult('User not found with that email address.', 'error');
                return;
            }
            
            // Get the first user (should be only one)
            const userDoc = querySnapshot.docs[0];
            const userId = userDoc.id;
            const userData = userDoc.data();
            
            if (userData.isAdmin) {
                showAdminResult('User already has admin privileges.', 'info');
                return;
            }
            
            // Update user to be admin
            return db.collection('users').doc(userId).update({
                isAdmin: true,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                showAdminResult(`Admin privileges granted to ${email}.`, 'success');
                
                // Log activity
                logActivity(`Granted admin privileges to ${email}`, 'admin_added');
                
                // Reload users list
                loadUsers();
            });
        })
        .catch(error => {
            console.error('Error granting admin privileges:', error);
            showAdminResult(`Error: ${error.message}`, 'error');
        });
}

// Revoke admin privileges
function revokeAdminPrivileges() {
    const email = document.getElementById('admin-email').value;
    const resultDiv = document.getElementById('admin-result');
    
    if (!email) {
        showAdminResult('Please enter a valid email address.', 'error');
        return;
    }
    
    // Find user by email
    db.collection('users').where('email', '==', email).get()
        .then(querySnapshot => {
            if (querySnapshot.empty) {
                showAdminResult('User not found with that email address.', 'error');
                return;
            }
            
            // Get the first user (should be only one)
            const userDoc = querySnapshot.docs[0];
            const userId = userDoc.id;
            const userData = userDoc.data();
            
            if (!userData.isAdmin) {
                showAdminResult('User does not have admin privileges.', 'info');
                return;
            }
            
            // Prevent revoking your own admin privileges
            const currentUser = auth.currentUser;
            if (userData.email === currentUser.email) {
                showAdminResult('You cannot revoke your own admin privileges.', 'error');
                return;
            }
            
            // Update user to remove admin
            return db.collection('users').doc(userId).update({
                isAdmin: false,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                showAdminResult(`Admin privileges revoked from ${email}.`, 'success');
                
                // Log activity
                logActivity(`Revoked admin privileges from ${email}`, 'admin_removed');
                
                // Reload users list
                loadUsers();
            });
        })
        .catch(error => {
            console.error('Error revoking admin privileges:', error);
            showAdminResult(`Error: ${error.message}`, 'error');
        });
}

// Show admin result message
function showAdminResult(message, type) {
    const resultDiv = document.getElementById('admin-result');
    resultDiv.textContent = message;
    resultDiv.style.display = 'block';
    
    // Clear previous classes
    resultDiv.className = 'form-result';
    
    // Add appropriate class
    if (type === 'success') {
        resultDiv.classList.add('success');
    } else if (type === 'error') {
        resultDiv.classList.add('error');
    } else if (type === 'info') {
        resultDiv.classList.add('info');
    }
}

// Log activity to Firestore
function logActivity(description, type) {
    const user = auth.currentUser;
    if (!user) return;
    
    db.collection('activity').add({
        type: type,
        description: description,
        user: user.displayName || user.email,
        userId: user.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
    .catch(error => {
        console.error('Error logging activity:', error);
    });
} 
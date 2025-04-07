// Problem Editor JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated and is admin
    checkAdminAuth();
    
    // Initialize CodeMirror editors
    initializeCodeEditors();
    
    // Initialize tabs
    initializeTabs();
    
    // Initialize dynamic elements
    initializeAddRemoveButtons();
    
    // Check if editing existing problem
    checkForExistingProblem();
    
    // Set up form submission
    setupFormSubmission();
});

// CodeMirror editors for each language
const templateEditors = {};
const solutionEditors = {};
let currentProblemId = null;
let isEditMode = false;

// Check admin authentication
function checkAdminAuth() {
    // First check if bypass is enabled
    const adminBypass = localStorage.getItem('adminBypass');
    if (adminBypass === 'true') {
        console.log("Using admin bypass");
        // Continue with initialization
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
                // Load problems list for sidebar
                loadProblemsList();
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

// Initialize CodeMirror editors
function initializeCodeEditors() {
    // Template editors
    ['python', 'javascript', 'java', 'cpp'].forEach(lang => {
        const mode = lang === 'javascript' ? 'javascript' : 
                   lang === 'python' ? 'python' : 
                   'text/x-java';
        
        templateEditors[lang] = CodeMirror(document.getElementById(`${lang}-template`), {
            mode: mode,
            theme: 'dracula',
            lineNumbers: true,
            indentUnit: 4,
            smartIndent: true,
            tabSize: 4,
            indentWithTabs: false,
            lineWrapping: true,
            matchBrackets: true,
            autoCloseBrackets: true
        });
        
        // Set default content
        if (lang === 'python') {
            templateEditors[lang].setValue('# Write your code here\n\n');
        } else if (lang === 'javascript') {
            templateEditors[lang].setValue('// Write your code here\n\n');
        } else if (lang === 'java') {
            templateEditors[lang].setValue('// Write your code here\npublic class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}');
        } else if (lang === 'cpp') {
            templateEditors[lang].setValue('// Write your code here\n#include <iostream>\n\nint main() {\n    // Your code here\n    return 0;\n}');
        }
        
        // Adjust editor height
        templateEditors[lang].setSize(null, 200);
    });
    
    // Solution editors
    ['python', 'javascript', 'java', 'cpp'].forEach(lang => {
        const mode = lang === 'javascript' ? 'javascript' : 
                   lang === 'python' ? 'python' : 
                   'text/x-java';
        
        solutionEditors[lang] = CodeMirror(document.getElementById(`${lang}-solution`), {
            mode: mode,
            theme: 'dracula',
            lineNumbers: true,
            indentUnit: 4,
            smartIndent: true,
            tabSize: 4,
            indentWithTabs: false,
            lineWrapping: true,
            matchBrackets: true,
            autoCloseBrackets: true
        });
        
        // Set default content
        if (lang === 'python') {
            solutionEditors[lang].setValue('# Solution code here\n\n');
        } else if (lang === 'javascript') {
            solutionEditors[lang].setValue('// Solution code here\n\n');
        } else if (lang === 'java') {
            solutionEditors[lang].setValue('// Solution code here\npublic class Main {\n    public static void main(String[] args) {\n        // Solution code here\n    }\n}');
        } else if (lang === 'cpp') {
            solutionEditors[lang].setValue('// Solution code here\n#include <iostream>\n\nint main() {\n    // Solution code here\n    return 0;\n}');
        }
        
        // Adjust editor height
        solutionEditors[lang].setSize(null, 200);
    });
}

// Initialize tabs
function initializeTabs() {
    // Template tabs
    const templateTabs = document.querySelectorAll('.language-tabs:not(.solution-tabs) .tab-btn');
    templateTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            templateTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Hide all editors
            document.querySelectorAll('.template-editor').forEach(editor => {
                editor.classList.remove('active');
            });
            
            // Show selected editor
            const lang = tab.getAttribute('data-lang');
            document.getElementById(`${lang}-template`).classList.add('active');
        });
    });
    
    // Solution tabs
    const solutionTabs = document.querySelectorAll('.solution-tabs .tab-btn');
    solutionTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            solutionTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Hide all editors
            document.querySelectorAll('.solution-editor').forEach(editor => {
                editor.classList.remove('active');
            });
            
            // Show selected editor
            const lang = tab.getAttribute('data-lang');
            document.getElementById(`${lang}-solution`).classList.add('active');
        });
    });
}

// Initialize add/remove buttons for test cases and hints
function initializeAddRemoveButtons() {
    // Add test case button
    document.getElementById('add-test-case-btn').addEventListener('click', () => {
        const testCasesContainer = document.getElementById('test-cases-container');
        const testCaseCount = testCasesContainer.querySelectorAll('.test-case').length + 1;
        
        const testCaseHtml = `
            <div class="test-case">
                <div class="test-case-header">
                    <h4>Test Case ${testCaseCount}</h4>
                    <button class="remove-test-case-btn">Remove</button>
                </div>
                <div class="form-group">
                    <label>Input</label>
                    <textarea class="test-input" placeholder="Test input (leave empty if no input required)"></textarea>
                </div>
                <div class="form-group">
                    <label>Expected Output</label>
                    <textarea class="test-output" placeholder="Expected output" required></textarea>
                </div>
            </div>
        `;
        
        // Add test case to container
        testCasesContainer.insertAdjacentHTML('beforeend', testCaseHtml);
        
        // Add event listener to the remove button
        const removeButton = testCasesContainer.querySelector(`.test-case:nth-child(${testCaseCount}) .remove-test-case-btn`);
        removeButton.addEventListener('click', function() {
            this.closest('.test-case').remove();
            updateTestCaseNumbers();
        });
    });
    
    // Add hint button
    document.getElementById('add-hint-btn').addEventListener('click', () => {
        const hintsContainer = document.getElementById('hints-container');
        const hintCount = hintsContainer.querySelectorAll('.hint-item').length + 1;
        
        const hintHtml = `
            <div class="hint-item">
                <div class="hint-header">
                    <h4>Hint ${hintCount}</h4>
                    <button class="remove-hint-btn">Remove</button>
                </div>
                <div class="form-group">
                    <textarea class="hint-text" placeholder="Hint text" required></textarea>
                </div>
            </div>
        `;
        
        // Add hint to container
        hintsContainer.insertAdjacentHTML('beforeend', hintHtml);
        
        // Add event listener to the remove button
        const removeButton = hintsContainer.querySelector(`.hint-item:nth-child(${hintCount}) .remove-hint-btn`);
        removeButton.addEventListener('click', function() {
            this.closest('.hint-item').remove();
            updateHintNumbers();
        });
    });
    
    // Initial setup of remove buttons for existing test cases and hints
    document.querySelectorAll('.remove-test-case-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.test-case').remove();
            updateTestCaseNumbers();
        });
    });
    
    document.querySelectorAll('.remove-hint-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.hint-item').remove();
            updateHintNumbers();
        });
    });
}

// Update test case numbers after removal
function updateTestCaseNumbers() {
    const testCases = document.querySelectorAll('.test-case');
    testCases.forEach((testCase, index) => {
        testCase.querySelector('h4').textContent = `Test Case ${index + 1}`;
    });
}

// Update hint numbers after removal
function updateHintNumbers() {
    const hints = document.querySelectorAll('.hint-item');
    hints.forEach((hint, index) => {
        hint.querySelector('h4').textContent = `Hint ${index + 1}`;
    });
}

// Load problems list for sidebar
function loadProblemsList() {
    const problemList = document.getElementById('problem-list');
    
    // Reference to problems collection
    db.collection('problems')
        .orderBy('title', 'asc')
        .get()
        .then(querySnapshot => {
            // Clear loading message
            problemList.innerHTML = '';
            
            if (querySnapshot.empty) {
                problemList.innerHTML = '<li>No problems found</li>';
                return;
            }
            
            // Add each problem to the list
            querySnapshot.forEach(doc => {
                const problem = doc.data();
                const li = document.createElement('li');
                li.textContent = problem.title;
                li.setAttribute('data-id', doc.id);
                
                li.addEventListener('click', () => {
                    // Navigate to the problem editor with the problem ID
                    window.location.href = `problem-editor.html?id=${doc.id}`;
                });
                
                problemList.appendChild(li);
            });
        })
        .catch(error => {
            console.error('Error loading problems:', error);
            problemList.innerHTML = '<li>Error loading problems</li>';
        });
        
    // Set up search functionality
    const searchInput = document.getElementById('problem-search');
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase();
        
        // Filter the list based on search term
        const listItems = problemList.querySelectorAll('li');
        listItems.forEach(item => {
            if (item.textContent.toLowerCase().includes(searchTerm)) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

// Check if we are editing an existing problem
function checkForExistingProblem() {
    const urlParams = new URLSearchParams(window.location.search);
    const problemId = urlParams.get('id');
    
    if (problemId) {
        isEditMode = true;
        currentProblemId = problemId;
        
        // Update UI to reflect edit mode
        document.getElementById('editor-title').textContent = 'Edit Problem';
        
        // Load problem data
        db.collection('problems').doc(problemId).get()
            .then(doc => {
                if (doc.exists) {
                    const problem = doc.data();
                    
                    // Fill form fields with problem data
                    document.getElementById('problem-id').value = problemId;
                    document.getElementById('problem-id').disabled = true; // Can't change ID once created
                    document.getElementById('problem-title').value = problem.title || '';
                    document.getElementById('difficulty').value = problem.difficulty || 'absolute-beginner';
                    document.getElementById('problem-status').value = problem.status || 'draft';
                    document.getElementById('problem-description').value = problem.description || '';
                    document.getElementById('learning-concept').value = problem.learningConcept || '';
                    
                    // Load templates
                    if (problem.templates) {
                        for (const lang in problem.templates) {
                            if (templateEditors[lang]) {
                                templateEditors[lang].setValue(problem.templates[lang]);
                            }
                        }
                    }
                    
                    // Load solutions
                    if (problem.solutions) {
                        for (const lang in problem.solutions) {
                            if (solutionEditors[lang]) {
                                solutionEditors[lang].setValue(problem.solutions[lang]);
                            }
                        }
                    }
                    
                    // Load test cases
                    if (problem.testCases && problem.testCases.length > 0) {
                        // Clear default test case
                        document.getElementById('test-cases-container').innerHTML = '';
                        
                        // Add each test case
                        problem.testCases.forEach((testCase, index) => {
                            addTestCase(index + 1, testCase.input, testCase.expectedOutput);
                        });
                    }
                    
                    // Load hints
                    if (problem.hints && problem.hints.length > 0) {
                        // Clear default hint
                        document.getElementById('hints-container').innerHTML = '';
                        
                        // Add each hint
                        problem.hints.forEach((hint, index) => {
                            addHint(index + 1, hint);
                        });
                    }
                } else {
                    alert('Problem not found!');
                    window.location.href = 'problems.html';
                }
            })
            .catch(error => {
                console.error('Error loading problem:', error);
                alert('Error loading problem. Please try again.');
            });
    }
}

// Add a test case with provided values
function addTestCase(number, input, expectedOutput) {
    const testCasesContainer = document.getElementById('test-cases-container');
    
    const testCaseHtml = `
        <div class="test-case">
            <div class="test-case-header">
                <h4>Test Case ${number}</h4>
                <button class="remove-test-case-btn">Remove</button>
            </div>
            <div class="form-group">
                <label>Input</label>
                <textarea class="test-input" placeholder="Test input (leave empty if no input required)">${input || ''}</textarea>
            </div>
            <div class="form-group">
                <label>Expected Output</label>
                <textarea class="test-output" placeholder="Expected output" required>${expectedOutput || ''}</textarea>
            </div>
        </div>
    `;
    
    // Add test case to container
    testCasesContainer.insertAdjacentHTML('beforeend', testCaseHtml);
    
    // Add event listener to the remove button
    const removeButton = testCasesContainer.querySelector(`.test-case:nth-child(${number}) .remove-test-case-btn`);
    removeButton.addEventListener('click', function() {
        this.closest('.test-case').remove();
        updateTestCaseNumbers();
    });
}

// Add a hint with provided text
function addHint(number, text) {
    const hintsContainer = document.getElementById('hints-container');
    
    const hintHtml = `
        <div class="hint-item">
            <div class="hint-header">
                <h4>Hint ${number}</h4>
                <button class="remove-hint-btn">Remove</button>
            </div>
            <div class="form-group">
                <textarea class="hint-text" placeholder="Hint text" required>${text || ''}</textarea>
            </div>
        </div>
    `;
    
    // Add hint to container
    hintsContainer.insertAdjacentHTML('beforeend', hintHtml);
    
    // Add event listener to the remove button
    const removeButton = hintsContainer.querySelector(`.hint-item:nth-child(${number}) .remove-hint-btn`);
    removeButton.addEventListener('click', function() {
        this.closest('.hint-item').remove();
        updateHintNumbers();
    });
}

// Set up form submission
function setupFormSubmission() {
    // Save draft button
    document.getElementById('save-draft-btn').addEventListener('click', () => {
        saveProblem('draft');
    });
    
    // Publish button
    document.getElementById('publish-btn').addEventListener('click', () => {
        saveProblem('published');
    });
}

// Save problem to Firebase
function saveProblem(status) {
    // Validate form
    if (!validateForm()) {
        return;
    }
    
    // Get form data
    const problemData = getProblemData();
    problemData.status = status;
    
    // Add timestamp and user info
    problemData.lastModified = firebase.firestore.FieldValue.serverTimestamp();
    
    if (!isEditMode) {
        // Set creation timestamp and author for new problems
        problemData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        problemData.createdBy = auth.currentUser.uid;
        problemData.createdByEmail = auth.currentUser.email;
    }
    
    problemData.lastModifiedBy = auth.currentUser.uid;
    problemData.lastModifiedByEmail = auth.currentUser.email;
    
    // Save to Firestore
    const problemId = document.getElementById('problem-id').value;
    
    if (isEditMode) {
        // Update existing problem
        db.collection('problems').doc(currentProblemId).update(problemData)
            .then(() => {
                alert('Problem updated successfully!');
                window.location.href = 'problems.html';
            })
            .catch(error => {
                console.error('Error updating problem:', error);
                alert('Error updating problem. Please try again.');
            });
    } else {
        // Check if problem ID already exists
        db.collection('problems').doc(problemId).get()
            .then(doc => {
                if (doc.exists) {
                    alert('A problem with this ID already exists. Please choose a different ID.');
                    return;
                }
                
                // Create new problem
                db.collection('problems').doc(problemId).set(problemData)
                    .then(() => {
                        alert('Problem created successfully!');
                        window.location.href = 'problems.html';
                    })
                    .catch(error => {
                        console.error('Error creating problem:', error);
                        alert('Error creating problem. Please try again.');
                    });
            })
            .catch(error => {
                console.error('Error checking problem ID:', error);
                alert('Error checking problem ID. Please try again.');
            });
    }
}

// Validate form before submission
function validateForm() {
    const problemId = document.getElementById('problem-id').value;
    const title = document.getElementById('problem-title').value;
    const description = document.getElementById('problem-description').value;
    
    if (!problemId) {
        alert('Problem ID is required');
        return false;
    }
    
    if (!title) {
        alert('Title is required');
        return false;
    }
    
    if (!description) {
        alert('Description is required');
        return false;
    }
    
    // Validate problem ID format (lowercase, alphanumeric, hyphens)
    const idRegex = /^[a-z0-9-]+$/;
    if (!idRegex.test(problemId)) {
        alert('Problem ID must contain only lowercase letters, numbers, and hyphens');
        return false;
    }
    
    return true;
}

// Get all form data as an object
function getProblemData() {
    const problemData = {
        title: document.getElementById('problem-title').value,
        difficulty: document.getElementById('difficulty').value,
        description: document.getElementById('problem-description').value,
        learningConcept: document.getElementById('learning-concept').value,
        templates: {},
        solutions: {},
        testCases: [],
        hints: []
    };
    
    // Get templates for each language
    for (const lang in templateEditors) {
        problemData.templates[lang] = templateEditors[lang].getValue();
    }
    
    // Get solutions for each language
    for (const lang in solutionEditors) {
        problemData.solutions[lang] = solutionEditors[lang].getValue();
    }
    
    // Get test cases
    document.querySelectorAll('.test-case').forEach(testCase => {
        const input = testCase.querySelector('.test-input').value;
        const expectedOutput = testCase.querySelector('.test-output').value;
        
        problemData.testCases.push({
            input,
            expectedOutput
        });
    });
    
    // Get hints
    document.querySelectorAll('.hint-item').forEach(hintItem => {
        const text = hintItem.querySelector('.hint-text').value;
        problemData.hints.push(text);
    });
    
    return problemData;
} 
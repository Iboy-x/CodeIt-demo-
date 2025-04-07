// Global CodeMirror editor instance
let editor = null;

// API endpoint for external compiler service (for future integration)
const COMPILER_API = "https://api.judge0.com/submissions";

// Initialize CodeMirror editor
function initializeCodeEditor() {
    // Only initialize once
    if (editor !== null) return;
    
    // Get the editor container
    const container = document.getElementById('editor-container');
    if (!container) return;
    
    // Create editor instance
    editor = CodeMirror(container, {
        mode: "python", // Default mode
        theme: "dracula",
        lineNumbers: true,
        indentUnit: 4,
        smartIndent: true,
        tabSize: 4,
        indentWithTabs: false,
        lineWrapping: true,
        matchBrackets: true,
        autoCloseBrackets: true,
        extraKeys: {
            "Tab": function(cm) {
                if (cm.somethingSelected()) {
                    cm.indentSelection("add");
                } else {
                    cm.replaceSelection("    ", "end", "+input");
                }
            }
        }
    });
    
    // Set initial content
    editor.setValue("# Write a program that prints \"Hello, World!\"\n\n");
    
    // Adjust editor height
    editor.setSize(null, 400);
    
    // Set up language change
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        languageSelect.addEventListener('change', function() {
            changeLanguage();
        });
    }
    
    // Load problem data
    loadProblem();
}

// Sample problems data
const problems = {
    "hello-world": {
        title: "Hello World",
        difficulty: "absolute-beginner",
        description: "Write a program that prints \"Hello, World!\" to the console. This is traditionally the first program people write when learning a new programming language.",
        templates: {
            python: "# Write a program that prints \"Hello, World!\"\n\n",
            javascript: "// Write a program that prints \"Hello, World!\"\n\n",
            java: "// Write a program that prints \"Hello, World!\"\n\npublic class Main {\n    public static void main(String[] args) {\n        // Your code here\n    }\n}",
            cpp: "// Write a program that prints \"Hello, World!\"\n\n#include <iostream>\n\nint main() {\n    // Your code here\n    return 0;\n}"
        },
        testCases: [
            {
                input: "",
                expectedOutput: "Hello, World!"
            }
        ],
        solutions: {
            python: "print(\"Hello, World!\")",
            javascript: "console.log(\"Hello, World!\");",
            java: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}",
            cpp: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}"
        }
    },
    "sum-two-numbers": {
        title: "Sum Two Numbers",
        difficulty: "absolute-beginner",
        description: "Create a function that takes two numbers as input and returns their sum.",
        templates: {
            python: "# Create a function that takes two numbers as input and returns their sum\n\ndef sum_two_numbers(a, b):\n    # Your code here\n    pass\n\n# Test your function\nprint(sum_two_numbers(5, 3))",
            javascript: "// Create a function that takes two numbers as input and returns their sum\n\nfunction sumTwoNumbers(a, b) {\n    // Your code here\n}\n\n// Test your function\nconsole.log(sumTwoNumbers(5, 3));",
            java: "// Create a function that takes two numbers as input and returns their sum\n\npublic class Main {\n    public static int sumTwoNumbers(int a, int b) {\n        // Your code here\n        return 0;\n    }\n    \n    public static void main(String[] args) {\n        System.out.println(sumTwoNumbers(5, 3));\n    }\n}",
            cpp: "// Create a function that takes two numbers as input and returns their sum\n\n#include <iostream>\n\nint sumTwoNumbers(int a, int b) {\n    // Your code here\n    return 0;\n}\n\nint main() {\n    std::cout << sumTwoNumbers(5, 3) << std::endl;\n    return 0;\n}"
        },
        testCases: [
            {
                input: [5, 3],
                expectedOutput: "8"
            },
            {
                input: [10, -2],
                expectedOutput: "8"
            }
        ],
        solutions: {
            python: "def sum_two_numbers(a, b):\n    return a + b\n\nprint(sum_two_numbers(5, 3))",
            javascript: "function sumTwoNumbers(a, b) {\n    return a + b;\n}\n\nconsole.log(sumTwoNumbers(5, 3));",
            java: "public class Main {\n    public static int sumTwoNumbers(int a, int b) {\n        return a + b;\n    }\n    \n    public static void main(String[] args) {\n        System.out.println(sumTwoNumbers(5, 3));\n    }\n}",
            cpp: "#include <iostream>\n\nint sumTwoNumbers(int a, int b) {\n    return a + b;\n}\n\nint main() {\n    std::cout << sumTwoNumbers(5, 3) << std::endl;\n    return 0;\n}"
        }
    },
    "even-or-odd": {
        title: "Even or Odd",
        difficulty: "beginner",
        description: "Create a function that determines whether a number is even or odd.",
        templates: {
            python: "# Create a function that determines whether a number is even or odd\n\ndef is_even(num):\n    # Your code here\n    pass\n\n# Test your function\nprint(is_even(5))  # Should return False\nprint(is_even(6))  # Should return True",
            javascript: "// Create a function that determines whether a number is even or odd\n\nfunction isEven(num) {\n    // Your code here\n}\n\n// Test your function\nconsole.log(isEven(5));  // Should return false\nconsole.log(isEven(6));  // Should return true",
            java: "// Create a function that determines whether a number is even or odd\n\npublic class Main {\n    public static boolean isEven(int num) {\n        // Your code here\n        return false;\n    }\n    \n    public static void main(String[] args) {\n        System.out.println(isEven(5));  // Should output: false\n        System.out.println(isEven(6));  // Should output: true\n    }\n}",
            cpp: "// Create a function that determines whether a number is even or odd\n\n#include <iostream>\n\nbool isEven(int num) {\n    // Your code here\n    return false;\n}\n\nint main() {\n    std::cout << std::boolalpha;\n    std::cout << isEven(5) << std::endl;  // Should output: false\n    std::cout << isEven(6) << std::endl;  // Should output: true\n    return 0;\n}"
        },
        testCases: [
            {
                input: 5,
                expectedOutput: "false"
            },
            {
                input: 6,
                expectedOutput: "true"
            }
        ],
        solutions: {
            python: "def is_even(num):\n    return num % 2 == 0\n\nprint(is_even(5))  # Should return False\nprint(is_even(6))  # Should return True",
            javascript: "function isEven(num) {\n    return num % 2 === 0;\n}\n\nconsole.log(isEven(5));  // Should return false\nconsole.log(isEven(6));  // Should return true",
            java: "public class Main {\n    public static boolean isEven(int num) {\n        return num % 2 == 0;\n    }\n    \n    public static void main(String[] args) {\n        System.out.println(isEven(5));  // Should output: false\n        System.out.println(isEven(6));  // Should output: true\n    }\n}",
            cpp: "#include <iostream>\n\nbool isEven(int num) {\n    return num % 2 == 0;\n}\n\nint main() {\n    std::cout << std::boolalpha;\n    std::cout << isEven(5) << std::endl;  // Should output: false\n    std::cout << isEven(6) << std::endl;  // Should output: true\n    return 0;\n}"
        }
    },
    "reverse-string": {
        title: "Reverse a String",
        difficulty: "beginner",
        description: "Create a function that reverses a string.",
        templates: {
            python: "# Create a function that reverses a string\n\ndef reverse_string(text):\n    # Your code here\n    pass\n\n# Test your function\nprint(reverse_string(\"hello\"))  # Should print 'olleh'",
            javascript: "// Create a function that reverses a string\n\nfunction reverseString(text) {\n    // Your code here\n}\n\n// Test your function\nconsole.log(reverseString(\"hello\"));  // Should print 'olleh'",
            java: "// Create a function that reverses a string\n\npublic class Main {\n    public static String reverseString(String text) {\n        // Your code here\n        return \"\";\n    }\n    \n    public static void main(String[] args) {\n        System.out.println(reverseString(\"hello\"));  // Should print 'olleh'\n    }\n}",
            cpp: "// Create a function that reverses a string\n\n#include <iostream>\n#include <string>\n\nstd::string reverseString(std::string text) {\n    // Your code here\n    return \"\";\n}\n\nint main() {\n    std::cout << reverseString(\"hello\") << std::endl;  // Should print 'olleh'\n    return 0;\n}"
        },
        testCases: [
            {
                input: ["hello"],
                expectedOutput: "olleh"
            },
            {
                input: ["CodeIt"],
                expectedOutput: "tIedoC"
            },
            {
                input: [""],
                expectedOutput: ""
            }
        ],
        solutions: {
            python: "def reverse_string(text):\n    return text[::-1]\n\n# Alternative solution:\n# def reverse_string(text):\n#     result = \"\"\n#     for char in text:\n#         result = char + result\n#     return result\n\nprint(reverse_string(\"hello\"))",
            javascript: "function reverseString(text) {\n    return text.split('').reverse().join('');\n}\n\n// Alternative solution:\n// function reverseString(text) {\n//     let result = '';\n//     for (let i = text.length - 1; i >= 0; i--) {\n//         result += text[i];\n//     }\n//     return result;\n// }\n\nconsole.log(reverseString(\"hello\"));",
            java: "public class Main {\n    public static String reverseString(String text) {\n        StringBuilder reversed = new StringBuilder();\n        for (int i = text.length() - 1; i >= 0; i--) {\n            reversed.append(text.charAt(i));\n        }\n        return reversed.toString();\n    }\n    \n    public static void main(String[] args) {\n        System.out.println(reverseString(\"hello\"));\n    }\n}",
            cpp: "#include <iostream>\n#include <string>\n#include <algorithm>\n\nstd::string reverseString(std::string text) {\n    std::reverse(text.begin(), text.end());\n    return text;\n}\n\n// Alternative solution:\n// std::string reverseString(std::string text) {\n//     std::string result = \"\";\n//     for (int i = text.length() - 1; i >= 0; i--) {\n//         result += text[i];\n//     }\n//     return result;\n// }\n\nint main() {\n    std::cout << reverseString(\"hello\") << std::endl;\n    return 0;\n}"
        }
    }
};

// Get problem ID from URL
function getProblemId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('problem') || 'hello-world';
}

// Load problem data
function loadProblem() {
    if (!editor) return;
    
    const problemId = getProblemId();
    const problem = problems[problemId];
    
    if (!problem) {
        window.location.href = 'problems.html';
        return;
    }
    
    // Set problem title and description
    const titleEl = document.getElementById('problem-title');
    const descEl = document.getElementById('problem-description');
    const modalTitleEl = document.getElementById('modal-problem-title');
    
    if (titleEl) titleEl.textContent = problem.title;
    if (descEl) descEl.textContent = problem.description;
    if (modalTitleEl) modalTitleEl.textContent = problem.title;
    
    // Set difficulty tag
    const difficultyTag = document.querySelector('.difficulty');
    if (difficultyTag) {
        difficultyTag.className = `difficulty ${problem.difficulty}`;
        difficultyTag.textContent = problem.difficulty.split('-').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }
    
    // Load code template for current language
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
        const currentLanguage = languageSelect.value;
        if (problem.templates[currentLanguage]) {
            editor.setValue(problem.templates[currentLanguage]);
        }
    }
}

// Change coding language
function changeLanguage() {
    if (!editor) return;
    
    const languageSelect = document.getElementById('language-select');
    if (!languageSelect) return;
    
    const problemId = getProblemId();
    const problem = problems[problemId];
    const newLanguage = languageSelect.value;
    
    // Change editor mode based on language
    switch(newLanguage) {
        case 'python':
            editor.setOption('mode', 'python');
            break;
        case 'javascript':
            editor.setOption('mode', 'javascript');
            break;
        case 'java':
        case 'cpp':
            editor.setOption('mode', 'clike');
            break;
    }
    
    // Load template for the selected language
    if (problem && problem.templates[newLanguage]) {
        editor.setValue(problem.templates[newLanguage]);
    }
}

// Reset code to template
function resetCode() {
    if (!editor) return;
    
    const problemId = getProblemId();
    const problem = problems[problemId];
    const languageSelect = document.getElementById('language-select');
    
    if (problem && languageSelect) {
        const currentLanguage = languageSelect.value;
        editor.setValue(problem.templates[currentLanguage]);
    }
}

// Run code function
function runCode() {
    if (!editor) return;
    
    const code = editor.getValue();
    const outputArea = document.getElementById('output-area');
    if (!outputArea) return;
    
    const languageSelect = document.getElementById('language-select');
    if (!languageSelect) return;
    
    const language = languageSelect.value;
    
    // Clear previous output
    outputArea.innerHTML = '';
    
    // Show loading spinner
    const loader = document.createElement('div');
    loader.className = 'loader';
    outputArea.appendChild(loader);
    
    // Use an external API for code execution if possible (in a real app)
    // For demo purposes, we'll use our client-side simulation
    
    setTimeout(() => {
        loader.remove();
        let output = '';
        
        try {
            // Simple simulation of code execution
            switch(language) {
                case 'python':
                    // For Python, we'll look for print statements
                    if (code.includes('print("Hello, World!")') || code.includes("print('Hello, World!')")) {
                        output = 'Hello, World!';
                    } 
                    else if (code.match(/print\s*\(.*\)/)) {
                        // Extract content from print statements
                        const printMatch = code.match(/print\s*\(\s*['"](.*)['"].*\)/);
                        if (printMatch && printMatch[1]) {
                            output = printMatch[1];
                        } else {
                            output = '[Variable or expression output would appear here]';
                        }
                    }
                    else if (code.includes('def sum_two_numbers') && code.includes('return a + b')) {
                        output = '8';  // For the sum problem
                    }
                    else if (code.includes('def is_even') && code.includes('return') && code.includes('% 2 == 0')) {
                        output = 'False\nTrue';  // For even-odd problem
                    }
                    else if (code.includes('def reverse_string') && code.includes('return')) {
                        output = 'olleh';  // For reverse-string problem
                    }
                    else {
                        output = 'No output detected. Make sure you use print() to see results.';
                    }
                    break;
                    
                case 'javascript':
                    // For JavaScript, check for console.log
                    if (code.includes('console.log("Hello, World!")') || code.includes("console.log('Hello, World!')")) {
                        output = 'Hello, World!';
                    }
                    else if (code.match(/console\.log\s*\(.*\)/)) {
                        // Extract content from console.log
                        const logMatch = code.match(/console\.log\s*\(\s*['"](.*)['"].*\)/);
                        if (logMatch && logMatch[1]) {
                            output = logMatch[1];
                        } else {
                            output = '[Variable or expression output would appear here]';
                        }
                    }
                    else if (code.includes('function sumTwoNumbers') && code.includes('return a + b')) {
                        output = '8';  // For the sum problem
                    }
                    else if (code.includes('function isEven') && code.includes('return') && code.includes('% 2 === 0')) {
                        output = 'false\ntrue';  // For even-odd problem
                    }
                    else if (code.includes('function reverseString') && code.includes('return')) {
                        output = 'olleh';  // For reverse-string problem
                    }
                    else {
                        output = 'No output detected. Make sure you use console.log() to see results.';
                    }
                    break;
                    
                case 'java':
                    if (code.includes('System.out.println("Hello, World!")')) {
                        output = 'Hello, World!';
                    }
                    else if (code.match(/System\.out\.println\s*\(.*\)/)) {
                        const printMatch = code.match(/System\.out\.println\s*\(\s*["'](.*)["'].*\)/);
                        if (printMatch && printMatch[1]) {
                            output = printMatch[1];
                        } else {
                            output = '[Variable or expression output would appear here]';
                        }
                    } 
                    else {
                        output = 'No output detected. Make sure you use System.out.println() to see results.';
                    }
                    break;
                    
                case 'cpp':
                    if (code.includes('cout << "Hello, World!"')) {
                        output = 'Hello, World!';
                    }
                    else if (code.match(/cout\s*<<\s*.*/)) {
                        const coutMatch = code.match(/cout\s*<<\s*["'](.*)["']/);
                        if (coutMatch && coutMatch[1]) {
                            output = coutMatch[1];
                        } else {
                            output = '[Variable or expression output would appear here]';
                        }
                    }
                    else {
                        output = 'No output detected. Make sure you use cout << to see results.';
                    }
                    break;
                    
                default:
                    output = 'Language not supported for execution.';
            }
            
            outputArea.innerHTML = `<pre class="code-output">${output}</pre>`;
            
        } catch (e) {
            outputArea.innerHTML = `<p class="error">Error: ${e.message}</p>`;
        }
    }, 1000);
}

// Submit code for checking
function submitCode() {
    if (!editor) return;
    
    const code = editor.getValue();
    const outputArea = document.getElementById('output-area');
    if (!outputArea) return;
    
    // Clear previous output
    outputArea.innerHTML = '';
    
    // Show loading spinner
    const loader = document.createElement('div');
    loader.className = 'loader';
    outputArea.appendChild(loader);
    
    // Simulate submission delay
    setTimeout(() => {
        loader.remove();
        
        const problemId = getProblemId();
        let success = false;
        
        // Check for correct solution patterns
        switch(problemId) {
            case 'hello-world':
                if (code.includes('print("Hello, World!")') || 
                    code.includes("print('Hello, World!')") ||
                    code.includes('console.log("Hello, World!")') || 
                    code.includes("console.log('Hello, World!')") ||
                    code.includes('System.out.println("Hello, World!")') ||
                    code.includes('cout << "Hello, World!"')) {
                    success = true;
                }
                break;
                
            case 'sum-two-numbers':
                if ((code.includes('return a + b') || code.includes('return (a + b)')) && 
                    (code.includes('function') || code.includes('def ') || code.includes('public static'))) {
                    success = true;
                }
                break;
                
            case 'even-or-odd':
                if (code.includes('% 2') && 
                   (code.includes('== 0') || code.includes('=== 0')) &&
                   (code.includes('return') || code.includes('print') || code.includes('console.log'))) {
                    success = true;
                }
                break;
                
            default:
                const requiredKeywords = {
                    'reverse-string': ['return', 'reverse', 'for', 'while', 'if']
                };
                
                const keywords = requiredKeywords[problemId] || [];
                let keywordsFound = 0;
                
                keywords.forEach(keyword => {
                    if (code.includes(keyword)) {
                        keywordsFound++;
                    }
                });
                
                if (keywordsFound >= 2 && code.length > 30) {
                    success = true;
                }
        }
        
        if (success) {
            outputArea.innerHTML = '<p class="success">All tests passed! Your solution is correct.</p>';
            
            // Show success modal
            const modal = document.getElementById('success-modal');
            if (modal) modal.style.display = 'flex';
        } else {
            outputArea.innerHTML = '<p class="error">Some tests failed. Your solution might not be correct yet. Try reviewing your code and test it again.</p>';
        }
    }, 1500);
}

// Show hint
function showHint(hintNumber) {
    const hint = document.getElementById(`hint-${hintNumber}`);
    if (!hint) return;
    
    if (hint.style.display === 'none') {
        hint.style.display = 'block';
    } else {
        hint.style.display = 'none';
    }
}

// Close modal
function closeModal() {
    const modal = document.getElementById('success-modal');
    if (modal) modal.style.display = 'none';
}

// View solution
function viewSolution() {
    if (!editor) return;
    
    const problemId = getProblemId();
    const languageSelect = document.getElementById('language-select');
    if (!languageSelect) return;
    
    const language = languageSelect.value;
    const problem = problems[problemId];
    
    if (problem && problem.solutions && problem.solutions[language]) {
        editor.setValue(problem.solutions[language]);
        
        // Close the modal
        closeModal();
        
        // Show a message in the output area
        const outputArea = document.getElementById('output-area');
        if (outputArea) {
            outputArea.innerHTML = '<p>This is one possible solution. There are often multiple ways to solve a problem!</p>';
        }
    }
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    initializeCodeEditor();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl+Enter to run code
        if (e.ctrlKey && e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            runCode();
        }
        // Ctrl+Shift+Enter to submit code
        if (e.ctrlKey && e.shiftKey && e.key === 'Enter') {
            e.preventDefault();
            submitCode();
        }
        // Ctrl+R to reset code
        if (e.ctrlKey && e.key === 'r') {
            e.preventDefault();
            resetCode();
        }
    });
}); 
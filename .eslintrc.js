module.exports = {
    env: {
        browser: false, // Set to true if your code runs in the browser
        es2021: true, // Enable ES2021 features
        node: true, // Enable Node.js global variables
    },
    extends: [
        'eslint:recommended', // Use the recommended rules from ESLint
        'plugin:node/recommended', // Use recommended rules from the Node.js plugin
    ],
    parserOptions: {
        ecmaVersion: 2021, // Specify the ECMAScript version
        sourceType: 'module', // Allow the use of imports
    },
    rules: {
        'no-console': 'warn', // Warn on console.log statements
        'prefer-const': 'warn', // Suggest using const for variables that are never reassigned
        'no-unused-vars': 'warn', // Warn on unused variables
        'indent': ['error', 4], // Enforce 4-space indentation
        'quotes': ['error', 'single'], // Enforce single quotes
        'semi': ['error', 'always'], // Require semicolons
        'linebreak-style': ['error', 'unix'], // Enforce Unix linebreaks
    },
    overrides: [
        {
            files: ['*.js'], // Apply these rules to all JavaScript files
            rules: {
                'no-undef': 'error', // Disallow the use of undeclared variables
            },
        },
    ],
};

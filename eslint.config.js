module.exports = {
    languageOptions: {
        ecmaVersion: 2021, // Specify the ECMAScript version
        sourceType: 'module', // Allow the use of imports
        globals: {
            // Define global variables here if needed
            // e.g., myGlobal: 'readonly',
        },
    },
    overrides: [
        {
            files: ['*.js'], // Apply these rules to all JavaScript files
            rules: {
                'no-console': 'warn', // Warn on console.log statements
                'prefer-const': 'warn', // Suggest using const for variables that are never reassigned
                'no-unused-vars': 'warn', // Warn on unused variables
                'indent': ['error', 4], // Enforce 4-space indentation
                'quotes': ['error', 'single'], // Enforce single quotes
                'semi': ['error', 'always'], // Require semicolons
                'linebreak-style': ['error', 'unix'], // Enforce Unix linebreaks
                'no-undef': 'error', // Disallow the use of undeclared variables
            },
        },
    ],
};

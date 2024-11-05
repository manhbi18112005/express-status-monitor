module.exports = [
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "commonjs",
        },
        rules: {
            'no-cond-assign': 'off', // eslint:recommended
            'no-irregular-whitespace': 'error', // eslint:recommended
            'no-unexpected-multiline': 'error', // eslint:recommended

            // TODO(philipwalton): add an option to enforce braces with the
            // exception of simple, single-line if statements.
            'curly': ['error', 'multi-line'],
            'guard-for-in': 'error',
            'no-caller': 'error',
            'no-extend-native': 'error',
            'no-extra-bind': 'error',
            'no-invalid-this': 'error',
            'no-multi-str': 'error',
            'no-new-wrappers': 'error',
            'no-throw-literal': 'error', // eslint:recommended
            'no-with': 'error',
            'prefer-promise-reject-errors': 'error',
            'no-unused-vars': ['error', {args: 'none'}], // eslint:recommended

            'array-bracket-newline': 'off', // eslint:recommended
            'array-bracket-spacing': ['error', 'never'],
            'array-element-newline': 'off', // eslint:recommended
            'block-spacing': ['error', 'never'],
            'brace-style': 'error',
            // 'camelcase': ['error', {properties: 'never'}],
            'no-var': 'error',
            'no-array-constructor': 'error',

            'key-spacing': 'error',
            'keyword-spacing': 'error',

            semi: "error",
            "prefer-const": "error",
            "no-duplicate-imports": "error",
            "sort-imports": "error",
        }
    }
];
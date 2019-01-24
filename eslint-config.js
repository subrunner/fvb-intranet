module.exports = {
	"extends": "eslint:recommended",
	"globals": {
		"$": true,
		"XCC": true,
		"window": true,
		"console": true,
		"moment": true,
		"jQuery": true
	},
	"plugins": ["json"],
	"env": {
		"browser": true,
		"jquery": true,
		"node": true
	},
	"parserOptions": {
		ecmaVersion : 9
	},
	"rules": {
		// always use a semicolon where its necessary
		"semi": ["error", "always"],
		// override default options for rules from base configurations
		"comma-dangle": ["error", "never"],
		"no-cond-assign": ["error", "always"],
		"no-empty": ["error", { "allowEmptyCatch": true }],
		"no-console": "warn",
		"no-unused-vars": ["error", { "varsIgnorePattern": "[iI]gnore", "argsIgnorePattern": "^ignore[\\S]*$" }],
		"one-var": ["error", {"var": "always", "let": "always", "const": "never"}],
		"curly": "error",
		//we format all things in javascript like Douglas Crockford wants it: tabs! And a tab is 4 spaces long...
		"indent": ["error", "tab", {
			"MemberExpression": "off",
			"SwitchCase": 1,
			"CallExpression": {"arguments": "off"},
			"ArrayExpression": "off"
		}],
		// treat var statements as if they were block scoped
		'block-scoped-var': 'error',
		// enforces return statements in callbacks of array's methods
		// http://eslint.org/docs/rules/array-callback-return
		'array-callback-return': 'error',
		// require return statements to either always or never specify values
		'consistent-return': 'warn',
		// encourages use of dot notation whenever possible
		'dot-notation': ['warn', { allowKeywords: true }],
		// require the use of === and !==
		// http://eslint.org/docs/rules/eqeqeq
		"eqeqeq": ['warn', 'always', { null: 'ignore' }],
		// make sure for-in loops have an if statement
		'guard-for-in': 'error',
		// disallow else after a return in an if
		'no-else-return': 'error',
		'no-empty-function': 'error',
		// disallow comparisons where both sides are exactly the same
		'no-self-compare': 'error',
		// disallow ++ (use +1 instead)
		"no-plusplus": "error",
		// disallow use of the with statement
		'no-with': 'error',
		// requires to declare all vars on top of their containing scope
		'vars-on-top': 'error',
		// disallow unnecessary string escaping
		// http://eslint.org/docs/rules/no-useless-escape
		'no-useless-escape': 'error',
		// disallow redundant return; keywords
		// http://eslint.org/docs/rules/no-useless-return
		'no-useless-return': 'error',
		// disallow use of void operator
		// http://eslint.org/docs/rules/no-void
		'no-void': 'error',
		// disallow declaring the same variable more then once
		'no-redeclare': 'error',
		// disallow unnecessary nested blocks
		'no-lone-blocks': 'error',
		// disallow use of multiple spaces
		'no-multi-spaces': 'error',
		// disallow use of constant expressions in conditions
		'no-constant-condition': 'error',
		// disallow creation of functions within loops
		'no-loop-func': 'error',
		// disallow fallthrough of case statements
		'no-fallthrough': 'error',
		// disallow lexical declarations in case/default clauses
		// http://eslint.org/docs/rules/no-case-declarations.html
		'no-case-declarations': 'error',
		// disallow duplicate keys when creating object literals
		'no-dupe-keys': 'error',
		// disallow unnecessary semicolons
		'no-extra-semi': 'error',
		// disallow invalid regular expression strings in the RegExp constructor
		'no-invalid-regexp': 'error',
		"keyword-spacing": ["error", { "before": true, "after": true }]
		// disable rules from base configurations
	}
};

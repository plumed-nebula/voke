const globals = require('globals')

module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        exports: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        setImmediate: 'readonly',
        clearImmediate: 'readonly',
      },
    },
    rules: {
      // 基本的 JavaScript 规则
      'no-unused-vars': 'warn',
      'no-console': 'off',
      'no-undef': 'error',

      // Node.js 特定规则
      'no-process-exit': 'off', // 允许在服务器应用中使用 process.exit()
      'no-path-concat': 'error',

      // 代码风格
      indent: ['error', 2],
      quotes: ['error', 'single'],
      semi: ['error', 'never'],
      'comma-dangle': ['error', 'always-multiline'],

      // 最佳实践
      eqeqeq: 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-new-wrappers': 'error',
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',
    },
  },
]

import antfu from '@antfu/eslint-config'

export default antfu({
  vue: true,
  typescript: true,
  formatters: true,
  ignores: [
    '**/wailsjs/**',
    '**/dist/**',
    '**/node_modules/**',
    '**/.vite/**',
  ],
}, {
  rules: {
    'no-console': 'off',
    'no-debugger': 'off',
    'vue/no-unused-components': 'warn',
    'vue/multi-word-component-names': 'off',
    'vue/no-v-html': 'warn',
    'vue/custom-event-name-casing': 'off',
    'no-alert': 'off',
    'ts/no-use-before-define': 'off',
    'ts/no-empty-object-type': 'off',
    'ts/no-namespace': 'off',
    'new-cap': 'off',
    'no-new': 'off',
    'prefer-rest-params': 'off',
    'unused-imports/no-unused-vars': 'warn',
    'regexp/no-super-linear-backtracking': 'off',
    'unicorn/prefer-number-properties': 'off',
    'no-case-declarations': 'off',
    'jsdoc/check-param-names': 'off',
    'node/handle-callback-err': 'off',
    'style/no-mixed-operators': 'off',
  },
})

require('dotenv').config({ path: '.env' })

module.exports = function (wallaby) {
  return {
    testFramework: 'jest',

    env: {
      type: 'node'
    },

    tests: ['src/__tests__/**/*.test.js'],
    files: ['src/**/*.js', '!**/*.test.js', '!**/.*'],
    debug: true
  }
}

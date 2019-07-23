module.exports = {
  modulePathIgnorePatterns: [
    '<rootDir>/config/',
    '<rootDir>/src/__tests__/test-helper.js'
  ],
  collectCoverageFrom: ['!src/__tests__/test-helper.js', 'src/**/*.js']
}

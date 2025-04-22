/** @type {import('jest').Config} */
const config = {
  verbose: true,
  transform: {}, // Needed for ES modules if not using Babel/ts-jest
  testEnvironment: 'node', // Use node environment for testing logic
  moduleFileExtensions: ['js', 'json', 'node'],
  // Add any other Jest configurations here
};

export default config;

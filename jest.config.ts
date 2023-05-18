const config = {
    testMatch: ['**/test/**/*.+(ts|tsx)', '**/src/**/(*.)+(spec|test).+(ts|tsx)'],
    transform: {
      '^.+\\.(ts|tsx)$': 'esbuild-jest',
    },
    collectCoverageFrom: [
      '**/src/*.{ts,tsx}',
      '!**/node_modules/**',
      '!**/vendor/**',
      '!**/dist/**'
    ],
}
export default config
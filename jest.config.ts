const config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/test/**/*.+(ts|tsx)', '**/src/**/(*.)+(spec|test).+(ts|tsx)'],
    collectCoverageFrom: [
      '**/src/*.{ts,tsx}',
      '!**/node_modules/**',
      '!**/vendor/**',
      '!**/dist/**'
    ],
    moduleDirectories: ['node_modules', 'src'],
    transformIgnorePatterns: [
      'node_modules/(?!@actions)'
    ],
    moduleNameMapper: {
      '^@actions/http-client$': '<rootDir>/node_modules/@actions/http-client/lib/index.js'
    },
    transform: {
      '^.+\\.tsx?$': ['ts-jest', {
        useESM: false,
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true
        }
      }],
      '^.+\\.jsx?$': ['ts-jest', {
        useESM: false
      }]
    }
}
export default config
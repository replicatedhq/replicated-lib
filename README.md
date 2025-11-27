# Replicated Library SDK

This is a library for interacting with the Replicated Vendor Portal API using TypeScript.

Source code: [Github](https://github.com/replicatedhq/replicated-lib)

## Testing Locally

### Prerequisites

- Node.js >= 20.0.0
- npm

### Running Tests

1. **Install dependencies:**
   ```bash
   npm install
   ```
   Or using Make:
   ```bash
   make deps
   ```

2. **Run all tests:**
   ```bash
   npm test
   ```
   Or using Make:
   ```bash
   make test
   ```
   
   This will:
   - Build the TypeScript source code
   - Run all test suites with coverage reporting
   - Display verbose output for each test

3. **Run tests without building first:**
   ```bash
   npx jest --coverage --verbose --setupFiles ./pacts/configuration.ts
   ```

### Test Structure

- Test files are located alongside source files with `.spec.ts` extension (e.g., `src/customers.spec.ts`)
- Tests use `mockttp` for HTTP request mocking
- Some tests use Pact for contract testing (configured in `pacts/configuration.ts`)

### Running Specific Tests

To run a specific test file:
```bash
npx jest src/customers.spec.ts
```

To run tests matching a pattern:
```bash
npx jest --testNamePattern="List Customers"
```

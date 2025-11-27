#!/bin/bash
# Script to verify local environment matches CI exactly

set -e

echo "=== Verifying local matches CI ==="
echo ""

# Check npm and node versions
echo "1. Checking versions..."
NPM_VERSION=$(npm --version)
NODE_VERSION=$(node --version)
echo "   npm: $NPM_VERSION"
echo "   node: $NODE_VERSION"
echo ""

# Clean state
echo "2. Cleaning node_modules and dist..."
rm -rf node_modules dist coverage

# Install exactly as CI does (npm install, not npm ci)
echo "3. Installing with 'npm install' (as CI does)..."
npm install

# Check if package-lock.json was modified
if ! git diff --quiet --exit-code package-lock.json; then
    echo "❌ package-lock.json was modified by npm install!"
    echo "   This means it's out of sync with package.json"
    echo "   Differences:"
    git diff package-lock.json | head -50
    echo ""
    echo "   To fix:"
    echo "   1. Review the changes above"
    echo "   2. Commit the updated package-lock.json"
    exit 1
fi
echo "✅ package-lock.json is up to date"
echo ""

# Build and check for changes
echo "5. Building..."
npm run build

echo "6. Running prettier..."
npm run prettier

echo "7. Checking for uncommitted changes..."
if ! git diff --quiet --exit-code; then
    echo "❌ Files were modified:"
    git diff --name-only
    echo ""
    echo "   Differences:"
    git diff | head -100
    exit 1
fi

echo "✅ Everything matches CI!"
echo ""
echo "Your local environment matches what CI will produce."


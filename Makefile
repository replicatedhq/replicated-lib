

.PHONY: clean
clean:
	rm -rf dist
	rm -rf coverage
	rm -rf examples/*.js
	find . -name "*.tsbuildinfo" -delete

.PHONY: deps
deps:
	npm install

.PHONY: build
build: clean deps
	npm run build

.PHONY: test
test: build
	npm run test

.PHONY: prettier
prettier: deps
	npm run prettier

.PHONY: prettier-check
prettier-check: deps
	npx prettier --config .prettierrc 'src/**/*.ts' --check
	
.PHONY: ci-check
ci-check: deps build prettier
	@echo "Checking for uncommitted changes..."
	@if ! git diff --quiet --exit-code; then \
		echo "❌ Error: Files were modified by 'npm install', build, or prettier"; \
		echo "Modified files:"; \
		git diff --name-only; \
		echo ""; \
		if git diff --quiet package-lock.json 2>/dev/null; then \
			echo "Please run 'make build' and 'make prettier' locally and commit the changes."; \
		else \
			echo "package-lock.json was modified. This means it's out of sync with package.json"; \
			echo "Please run 'npm install' locally and commit the updated package-lock.json"; \
			echo ""; \
			echo "Differences in package-lock.json:"; \
			git diff package-lock.json | head -100; \
		fi; \
		exit 1; \
	fi
	@echo "✅ No uncommitted changes detected"

.PHONY: publish
publish: test
	npm publish
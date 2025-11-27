

.PHONY: clean
clean:
	rm -rf dist
	rm -rf coverage
	rm -rf examples/*.js
	find . -name "*.tsbuildinfo" -delete

.PHONY: deps
deps:
	npm i

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
ci-check: build prettier
	@echo "Checking for uncommitted changes..."
	@if ! git diff --quiet --exit-code; then \
		echo "❌ Error: Files were modified by 'make build' or 'make prettier'"; \
		echo "Modified files:"; \
		git diff --name-only; \
		echo ""; \
		echo "Please run 'make build' and 'make prettier' locally and commit the changes."; \
		exit 1; \
	fi
	@echo "✅ No uncommitted changes detected"

.PHONY: publish
publish: test
	npm publish
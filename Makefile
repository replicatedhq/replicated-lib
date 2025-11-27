

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
prettier:
	npm run prettier

.PHONY: prettier-check
prettier-check: deps
	npx prettier --config .prettierrc 'src/**/*.ts' --check
	
.PHONY: publish
publish: test
	npm publish
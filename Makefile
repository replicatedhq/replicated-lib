

.PHONY: deps
deps:
	npm i

.PHONY: build
build: deps
	npm run build

.PHONY: test
test: build
	npm run test




.PHONY: deps
deps:
	npm i

.PHONY: build
build: deps
	npm run build

.PHONY: test
test: build
	npm run test

.PHONY: prettier
prettier:
	npm run prettier
	
.PHONY: publish
publish: test
	npm publish
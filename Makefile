build: jison copyjs

js/parser.js: jison

.PHONY: copyjs
copyjs:
	mkdir -p ./build
	cp -R js/* build/

.PHONY: jison
jison: build/parser.js
build/parser.js: jison/parser-generator.js
	mkdir -p ./build
	node jison/parser-generator.js -o build/parser.js

.PHONY: install
install:
	npm install

.PHONY: test
test: build
	mocha -R spec build/*-test.js

.PHONY: clean
clean:
	-rm -rf ./build/


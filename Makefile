js/parser.js: jison

.PHONY: jison
jison: js/parser-generator.js
	node js/parser-generator.js

.PHONY: pegjs
pegjs: js/parser.pegjs
	./node_modules/.bin/pegjs js/parser.pegjs

.PHONY: install
install:
	npm install

.PHONY: test
test:
	node test.js

src/parser.js: jison

.PHONY: jison
jison: src/parser-generator.js
	node src/parser-generator.js

.PHONY: pegjs
pegjs: src/parser.pegjs
	./node_modules/.bin/pegjs src/parser.pegjs

.PHONY: install
install:
	npm install

.PHONY: test
test:
	node test.js

build: alc

EXTERNALS := -x fs -x assert -x process
AL_COMPILER := ./node_modules/aletheia/alc

alc: jison copyjs compileal
	echo '#!/usr/bin/env node' > build/alc
	cat build/alc.js >> build/alc
	chmod u+x build/alc
	-rm -f ./alc
	ln -s ./build/alc ./alc

js/parser.js: jison

.PHONY: copyjs
copyjs:
	mkdir -p ./build
	cp -R js/* build/

AL_SOURCE_FILES := $(wildcard al/*.al)
.PHONY: compileal
compileal: build/alc.js

build/alc_new.js: al/alc.al
	$(AL_COMPILER) $< $@

.PHONY: jison
jison: build/parser.js
build/parser.js: jison/parser-generator.js
	mkdir -p ./build
	-rm -f ./build/parser.js
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


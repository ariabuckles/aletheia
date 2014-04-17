var fs = require("fs");

var parser = require("./src/parser.js");
var normalize = require("./src/normalize.js");
var compile = require("./src/code-gen.js");

var program = fs.readFileSync("./test.al", {encoding: 'utf8'});

console.log(program);
console.log('\n');

var parseTree = parser.parse(program);
var ast = normalize(parseTree);
var code = compile(ast);

console.log(code.toString());

module.exports = ast;

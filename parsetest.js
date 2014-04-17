var fs = require("fs");

var parser = require("./src/parser.js");
var normalize = require("./src/normalize.js");
var compile = require("./src/code-gen.js");

var program = fs.readFileSync("./test.al", {encoding: 'utf8'});

console.log(program);
console.log('\n');

var parseTree = parser.parse(program);
var ast = normalize(parseTree);
var gen = compile(ast);

var code = gen.toString();
console.log(code);
fs.writeFileSync("./output.js", code, {encoding: 'utf-8'});

console.log("\n==== INPUT ====");
console.log(program);

console.log("\n==== OUTPUT ====");
console.log(code);

console.log("\n==== EXECUTING ====");
require("./output.js");

module.exports = ast;

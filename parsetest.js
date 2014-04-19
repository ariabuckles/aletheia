var fs = require("fs");

var parser = require("./src/parser.js");
var normalize = require("./src/normalize.js");
var rewrite = require("./src/rewrite-symbols.js");
var compile = require("./src/code-gen.js");

var program = fs.readFileSync("./test.al", {encoding: 'utf8'});

console.log(program);
console.log('\n');

var parseTree = parser.parse(program);
var ast = normalize(parseTree);
var rewritten = rewrite(ast);
var gen = compile(rewritten);

var code = gen.toString();
console.log(code);
fs.writeFileSync("./output.js", code, {encoding: 'utf-8'});

console.log("\n==== INPUT ====");
console.log(program);

console.log("\n==== PARSED ====");
console.log(JSON.stringify(parseTree, null, 4));

console.log("\n==== REWRITTEN ====");
console.log(JSON.stringify(rewritten, null, 4));

console.log("\n==== OUTPUT ====");
console.log(code);

console.log("\n==== EXECUTING ====");
require("./output.js");

module.exports = ast;

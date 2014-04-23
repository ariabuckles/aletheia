var fs = require("fs");

var parser = require("./build/parser.js");
var normalize = require("./build/normalize.js");
var rewrite = require("./build/rewrite-symbols.js");
var compile = require("./build/code-gen.js");

console.log("\n==== INPUT ====");
var program = fs.readFileSync("./test.al", {encoding: 'utf8'});
console.log(program);

console.log("\n==== PARSED ====");
var parseTree = parser.parse(program);
console.log(JSON.stringify(parseTree, null, 4));

console.log("\n==== REWRITTEN ====");
var ast = normalize(parseTree);
var rewritten = rewrite(ast);
console.log(JSON.stringify(rewritten, null, 4));

console.log("\n==== OUTPUT ====");
var gen = compile(rewritten);
var code = gen.toString();
console.log(code);

fs.writeFileSync("./output.js", code, {encoding: 'utf8'});

console.log("\n==== EXECUTING ====");
require("./output.js");

module.exports = code;

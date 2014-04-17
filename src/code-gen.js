var SourceMap = require('source-map');
var SourceNode = SourceMap.SourceNode;

var s = new SourceNode(0, 0, "temp.al");
s.add("var _if = function(condition, lambda) {\n");
s.add("    if (condition) {\n");
s.add("        lambda.call(undefined);\n");
s.add("    }\n");
s.add("};");

console.log(s.toString());

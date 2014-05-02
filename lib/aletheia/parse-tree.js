var _else = {identifier: 'else'};
var _if = function(cond1, lambda1, cond2, lambda2) {
    if (arguments.length % 2 !== 0) {
        throw new Error('if called with an odd number of arguments');
    }
    var i = 0;
    for (var i = 0; i < arguments.length; i += 2) {
        var condition = arguments[i];
        if (condition != null && condition !== false) {
            return arguments[i + 1].call(undefined);
        }
    }
};

var _while = function(conditionLambda, bodyLambda) {
    while (conditionLambda.call(undefined)) {
        bodyLambda.call(undefined);
    }
}

var assert = require("assert");
var _ = require("underscore");
var is_instance = (function(a, A) {
return a instanceof A;
});
var ParseNode = (function(options) {
_if(! is_instance(this, ParseNode), (function() {
return new ParseNode(options);
}));
assert((options.type !== null));
_.extend(this, options);
});
var ParseTree = {
ParseNode: ParseNode,
StatementList: (function(statements) {
return new ParseNode({
type: "statement-list",
statements: statements
});
}),
Declaration: (function(left, right) {
return new ParseNode({
type: "assignment",
modifier: null,
left: left,
right: right
});
}),
Assignment: (function(leftUnitList, right) {
var units = leftUnitList.units;
_if((units.length !== 2), [{
type: "unit-list",
units: [{
type: "variable",
name: "throw"
},
{
type: "variable",
name: "new"
},
{
type: "variable",
name: "Error"
},
{
type: "operation",
left: {
type: "operation",
left: "Variable assignment may have a single ",
operation: "+",
right: "modifier; got "
},
operation: "+",
right: {
type: "unit-list",
units: [{
type: "table-access",
table: {
type: "variable",
name: "JSON"
},
key: "stringify"
},
{
type: "variable",
name: "leftUnitList"
}]
}
}]
}]);
_if((units[0].type !== "variable"), [{
type: "unit-list",
units: [{
type: "variable",
name: "throw"
},
{
type: "variable",
name: "new"
},
{
type: "variable",
name: "Error"
},
"Variable assignment may only have a word identifier"]
}]);
return new ParseNode({
type: "assignment",
modifier: units[0].name,
left: units[1],
right: right
});
}),
Lambda: (function(args, statements) {
return new ParseNode({
type: "lambda",
arguments: args,
statements: statements
});
}),
UnitList: (function(units) {
return new ParseNode({
type: "unit-list",
units: units
});
}),
Table: (function(fields, forceObject) {
return new ParseNode({
type: "table",
fields: fields,
forceObject: forceObject
});
}),
Field: (function(key, value) {
return new ParseNode({
type: "field",
key: key,
value: value
});
}),
TableAccess: (function(table, key) {
return new ParseNode({
type: "table-access",
table: table,
key: key
});
}),
Operation: (function(left, op, right) {
return new ParseNode({
type: "operation",
left: left,
operation: op,
right: right
});
}),
Variable: (function(name) {
return new ParseNode({
type: "variable",
name: name
});
}),
Javascript: (function(source) {
return new ParseNode({
type: "javascript",
source: source
});
})
};
module.exports = ParseTree;

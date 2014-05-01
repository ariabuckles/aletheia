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

var _ = require("underscore");
var ParseTree = require("./parse-tree.js");
var SyntaxTree = require("./syntax-tree.js");
var ParseNode = ParseTree.ParseNode;
var SyntaxNode = SyntaxTree.SyntaxNode;
var normalize = undefined;
var is_instance = (function(a, A) {
return a instanceof A;
});
var isConstant = (function(parsed) {
return (! _.isArray(parsed) && ! is_instance(parsed, ParseNode));
});
var mapObject = (function(obj, func) {
var result = {

};
_.each(obj, (function(value, key) {
result[key] = func(value);
}));
return result;
});
var syntaxWithSameFields = (function(parse) {
return SyntaxNode(mapObject(parse, normalize));
});
var normalizationTable = {
assignment: syntaxWithSameFields,
lambda: syntaxWithSameFields,
"unit-list": syntaxWithSameFields,
"table-access": syntaxWithSameFields,
field: syntaxWithSameFields,
operation: syntaxWithSameFields,
variable: syntaxWithSameFields,
javascript: syntaxWithSameFields,
table: (function(table) {
var fields = table.fields;
var forceObject = table.forceObject;
var isStrictArray = ((forceObject === false) && _.all(fields, (function(field) {
return ((field.key === null) || (field.key === undefined));
})));
return _if(isStrictArray, (function() {
return _.pluck(fields, "value");
}), _else, (function() {
var isStrictObject = _.all(fields, (function(field) {
return (((field.key !== null) && (field.key !== undefined)) && isConstant(field.key));
}));
return _if(isStrictObject, (function() {
var result = {

};
_.each(fields, (function(field) {
result[field.key] = normalize(field.value);
}));
return result;
}), _else, (function() {
return SyntaxNode({
type: "table",
fields: normalize(fields)
});
}));
}));
})
};
normalize = (function(parsed) {
return _if(_.isArray(parsed), (function() {
return _.map(parsed, normalize);
}), _else, (function() {
return _if(is_instance(parsed, ParseNode), (function() {
var type = parsed.type;
return normalizationTable[type](parsed);
}), _else, (function() {
return parsed;
}));
}));
});
module.exports = normalize;

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

var DEBUG_TYPES = false;
var console = global.console;
var SyntaxError = global.SyntaxError;
var assert = require("assert");
var _ = require("underscore");
var SyntaxNode = require("./syntax-tree").SyntaxNode;
var is_instance = (function(a, A) {
return a instanceof A;
});
var mapObject = (function(obj, func) {
var result = {

};
_.each(obj, (function(value, key) {
result[key] = func(value);
}));
return result;
});
var KEYWORD_VARIABLES = {
ret: true,
new: true,
not: true,
undefined: true,
null: true,
throw: true,
this: true
};
var ArrayType = [{
length: "number",
concat: "?",
every: "?",
filter: "?",
forEach: "?",
indexOf: "?",
join: "?",
lastIndexOf: "?",
map: "?",
pop: "?",
push: "?",
reduce: "?",
reduceRight: "?",
reverse: "?",
shift: "?",
slice: "?",
some: "?",
sort: "?",
splice: "?",
toLocaleString: "?",
toString: "?",
unshift: "?"
}];
var MAGIC = {
self: true,
this: true,
_it: true
};
var Context = (function(parentContext) {
this.parent = parentContext;
this.scope = Object.create(parentContext.scope);
delete(this.scope.x);
});
_.extend(Context.prototype, {
get: (function(varname) {
return this.scope[varname];
}),
has: (function(varname) {
assert(_.isString(varname), ("passed a non string to Context.has: " + varname));
return (this.get(varname) !== undefined);
}),
get_modifier: (function(varname) {
var vardata = this.get(varname);
return _if(vardata, (function(_it) {
return vardata.modifier;
}), _else, (function(_it) {
return "undeclared";
}));
}),
get_type: (function(varname) {
var vardata = this.get(varname);
var thisref = this;
return _if(! vardata, (function(_it) {
console.warn((("ALC INTERNAL-ERR: Variable `" + varname) + "` has not been declared."));
return "undeclared";
}), _else, (function(_it) {
return _if(vardata.exprtype, (function(_it) {
return vardata.exprtype;
}), _else, (function(_it) {
var exprtype = get_type(vardata.value, thisref);
vardata.exprtype = exprtype;
return exprtype;
}));
}));
}),
may_declare: (function(varname) {
return (this.get(varname) === undefined);
}),
may_be_param: (function(varname) {
return ((this.may_declare(varname) || MAGIC[varname]) === true);
}),
may_mutate: (function(varname) {
return (this.get_modifier(varname) === "mutable");
}),
declare: (function(modifier, varname, exprtype, value) {
var actual_modifier = _if(! modifier, (function(_it) {
return "const";
}), _else, (function(_it) {
return modifier;
}));
assert(actual_modifier);
assert(varname);
this.scope[varname] = {
modifier: actual_modifier,
exprtype: exprtype,
value: value,
context: this
};
}),
pushScope: (function(_it) {
return new Context(this);
}),
popScope: (function(_it) {
return this.parent;
})
});
var LambdaWithContext = (function(lambda, context) {
this.lambda = lambda;
this.context = context;
});
var union = (function(typeA, typeB) {
return _if(((typeA === "?") || (typeB === "?")), (function(_it) {
return "?";
}), _else, (function(_it) {
return _.union(typeA, typeB);
}));
});
var subtypein = (function(subtype, exprtype) {
return _.any(exprtype, (function(subexprtype) {
return _.isEqual(subexprtype, subtype);
}));
});
var matchtypes = (function(exprtype, vartype) {
assert(vartype);
return _if(((vartype === "?") || (exprtype === "?")), (function(_it) {
return true;
}), _.isArray(exprtype), (function(_it) {
return _.all(exprtype, (function(subexprtype) {
return matchtypes(subexprtype, vartype);
}));
}), _.isArray(vartype), (function(_it) {
return _.any(vartype, (function(subvartype) {
return matchtypes(exprtype, subvartype);
}));
}), _.isObject(exprtype), (function(_it) {
return (_.isObject(vartype) && _.all(_.keys(exprtype), (function(key) {
return matchtypes(exprtype[key], vartype[key]);
})));
}), _else, (function(_it) {
return _.isEqual(exprtype, vartype);
}));
});
var check = (function(node, context) {
assert(is_instance(context, Context), ("Not a Context: " + context));
var res = _if(is_instance(node, SyntaxNode), (function(_it) {
return check[node.type](node, context);
}), check[typeof(node)], (function(_it) {
return check[typeof(node)](node, context);
}), _else, (function(_it) {
return true;
}));
return res;
});
var nop = (function(node) {
return null;
});
var enqueue_lambdas = (function(queue, lambda) {
_if(is_instance(lambda, LambdaWithContext), (function(_it) {
queue.push(lambda);
}), _.isArray(lambda), (function(_it) {
var rlambdas = _.clone(lambda);
rlambdas.reverse();
_.each(rlambdas, (function(each_lambda) {
enqueue_lambdas(queue, each_lambda);
}));
}), _else, (function(_it) {
throw new Error((("ALC-INTERNAL-ERROR: " + "a non-lambda was passed to enqueue_lambdas: ") + lambda));
}));
});
_.extend(check, {
number: nop,
string: nop,
undefined: nop,
boolean: nop,
"table-key": nop,
operation: nop,
javascript: nop,
regex: nop,
variable: (function(variable, context) {
_if((! KEYWORD_VARIABLES[variable.name] && ! context.has(variable.name)), (function(_it) {
throw new SyntaxError((("ALC: Use of undeclared variable `" + variable.name) + "`."));
}));
return null;
}),
"statement-list": (function(stmts, context) {
var lambdas_with_contexts = _.filter(_.map(stmts, (function(stmt) {
return check(stmt, context);
})), _.identity);
var queue = [];
enqueue_lambdas(queue, lambdas_with_contexts);
_while((function(_it) {
return (queue.length !== 0);
}), (function(_it) {
var lambda_with_context = queue.pop();
var lambda = lambda_with_context.lambda;
var lambda_context = lambda_with_context.context;
var new_lambdas = check(lambda, lambda_context);
enqueue_lambdas(queue, new_lambdas);
}));
return null;
}),
object: (function(obj, context) {
var lambdas_with_contexts = _.filter(_.map(obj, (function(value, key) {
return _if((value.type === "lambda"), (function(_it) {
return new LambdaWithContext(value, context);
}), _else, (function(_it) {
return check(value, context);
}));
})), _.identity);
return lambdas_with_contexts;
}),
assignment: (function(assign, context) {
assert(is_instance(context, Context), (Object.getPrototypeOf(context) + " is not a Context"));
var modifier = assign.modifier;
var left = assign.left;
var type = left.type;
assert(_.contains([null,
"mutable",
"mutate"], modifier), (("ALC: Unrecognized modifier `" + modifier) + "`"));
_if((type === "variable"), (function(_it) {
_if(((modifier === null) || (modifier === "mutable")), (function(_it) {
_if(! context.may_declare(left.name), (function(_it) {
throw new SyntaxError(((("ALC: Shadowing `" + left.name) + "` is ") + "not permitted. Use `mutate` to mutate."));
}), _else, (function(_it) {
context.declare(modifier, left.name, left.vartype, assign.right);
}));
}), (modifier === "mutate"), (function(_it) {
_if(! context.may_mutate(left.name), (function(_it) {
var declmodifiertype = context.get_modifier(left.name);
throw new SyntaxError(((((((("ALC: Mutating `" + left.name) + "`, which has ") + "modifier `") + declmodifiertype) + "` is ") + "not permitted. Declare with `mutable` ") + "to allow mutation."));
}));
}), _else, (function(_it) {
assert(false, ("Invalid modifier " + modifier));
}));
}), (type === "table-access"), (function(_it) {
nop();
}), _else, (function(_it) {
throw new Error(("ALINTERNAL: Unrecognized lvalue type: " + type));
}));
var right_side_lambdas = _if((assign.right.type === "lambda"), (function(_it) {
return new LambdaWithContext(assign.right, context);
}), _else, (function(_it) {
return check(assign.right, context);
}));
_if((type === "variable"), (function(_it) {
var vartype = context.get_type(left.name);
var righttype = get_type(assign.right, context);
_if(! matchtypes(righttype, vartype), (function(_it) {
throw new SyntaxError((((((((("Type mismatch: `" + left.name) + "` of type `") + JSON.stringify(vartype)) + "` is incompatible with expression of type `") + JSON.stringify(righttype)) + "`.") + "assignment: ") + JSON.stringify(assign)));
}));
}), (type === "table-access"), (function(_it) {
var key = left.key;
_if((typeof(key) === "string"), (function(_it) {
var table_type = get_type(left.table, context);
return _if((table_type === "?"), (function(_it) {
nop();
}), (table_type.length > 1), (function(_it) {
nop();
}), (table_type.length === 0), (function(_it) {
throw new SyntaxError(((("ALC: Mutating table key `" + key) + "` which has ") + "type empty-set, is impossible."));
}), _else, (function(_it) {
var single_table_type = table_type[0];
var property_type = single_table_type[key];
var righttype = get_type(assign.right, context);
_if(! matchtypes(property_type, righttype), (function(_it) {
throw new SyntaxError((((((((("Type mismatch: table key `" + key) + "` of type `") + JSON.stringify(property_type)) + "` is incompatible with expression of type `") + JSON.stringify(righttype)) + "`.") + "assignment: ") + JSON.stringify(assign)));
}));
}));
}));
}));
return right_side_lambdas;
}),
"unit-list": (function(unitList, context) {
var lambdas = _.filter(_.map(unitList.units, (function(unit) {
return _if((unit.type === "lambda"), (function(_it) {
return new LambdaWithContext(unit, context);
}), _else, (function(_it) {
return check(unit, context);
}));
})), _.identity);
return lambdas;
}),
lambda: (function(lambda, context) {
var innercontext = context.pushScope();
_.each(lambda.arguments, (function(arg) {
_if(! innercontext.may_be_param(arg.name), (function(_it) {
throw new SyntaxError(((("ALC: Param shadowing `" + arg.name) + "`") + " not permitted. Use `mutate` to mutate."));
}), _else, (function(_it) {
innercontext.declare("const", arg.name, "?");
}));
}));
var inner_lambdas_with_contexts = _.filter(_.map(lambda.statements, (function(stmt) {
return check(stmt, innercontext);
})), _.identity);
return inner_lambdas_with_contexts;
}),
"table-access": (function(table_access, context) {
var lambdas = check(table_access.table, context);
var key = table_access.key;
_if((typeof(key) !== "string"), (function(_it) {
check(key, context);
}), _else, (function(_it) {
var table_type = get_type(table_access.table, context);
var table_access_type = get_type(table_access, context);
_if((table_access_type === undefined), (function(_it) {
throw new Error(((((("Table of type `" + JSON.stringify(table_type)) + "` does not have ") + "a type for key `") + key) + "`. "));
}), _else, (function(_it) {
_if((table_access_type === "?"), (function(_it) {
nop();
}), (table_access_type.length === 0), (function(_it) {
throw new SyntaxError(((("Table `" + JSON.stringify(table_access.table)) + "` is of type empty-set, which is impossible to ") + "access, but it was accessed."));
}));
}));
}));
return lambdas;
})
});
var get_type = (function(node, context) {
assert(is_instance(context, Context), ("Not a Context: " + context));
var res = _if(is_instance(node, SyntaxNode), (function(_it) {
return get_type[node.type](node, context);
}), _else, (function(_it) {
return get_type[typeof(node)](node, context);
}));
_if(DEBUG_TYPES, (function(_it) {
console.log("get_type", res, node);
}));
return res;
});
_.extend(get_type, {
number: (function(_it) {
return ["number"];
}),
string: (function(_it) {
return ["string"];
}),
undefined: (function(_it) {
return ["undefined"];
}),
boolean: (function(_it) {
return ["boolean"];
}),
operation: (function(op, context) {
var left = op.left;
var right = op.right;
return union(get_type(op.left, context), get_type(op.right, context));
}),
javascript: (function(_it) {
return "?";
}),
regex: (function(_it) {
return "?";
}),
"table-access": (function(table_access, context) {
var key = table_access.key;
return _if((typeof(key) !== "string"), (function(_it) {
return "?";
}), _else, (function(_it) {
var table_type = get_type(table_access.table, context);
return _if((table_type === "?"), (function(_it) {
return "?";
}), (table_type.length > 1), (function(_it) {
return "?";
}), (table_type.length === 0), (function(_it) {
return [];
}), _else, (function(_it) {
var single_table_type = table_type[0];
var property_type = single_table_type[key];
return property_type;
}));
}));
}),
"unit-list": (function(_it) {
return "?";
}),
variable: (function(variable, context) {
return context.get_type(variable.name);
}),
object: (function(obj, context) {
return _if((obj === null), (function(_it) {
return ["null"];
}), _.isArray(obj), (function(_it) {
return ArrayType;
}), _else, (function(_it) {
return [mapObject(obj, (function(val) {
return get_type(val, context);
}))];
}));
}),
lambda: (function(_it) {
return "?";
})
});
var check_program = (function(node, external_vars) {
var context = new Context({
scope: null
});
context.declare("const", "true", ["boolean"]);
context.declare("const", "false", ["boolean"]);
context.declare("const", "undefined", ["undefined"]);
context.declare("const", "null", ["null"]);
context.declare("const", "not", "?");
context.declare("const", "this", "?");
context.declare("const", "if", "?");
context.declare("const", "else", "?");
context.declare("const", "while", "?");
context.declare("const", "throw", "?");
context.declare("const", "new", "?");
context.declare("const", "delete", "?");
context.declare("const", "typeof", "?");
context.declare("const", "global", "?");
context.declare("const", "require", "?");
context.declare("const", "module", "?");
context.declare("const", "__filename", "?");
context.declare("const", "Error", "?");
context.declare("const", "String", "?");
context.declare("const", "Function", "?");
context.declare("const", "Object", "?");
context.declare("const", "Number", "?");
context.declare("const", "RegExp", "?");
_.each(external_vars, (function(ext) {
return context.declare("const", ext, "?");
}));
check["statement-list"](node, context);
});
module.exports = check_program;

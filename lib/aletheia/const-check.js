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

var SyntaxError = global.SyntaxError;
var assert = require("assert");
var _ = require("underscore");
var SyntaxNode = require("./syntax-tree").SyntaxNode;
var is_instance = (function(a, A) {
return a instanceof A;
});
var nop = (function(node) {
return undefined;
});
var MAGIC = {
self: true,
this: true,
_it: true
};
var Context = (function(_it) {
this.scopes = [{

}];
});
_.extend(Context.prototype, {
has: (function(varname) {
var result = false;
_.each(this.scopes, (function(scope) {
_if(_.has(scope, varname), (function(_it) {
result = scope[varname];
}));
}));
return result;
}),
may_declare: (function(varname) {
return (this.has(varname) === false);
}),
may_be_param: (function(varname) {
return ((this.may_declare(varname) || MAGIC[varname]) !== false);
}),
may_mutate: (function(varname) {
return (this.has(varname) === "mutable");
}),
declare: (function(modifier, varname) {
var actual_modifier = _if(! modifier, (function(_it) {
return "const";
}), _else, (function(_it) {
return modifier;
}));
assert(actual_modifier);
assert(varname);
_.last(this.scopes)[varname] = actual_modifier;
}),
pushScope: (function(_it) {
this.scopes.push({

});
}),
popScope: (function(_it) {
this.scopes.pop();
})
});
var check = (function(node, context) {
assert(is_instance(context, Context), ("Not a Context: " + JSON.stringify(context)));
var res = _if(is_instance(node, SyntaxNode), (function(_it) {
return check[node.type](node, context);
}), check[typeof(node)], (function(_it) {
return check[typeof(node)](node, context);
}), _else, (function(_it) {
return true;
}));
return res;
});
_.extend(check, {
number: nop,
string: nop,
undefined: nop,
boolean: nop,
"table-key": nop,
"table-access": nop,
operation: nop,
javascript: nop,
regex: nop,
variable: nop,
"statement-list": (function(stmts, context) {
_.each(stmts, (function(stmt) {
check(stmt, context);
}));
}),
object: (function(obj, context) {
_.each(obj, (function(value, key) {
return check(value, context);
}));
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
context.declare(modifier, left.name);
}));
}), (modifier === "mutate"), (function(_it) {
_if(! context.may_mutate(left.name), (function(_it) {
var declmodifiertype = context.has(left.name);
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
check(assign.right, context);
}),
"unit-list": (function(unitList, context) {
_.each(unitList.units, (function(_it) {
return check(_it, context);
}));
}),
lambda: (function(lambda, context) {
context.pushScope();
_.each(lambda.arguments, (function(arg) {
_if(! context.may_be_param(arg.name), (function(_it) {
throw new SyntaxError(((("ALC: Param shadowing `" + arg.name) + "`") + " not permitted. Use `mutate` to mutate."));
}), _else, (function(_it) {
context.declare("const", arg.name);
}));
}));
_.each(lambda.statements, (function(stmt) {
check(stmt, context);
}));
context.popScope();
})
});
var check_program = (function(node) {
var context = new Context();
check["statement-list"](node, context);
});
module.exports = check_program;

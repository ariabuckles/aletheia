// !!!!!!!!!!!!!!!!!!!!!!!
// WIP: Not functional yet
// !!!!!!!!!!!!!!!!!!!!!!!
//
// High level overview:
// We walk through the top-level statement list and type-check
// all non-lambdas, while building up a list of lambdas.
// Then we do a dfs-style type-check on the resulting lambdas.
// Since each lambda may reference another lambda, when it looks
// for the type of the reference and it is not present, the
// second lambda will be type-checked. As long as the lambdas form
// a dag (i.e. are not mutually recursive), this will work.
// Mutually recursive functions can be resolved by making the type
// of one of them dynamic.

DEBUG_TYPES = false

SyntaxError = global.SyntaxError
assert = require "assert"

_ = require "underscore"
SyntaxNode = (require "./syntax-tree").SyntaxNode

is_instance = [a A | ret ```a instanceof A```]

mapObject = [ obj func |
    mutable result = {:}
    _.each obj [ value key |
        mutate result@key = func value
    ]
    ret result
]


KEYWORD_VARIABLES = {
    ret = true
    new = true
    not = true
    undefined = true
    null = true
    throw = true
    this = true
}

MAGIC = {
    self = true
    this = true
    _it = true
}

// A context is an array of scopes of variables
// TODO: Fix variables named __proto__
Context = [ parentContext |
    mutate this.parent = parentContext
    mutate this.scope = Object.create parentContext.scope
    delete this.scope.x  // Disable hidden classes for this.scope
]
_.extend Context.prototype {
    get = [ varname |
        ret this.scope@varname
    ]

    has = [ varname |
        assert (_.isString varname) (
            "passed a non string to Context.has: " + varname
        )
        ret ((this.get varname) != undefined)
    ]

    get_modifier = [ varname |
        vardata = this.get varname
        ret if vardata [ vardata.modifier ] else [ 'undeclared' ]
    ]

    get_type = [ varname |
        vardata = this.get varname
        thisref = this
        ret if (not vardata) [
            console.warn (
                "ALC INTERNAL-ERR: Variable `" + varname +
                "` has not been declared."
            )
            ret 'undeclared'
        ] else [
            ret if (vardata.exprtype) [
                ret vardata.exprtype
            ] else [
                exprtype = get_type vardata.value thisref
                mutate vardata.exprtype = exprtype
                ret exprtype
            ]
        ]
    ]

    may_declare = [ varname |
        ret ((this.get varname) == undefined)
    ]

    may_be_param = [ varname |
        ret (((this.may_declare varname) or MAGIC@varname) == true)
    ]

    may_mutate = [ varname |
        ret ((this.get_modifier varname) == 'mutable')
    ]

    declare = [ modifier varname exprtype value |
        actual_modifier = if (not modifier) ['const'] else [modifier]
        assert actual_modifier
        assert varname
        mutate this.scope@varname = {
            modifier: actual_modifier
            exprtype: exprtype
            value: value
            context: this
        }
    ]

    pushScope = [
        ret new Context this
    ]

    popScope = [
        ret this.parent
    ]
}


LambdaWithContext = [ lambda context |
    mutate this.lambda = lambda
    mutate this.context = context
]

union = [ typeA typeB |
    ret if (typeA == '?' or typeB == '?') [
        ret '?'
    ] else [
        ret _.union typeA typeB
    ]
]

subtypein = [ subtype exprtype |
    ret _.any exprtype [ subexprtype | _.isEqual subexprtype subtype ]
]

// TODO: Use real sets to make this faster
matchtypes = [ vartype exprtype |
    assert vartype
    ret if (vartype == '?' or exprtype == '?') [
        ret true
    ] else [
        result = _.all exprtype [ subexprtype |
            ret subtypein subexprtype vartype
        ]
        ret result
    ]
]


check = [ node context |
    assert (is_instance context Context) (
        "Not a Context: " + context
    )

    res = if (is_instance node SyntaxNode) [
        ret check@(node.type) node context
    ] (check@(typeof node)) [
        // compile time constant
        ret check@(typeof node) node context
    ] else [
        ret true
    ]
    ret res
]

nop = [ node | null ]

enqueue_lambdas = [ queue lambda |
    if (is_instance lambda LambdaWithContext) [
        queue.push lambda
    ] (_.isArray lambda) [
        rlambdas = _.clone(lambda)
        rlambdas.reverse()
        _.each rlambdas [ each_lambda |
            enqueue_lambdas queue each_lambda
        ]
    ] else [
        throw new Error ("ALC-INTERNAL-ERROR: " +
            "a non-lambda was passed to enqueue_lambdas: " +
            lambda
        )
    ]
]

_.extend check {
    number = nop
    string = nop
    undefined = nop
    boolean = nop
    "table-key" = nop
    "operation" = nop
    "javascript" = nop
    "regex" = nop
    "table-access" = nop

    "variable" = [ variable context |
        if ((not KEYWORD_VARIABLES@(variable.name)) and
                (not (context.has variable.name))) [
            console.warn (
                "ALC: WARNING: Use of undeclared variable `" +
                variable.name + "`."
            )
        ]
        ret null
    ]

    "statement-list" = [ stmts context |
        lambdas_with_contexts = stmts -> _.map [ stmt |
            ret check stmt context
        ] -> _.filter _.identity

        // Here we make a stack of lambdas
        // called a queue /sigh
        mutable queue = {}
        enqueue_lambdas queue lambdas_with_contexts

        while [ queue.length != 0 ] [
            lambda_with_context = queue.pop()
            lambda = lambda_with_context.lambda
            lambda_context = lambda_with_context.context
            new_lambdas = check lambda lambda_context
            enqueue_lambdas queue new_lambdas
        ]

        ret null
    ]

    object = [ obj context |
        lambdas_with_contexts = obj -> _.map [ value key |
            ret if (value.type == 'lambda') [
                ret new LambdaWithContext value context
            ] else [
                ret check value context
            ]
        ] -> _.filter _.identity

        ret lambdas_with_contexts
    ]

    assignment = [ assign context |
        assert (is_instance context Context) (
            (Object.getPrototypeOf context) +
            " is not a Context"
        )

        modifier = assign.modifier
        left = assign.left
        type = left.type

        assert ({null, 'mutable', 'mutate'} -> _.contains modifier) (
            "ALC: Unrecognized modifier `" + modifier + "`"
        )

        if (type == 'variable') [
            if (modifier == null or modifier == 'mutable') [
                if (not (context.may_declare left.name)) [
                    throw new SyntaxError (
                        "ALC: Shadowing `" + left.name + "` is " +
                        "not permitted. Use `mutate` to mutate."
                    )
                ] else [
                    context.declare modifier left.name left.vartype assign.right
                ]
            ] (modifier == 'mutate') [
                if (not (context.may_mutate left.name)) [
                    declmodifiertype = context.get_modifier left.name
                    throw new SyntaxError (
                        "ALC: Mutating `" + left.name + "`, which has " +
                        "modifier `" + declmodifiertype + "` is " +
                        "not permitted. Declare with `mutable` " +
                        "to allow mutation."
                    )
                ]
            ] else [
                assert false ("Invalid modifier " + modifier)
            ]
        ] (type == 'table-access') [
            nop()  // TODO: Remove the necessity of an empty nop here?
        ] else [
            throw new Error ("ALINTERNAL: Unrecognized lvalue type: " + type)
        ]

        vartype = context.get_type left.name
        righttype = get_type assign.right context
        assert (matchtypes vartype righttype) (
            "Type mismatch: `" + left.name + "` of type `" + (JSON.stringify vartype) +
            "` is incompatible with expression of type `" + (JSON.stringify righttype) + "`."
        )

        ret if (assign.right.type == 'lambda') [
            ret new LambdaWithContext assign.right context
        ] else [
            ret check assign.right context
        ]
    ]

    "unit-list" = [ unitList context |
        lambdas = unitList.units -> _.map [ unit |
            ret if (unit.type == 'lambda') [
                ret new LambdaWithContext unit context
            ] else [
                ret check unit context
            ]
        ] -> _.filter _.identity

        ret lambdas
    ]

    // TODO: Declare these variables in the scope, and
    // later check for undefined variables
    lambda = [ lambda context |
        innercontext = context.pushScope()
        lambda.arguments -> _.each [ arg |
            if (not (innercontext.may_be_param arg.name)) [
                throw new SyntaxError (
                    "ALC: Param shadowing `" + arg.name + "`" +
                    " not permitted. Use `mutate` to mutate."
                )
            ] else [
                innercontext.declare 'const' arg.name '?'
            ]
        ]

        inner_lambdas_with_contexts = lambda.statements -> _.map [ stmt |
            ret check stmt innercontext
        ] -> _.filter _.identity

        ret inner_lambdas_with_contexts
    ]
}


get_type = [ node context |
    assert (is_instance context Context) (
        "Not a Context: " + context
    )

    res = if (is_instance node SyntaxNode) [
        ret get_type@(node.type) node context
    ] else [
        // compile time constant
        ret get_type@(typeof node) node context
    ]

    if DEBUG_TYPES [
        console.log "get_type" res node
    ]

    ret res
]

_.extend get_type {
    number = [ {'number'} ]
    string = [ {'string'} ]
    undefined = [ {'undefined'} ]
    boolean = [ {'boolean'} ]
    "operation" = [ op context |
        left = op.left
        right = op.right
        ret union (get_type op.left context) (get_type op.right context)
    ]

    "javascript" = [ '?' ]
    "regex" = [ '?' ]

    "table-access" = [ '?' ]

    "unit-list" = [ '?' ]

    variable = [ variable context | context.get_type variable.name ]

    object = [ obj context |
        ret if (obj == null) [
            ret {'null'}
        ] else [
            ret { mapObject obj [ val | get_type val context ] }
        ]
    ]

    lambda = [ '?' ]
}


check_program = [ node external_vars |
    context = new Context { scope: null }
    context.declare 'const' 'true' {'boolean'}
    context.declare 'const' 'false' {'boolean'}
    context.declare 'const' 'undefined' {'undefined'}
    context.declare 'const' 'null' {'null'}
    context.declare 'const' 'not' '?'

    context.declare 'const' 'this' '?'

    context.declare 'const' 'if' '?'
    context.declare 'const' 'else' '?'
    context.declare 'const' 'while' '?'
    context.declare 'const' 'throw' '?'
    context.declare 'const' 'new' '?'
    context.declare 'const' 'delete' '?'

    context.declare 'const' 'global' '?'
    context.declare 'const' 'require' '?'
    context.declare 'const' '__filename' '?'

    context.declare 'const' 'Error' '?'
    context.declare 'const' 'String' '?'
    context.declare 'const' 'Function' '?'
    context.declare 'const' 'Object' '?'
    context.declare 'const' 'Number' '?'
    context.declare 'const' 'RegExp' '?'
    
    _.each external_vars [ ext | context.declare 'const' ext '?' ]
    check@"statement-list" node context
]

mutate module.exports = check_program

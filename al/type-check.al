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

assert = require "assert"

_ = require "underscore"
SyntaxNode = (require "./syntax-tree").SyntaxNode

is_instance = [a A | ret ```a instanceof A```]

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
        ret ((this.get varname) != undefined)
    ]

    get_modifier = [ varname |
        vardata = this.get varname
        ret if vardata [ vardata.modifier ]
    ]

    get_type = [ varname |
        vardata = this.get varname
        ret if vardata [ vardata.exprtype ]
    ]

    may_declare = [ varname |
        ret ((this.get varname) == undefined)
    ]

    may_be_param = [ varname |
        ret (((this.may_declare varname) or MAGIC@varname) == true)
    ]

    may_mutate = [ varname |
        ret ((this.get varname).modifier == 'mutable')
    ]

    declare = [ modifier varname exprtype |
        actual_modifier = if (not modifier) ['const'] else [modifier]
        assert actual_modifier
        assert varname
        mutate this.scope@varname = {
            modifier: actual_modifier
            exprtype: exprtype
            context: this
        }
    ]

    pushScope = [
        ret new Context this.scope
    ]

    popScope = [
        ret this.parent
    ]
}


check = [ node context |
    assert (is_instance context Context) (
        "Not a Context: " + (JSON.stringify context)
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
        if (not (context.has variable)) [
            console.warn (
                "Use of undeclared variable `" +
                variable + "`."
            )
        ]
        ret null
    ]

    "statement-list" = [ stmts context |
        lambdas = stmts -> _.map [ stmt |
            ret check stmt context
        ] -> _.filter _.identity

        lambdas -> _.each [ lambda |
            check lambda context
        ]

        ret null
    ]

    object = [ obj context |
        lambdas = obj -> _.map [ value key |
            ret check value context
        ] -> _.filter _.identity

        lambdas -> _.each [ lambda |
            check lambda context
        ]

        ret null
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
                    context.declare modifier left.name  // TODO: Get type here
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

        ret if (assign.right.type == 'lambda') [
            ret assign.right
        ] else [
            ret check assign.right context
        ]
    ]

    "unit-list" = [ unitList context |
        lambdas = unitList.units -> _.map [ unit |
            ret check unit context
        ] -> filter _.identity

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
                innercontext.declare 'const' arg.name
            ]
        ]

        innerlambdas = lambda.statements -> _.map [ stmt |
            ret check stmt innercontext
        ] -> _.filter _.identity

        ret innerlambdas
    ]
}

check_program = [ node |
    global_scope = _.extend (Object.create null) {
        if: {
            modifier: 'const'
            exprtype: '?'
        }
        while: {
            modifier: 'const'
            exprtype: '?'
        }
        global: {
            modifier 'const'
            exprtype: '?'
        }
    }
    context = new Context { scope: null }
    context.declare 'const' 'global' '?'
    context.declare 'const' 'if' '?'
    context.declare 'const' 'while' '?'
    check@"statement-list" node context
]

mutate module.exports = check_program

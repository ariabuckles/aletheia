assert = require "assert"

_ = require "underscore"
SyntaxNode = (require "./syntax-tree").SyntaxNode

is_instance = [a A | ret ```a instanceof A```]
nop = [ node | undefined ]

MAGIC = {
    self = true
    this = true
    _it = true
}

// A context is an array of scopes of variables
Context = [
    mutate this.scopes = {
        {=}
    }
]
_.extend Context.prototype {
    has: [ varname |
        mutable result = false
        _.each this.scopes [ scope |
            if (scope -> _.has varname) [
                mutate result = true
            ]
        ]
        ret result
    ]

    may_declare: [ varname |
        ret not (this.has varname)
    ]

    may_be_param: [ varname |
        ret (((this.may_declare varname) or MAGIC@varname) == true)
    ]

    declare: [ varname |
        mutate (_.last this.scopes)@varname = true
    ]

    pushScope: [
        this.scopes.push {=}
    ]

    popScope: [
        this.scopes.pop()
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
_.extend check {
    number = nop
    string = nop
    undefined = nop
    boolean = nop
    "table-key" = nop
    "table-access" = nop
    "operation" = nop
    "javascript" = nop
    "regex" = nop
    "variable" = nop

    "statement-list": [ stmts context |
        stmts -> _.each [ stmt |
            check stmt context
        ]
    ]

    object = [ obj context |
        obj -> _.each [ value key | check value context ]
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
                        "ALC: Shadowing `" + left.name + "`" +
                        " not permitted. Use `mutate` to mutate."
                    )
                ] else [
                    context.declare left.name
                ]
            ] (modifier == 'mutate') [
                nop()
            ] else [
                assert false ("Invalid modifier " + modifier)
            ]
        ] (type == 'table-access') [
            nop()  // TODO: Remove the necessity of an empty nop here?
        ] else [
            throw new Error ("ALINTERNAL: Unrecognized lvalue type: " + type)
        ]

        check assign.right context
    ]

    "unit-list" = [ unitList context |
        unitList.units -> _.each [ check _it context ]
    ]

    // TODO: Declare these variables in the scope, and
    // later check for undefined variables
    lambda: [ lambda context |
        context.pushScope()
        lambda.arguments -> _.each [ arg |
            if (not (context.may_be_param arg.name)) [
                throw new SyntaxError (
                    "ALC: Param shadowing `" + arg.name + "`" +
                    " not permitted. Use `mutate` to mutate."
                )
            ] else [
                context.declare arg.name
            ]
        ]
        lambda.statements -> _.each [ stmt |
            check stmt context
        ]
        context.popScope()
    ]
}

check_program = [ node |
    context = new Context()
    check@"statement-list" node context
]

mutate module.exports = check_program

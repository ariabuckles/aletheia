// Add contexts to variable declarations and lambdas

DEBUG_TYPES = true

console = global.console
SyntaxError = global.SyntaxError
assert = require "assert"

_ = require "underscore"
SyntaxNode = (require "./syntax-tree").SyntaxNode
Context = require "./context"

is_instance = [a A | ret ```a instanceof A```]

JSON = global.JSON

mutable contextualize :: ? = null

mutate contextualize = [ node parentContext |
    assert (is_instance parentContext Context) (
        "Not a Context: " + parentContext
    )

    res = if ((is_instance node SyntaxNode) and
                (contextualize@(node.type))
            ) [
        ret contextualize@(node.type) node parentContext
    ] else [
        // compile-time constant, or
        // node without any context needed

        // TODO: This ignores lambdas/vars inside other non-lambdas
        // to do this right, we need to do a map over the node
        ret node
    ]


    ret res
]

_.extend contextualize {
    lambda: [ node parentContext |
        ret SyntaxNode {
            type: 'lambda'
            arguments: node.arguments
            statements: node.statements
            loc: node.loc
            innerContext: parentContext.pushScope()
        }
    ]

    variable: [ node parentContext |
        ret SyntaxNode {
            type: 'variable'
            name: node.name
            vartype: node.vartype
            loc: node.loc
            outerContext: parentContext
        }
    ]

    assignment: [ assign context |
        assert (is_instance context Context) (
            (Object.getPrototypeOf context) +
            " is not a Context"
        )

        modifier = assign.modifier
        left = assign.left
        right = assign.right
        type = left.type

        assert ({null, 'mutable', 'mutate'} -> _.contains modifier) (
            "ALC: Unrecognized modifier `" + modifier + "`"
        )

        // Checking for undefined, etc.
        if (type == 'variable') [
            if (modifier == null or modifier == 'const' or modifier == 'mutable') [
                if (not (context.may_declare left.name)) [
                    throw new SyntaxError (
                        "ALC: Shadowing `" + left.name + "` " +
                        (at_loc left.loc) +
                        " is not permitted. Use `mutate` to mutate."
                    )
                ] else [
                    context.declare modifier left.name left.vartype right
                ]
            ] (modifier == 'mutate') [
                if (not (context.may_mutate left.name)) [
                    declmodifiertype = context.get_modifier left.name
                    throw new SyntaxError (
                        "ALC: Mutating `" + left.name + "`, which has " +
                        "modifier `" + declmodifiertype + "` " +
                        (at_loc assign.loc) +
                        " is not permitted. Declare with `mutable` " +
                        "to allow mutation."
                    )
                ]
            ] else [
                assert false ("Invalid modifier " + modifier)
            ]
        ] (type == 'table-access') [
            if (modifier != 'mutate') [
                throw new SyntaxError (
                    "Mutating a table requires the keyword `mutate` " +
                    (at_loc assign.loc) + "."
                )
            ]
        ] else [
            throw new Error ("ALINTERNAL: Unrecognized lvalue type: " + type)
        ]

        ret SyntaxNode {
            type: 'assignment'
            modifier: assign.modifier
            left: left
            right: right
            loc: loc
            outerContext: context
        }
    ]
}

contextualize_program = [ stmts external_vars |
    context = new Context { scope = null, getExprType = [expr context_ | (get_type expr context_)] }
    context.declare 'const' 'true' {'boolean'}
    context.declare 'const' 'false' {'boolean'}
    context.declare 'const' 'undefined' {'undefined'}
    context.declare 'const' 'null' {'null'}
    context.declare 'const' 'not' {(FunctionType {{'boolean'}} {'boolean'})}

    context.declare 'const' 'this' '?'

    context.declare 'const' 'if' '?'
    context.declare 'const' 'else' '?'
    context.declare 'const' 'while' '?'
    context.declare 'const' 'throw' '?'
    context.declare 'const' 'new' '?'
    context.declare 'const' 'delete' '?'
    context.declare 'const' 'typeof' '?'

    context.declare 'const' 'global' '?'
    context.declare 'const' 'require' '?'
    context.declare 'const' 'module' '?'
    context.declare 'const' '__filename' '?'

    context.declare 'const' 'Error' '?'
    context.declare 'const' 'String' '?'
    context.declare 'const' 'Function' '?'
    context.declare 'const' 'Object' '?'
    context.declare 'const' 'Number' '?'
    context.declare 'const' 'RegExp' '?'
    
    _.each external_vars [ ext | context.declare 'const' ext '?' ]

    ret {
        statements: stmts -> _.map contextualize context
        context: context
    }
]

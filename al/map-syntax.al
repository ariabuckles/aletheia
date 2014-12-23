// map
//
// does a pure map over a SyntaxTree

assert = require "assert"

_ = require "underscore"

SyntaxTree = require "./syntax-tree.js"

SyntaxNode = SyntaxTree.SyntaxNode

is_instance = [a A | ret ```a instanceof A```]

mapObject = [ obj func |
    mutable result = {=}
    _.each obj [ value key |
        mutate result@key = func value
    ]
    ret result
]

syntaxWithSameFields = [ node func |
    ret SyntaxNode (mapObject node func)
]

mapSyntax = [ node func |
    ret if (_.isArray node) [
        ret _.map node mapSyntax
    ] (is_instance node ParseNode) [
        ret mapSyntax@(node.type) node
    ] (mapSyntax@(typeof node)) [
        ret mapSyntax@(typeof node) node
    ] else [
        ret node
    ]
]

_.extend mapSyntax {
    assignment: [ node func |
        ret SyntaxNode {
            type: 'assignment'
            modifier: node.modifier
            left: node.left -> func()
            right: node.right -> func()
            loc: node.loc
        }
    ]

    lambda: [ node func |
        ret SyntaxNode {
            type: 'lambda'
            arguments: node.arguments -> _.map func
            statements: node.statements -> _.map func
            loc: node.loc
        }
    ]

    'unit-list': [ node func |
        ret SyntaxNode {
            type: 'unit-list'
            units: node.units -> _.map func
        }
    ]

    'table-access': [ node func |
        ret SyntaxNode {
            type: 'table-access'
            table: node.table -> func()
            key: node.key -> func()
            loc: node.loc
        }
    ]

    operation: [ node func |
        ret SyntaxNode {
            type: 'operation'
            left: node.left -> func()
            operation: node.operation
            right: node.right -> func()
            loc: node.loc
        }
    ]

    variable: [ node func |
        ret SyntaxNode {
            type: 'variable'
            name: node.name
            vartype: node.vartype
            loc: node.loc
        }
    ]

    javascript: [ node func |
        ret SyntaxNode {
            type: 'javascript'
            source: node.source
            loc: node.loc
        }
    ]

    regex: [ node func |
        ret SyntaxNode {
            type: 'regex'
            string: node.string
            loc: node.loc
        }
    ]

    object: [ node func |
        ret node -> mapObject func
    ]

    array: [ node func |
        ret node -> _.map func
    ]
}

mutate module.exports = desugar


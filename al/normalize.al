_ = require "underscore"

ParseTree = require "./parse-tree.js"
SyntaxTree = require "./syntax-tree.js"

ParseNode = ParseTree.ParseNode
SyntaxNode = SyntaxTree.SyntaxNode

// Converts a parse tree to a syntax tree
normalize = undefined  // forward-declaration

is_instance = [a A | ret ```a instanceof A```]

isConstant = [ parsed |
    ret ((not (_.isArray parsed)) and (not (is_instance parsed ParseNode)))
]

mapObject = [ obj func |
    mutable result = {:}
    _.each obj [ value key |
        mutate result@key = func value
    ]
    ret result
]

syntaxWithSameFields = [ parse |
    ret SyntaxNode (mapObject parse normalize)
]

// Converts an individual ParseNode to a SyntaxNode
normalizationTable = {
    assignment: syntaxWithSameFields  // just take the same fields
    lambda: syntaxWithSameFields
    "unit-list": syntaxWithSameFields
    "table-access": syntaxWithSameFields
    field: syntaxWithSameFields
    operation: syntaxWithSameFields
    variable: syntaxWithSameFields
    javascript: syntaxWithSameFields

    table: [ table |
        fields = table.fields
        forceObject = table.forceObject

        // Array literals
        //  == false is a hack for not being broken :(
        isStrictArray = ((forceObject == false) and (_.all fields [ field |
            ret (field.key == null or field.key == undefined)
        ]))
        ret if (isStrictArray) [
            ret _.pluck fields "value"
        ] else [

            // ObjectLiterals
            isStrictObject = _.all fields [ field |
                ret (field.key != null and field.key != undefined and (isConstant field.key))
            ]
            ret if isStrictObject [
                mutable result = {:}
                _.each fields [ field |
                    mutate result@(field.key) = normalize field.value
                ]
                ret result
            ] else [

                // else: dynamically keyed objects, or mixed array/object keys
                ret SyntaxNode {
                    type: "table"
                    fields: normalize(fields)
                }
            ]
        ]
    ]
}


// Converts a parse tree to a syntax tree
mutate normalize = [ parsed |
    ret if (_.isArray parsed) [
        // A generic list, process it as such
        ret _.map parsed normalize

    ] else [
        ret if (is_instance parsed ParseNode) [
            // A single node; dispatch to our normalization table of
            // functions
            type = parsed.type
            ret normalizationTable@type parsed

        ] else [
            // A compile-time constant.
            // Mostly, these are literals, like numbers or strings,
            // but it could also be a compile-time table
            ret parsed
        ]
    ]
]

mutate module.exports = normalize



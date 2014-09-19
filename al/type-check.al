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

console = global.console
SyntaxError = global.SyntaxError
Math = global.Math
assert = require "assert"

_ = require "underscore"
SyntaxNode = (require "./syntax-tree").SyntaxNode
Context = require "./context"

is_instance = [a A | ret ```a instanceof A```]

JSON = global.JSON
mutable get_type :: ? = null

mapObject = [ obj func |
    mutable result = {:}
    _.each obj [ value key |
        mutate result@key = func value
    ]
    ret result
]

at_loc = [ loc |
    ret if (loc == undefined) [
        ret 'at location unknown'
    ] else [
        line = loc.first_line
        // jison seems to be reporting one column to the left for us,
        // so we hackily correct it:
        column = loc.first_column + 1
        ret ('at line ' + line + ', col ' + column)
    ]
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

FunctionType = [ argTypes resultType |
    self = this
    ret if (not is_instance self FunctionType) [
        ret new FunctionType argTypes resultType
    ] else [
        assert (_.isArray argTypes)
        assert resultType
        mutate self.argTypes = argTypes
        mutate self.resultType = resultType
        ret self
    ]
]

randLetter = [|
    letters = "abcdefghijklmnopqrstuvwxyz"
    index = Math.floor (Math.random() * letters.length)
    ret letters@index
]

randGenericName = [ _.uniqueId randLetter() ]

Generic = [|
    self = this
    ret if (not is_instance self Generic) [
        ret new Generic()
    ] else [
        mutate self.name = randGenericName()
        ret self
    ]
]

ArrayType = {{
    length: 'number'
    concat: '?'
    every: '?'
    filter: '?'
    forEach: '?'
    indexOf: '?'
    join: '?'
    lastIndexOf: '?'
    map: '?'
    pop: '?'
    push: '?'
    reduce: '?'
    reduceRight: '?'
    reverse: '?'
    shift: '?'
    slice: '?'
    some: '?'
    sort: '?'
    splice: '?'
    toLocaleString: '?'
    toString: '?'
    unshift: '?'
}}


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
// Returns true if exprtype < vartype (exprtype is convertible to vartype)
matchtypes = [ exprtype vartype |
    ret if (vartype == undefined) [
        assert false (
            "adding an unspecified key to a var doesn't need to " +
            "check the assignment... (this is safe to remove, but " +
            "if you hit it, your understanding of this code needs " +
            "improvement."
        )
        // Adding an unspecified key to a variable through object assignment
        ret true

    ] (exprtype == undefined) [
        // Variable requires a key that is not present on the expression
        ret false

    ] (vartype == '?' or exprtype == '?') [
        ret true

    ] (_.isArray exprtype) [
        ret _.all exprtype [ subexprtype | matchtypes subexprtype vartype ]

    ] (_.isArray vartype) [
        ret _.any vartype [ subvartype | matchtypes exprtype subvartype ]
    
    ] (is_instance vartype FunctionType) [
        ret if (is_instance exprtype FunctionType) [
            argsMatch = _.all vartype.argTypes [ varArgType i |
                exprArgType = exprtype.argTypes@i
                ret ((exprArgType == undefined) or (
                    (varArgType != undefined)
                    and
                    (matchtypes exprArgType varArgType)
                ))
            ]
            resultMatches = matchtypes exprtype.resultType vartype.resultType
            ret (argsMatch and resultMatches)
        ] else [
            ret false
        ]
    ] (_.isObject vartype) [
        varIsArray = _.isEqual vartype ArrayType@0  // TODO: remove the @0 ugliness
        exprIsArray = _.isEqual exprtype ArrayType@0
        ret if (varIsArray or exprIsArray) [
            // Treat arrays specially for now; they are incompatible with
            // objects unless forced, since you probably don't want to assign
            // an array to a normal map-type object.
            //
            // TODO: Re-evaluate whether this is the right decision
            ret (varIsArray and exprIsArray)
        ] else [
            ret ((_.isObject exprtype) and (_.all (_.keys vartype) [ key |
                ret matchtypes exprtype@key vartype@key
            ]))
        ]

    ] else [
        ret _.isEqual exprtype vartype
    ]
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

check_statements = [ stmts context |
    lambdas_with_contexts = stmts -> _.map [ stmt |
        // check top level statements
        get_type stmt context
        ret (get_lambdas stmt context)
    ] -> _.filter _.identity

    // Here we make a stack of lambdas
    // called a queue /sigh
    mutable queue = {}
    enqueue_lambdas queue lambdas_with_contexts

    while [ queue.length != 0 ] [
        lambda_with_context = queue.pop()
        lambda = lambda_with_context.lambda
        lambda_context = lambda_with_context.context
        get_type lambda lambda_context
        new_lambdas = (get_lambdas lambda lambda_context)
        enqueue_lambdas queue new_lambdas
    ]
]


get_lambdas = [ node context |

    res = if (is_instance node SyntaxNode) [
        ret get_lambdas@(node.type) node context
    ] else [
        // compile time constant
        ret get_lambdas@(typeof node) node context
    ]

    assert (res != undefined) ("could not find lambdas of " + node.type)

    ret res
]

concat = [ lambdas1 lambdas2 |
    assert (lambdas1 != undefined)
    ret if (lambdas1 == null) [
        ret lambdas2
    ] (_.isArray lambdas1) [
        ret lambdas1.concat (lambdas2 or {})
    ] else [
        ret {lambdas1}.concat (lambdas2 or {})
    ]
]

_.extend get_lambdas {
    number = [ {} ]
    string = [ {} ]
    undefined = [ {} ]
    boolean = [ {} ]
    "operation" = [ op context |
        left = op.left
        right = op.right
        leftLambdas = get_lambdas op.left context
        rightLambdas = get_lambdas op.right context
        lambdas = concat leftLambdas rightLambdas
        ret lambdas
    ]

    "javascript" = [ {} ]
    "regex" = [ {} ]

    "table-access" = [ table_access context |
        table_lambdas = get_lambdas table_access.table context
        assert (table_lambdas != undefined) "get_type.table did not return lambdas"
        key = table_access.key

        res = if ((typeof key) != 'string') [
            // TODO: Verify that the returning the lambdas here is done
            // correctly; this has not been tested
            key_lambdas = get_lambdas key context
            ret (concat table_lambdas key_lambdas)

        ] else [
            ret table_lambdas
        ]

        ret res
    ]

    "unit-list" = [ unitList context |
        units = unitList.units
        ret if (units@0.type == 'variable' and units@0.name == 'ret') [
            ret get_lambdas units@1 context
        ] else [
            // TODO: We shouldn't traverse these nodes
            // twice, once for checking and once for actually
            // getting the types
            lambdas = units -> _.map [ unit |
                ret if (unit.type == 'lambda') [
                    ret new LambdaWithContext unit context
                ] else [
                    ret (get_lambdas unit context)
                ]
            ] -> _.filter _.identity

            ret lambdas
        ]
    ]

    variable = [ variable context |
        ret {}
    ]

    object = [ obj context |
        // TODO: use _.keys since _.map breaks on objs with .length
        lambdas_with_contexts = obj -> _.map [ value key |
            ret if (value.type == 'lambda') [
                ret new LambdaWithContext value context
            ] else [
                ret (get_lambdas value context)
            ]
        ] -> _.filter _.identity

        assert lambdas_with_contexts "get_type.object not returning lambdas_with_contexts"
        ret lambdas_with_contexts
    ]

    lambda = [ lambda context |
        innercontext = if lambda.context [
            ret lambda.context
        ] else [
            mutate lambda.context = context.pushScope()
            ret lambda.context
        ]

        inner_lambdas_with_contexts = lambda.statements -> _.map [ stmt |
            // TODO: This line is causing us to evaluate the function
            // prematurely; forcing all declarations to be above
            ret (get_lambdas stmt innercontext)
        ] -> _.filter _.identity

        ret inner_lambdas_with_contexts
    ]

    assignment = [ assign context |
        assert (is_instance context Context) (
            (Object.getPrototypeOf context) +
            " is not a Context"
        )

        right = assign.right

        right_side_lambdas = if (right.type == 'lambda') [
            ret new LambdaWithContext right context
        ] else [
            ret (get_lambdas right context)
        ]
        
        ret right_side_lambdas
    ]
}




mutate get_type = [ node context |
    assert (is_instance context Context) (
        "Not a Context: " + context
    )

    res = if (is_instance node SyntaxNode) [
        if DEBUG_TYPES [
            console.log " > call get_type" node.type
        ]
        ret if (node.inferred_type) [ node.inferred_type ] else [
            mutate node.inferred_type = get_type@(node.type) node context
            ret node.inferred_type
        ]
    ] else [
        // compile time constant
        ret get_type@(typeof node) node context
    ]

    if DEBUG_TYPES [
        console.log " < return get_type" node.type res //node
    ]
    assert (res != undefined) ("could not find type of node: " + node.type)
    assert ((res == '?') or ((typeof res) == 'object')) (
        "get_type result for " +
        (node.type or (typeof node)) +
        " should be '?' or an array"
    )

    ret res
]

is_lambda = [ node |
    ret if (is_instance node SyntaxNode) [
        ret (node.type == 'lambda')
    ] else [ false ]
]

_.extend get_type {
    number = [ {'number'} ]
    string = [ {'string'} ]
    undefined = [ {'undefined'} ]
    boolean = [ {'boolean'} ]
    "operation" = [ op context |
        left = op.left
        right = op.right
        leftType = get_type op.left context
        rightType = get_type op.right context
        type = union leftType rightType
        ret type
    ]

    "javascript" = [ {'?'} ]
    "regex" = [ {'?'} ]

    "table-access" = [ table_access context |
        table_type = get_type table_access.table context
        assert (table_type == '?' or (table_type.length > 0 and table_type@0 != undefined)) (
            "bad type for table" + (JSON.stringify table_access.table)
        )
        key = table_access.key

        res = if ((typeof key) != 'string') [
            // todo: do something with the type here
            type = get_type key context
            ret '?'

        ] else [
            ret if (table_type == '?') [
                ret '?'
            ] (table_type.length > 1) [
                ret '?'  // give up on multi-typed tables
            ] (table_type.length == 0) [
                ret {}
            ] else [
                single_table_type = table_type@0
                property_type = single_table_type@key
                assert (property_type != undefined) ("table type not found for key: " +
                    key + ", in: " +
                    (JSON.stringify table_access.table) + ";; of type: " +
                    (JSON.stringify table_type)
                )
                ret property_type
            ]
        ]

        ret res
    ]

    "unit-list" = [ unitList context |
        units = unitList.units
        ret if (units@0.type == 'variable' and units@0.name == 'ret') [
            ret get_type units@1 context
        ] else [
            func = units@0
            func_type = get_type func context

            res = if (func_type == '?') [
                ret '?'
            ] (_.isArray func_type) [
                ret if (func_type.length == 0) [
                    console.warn (
                        "ALC: INTERNAL: Calling an empty-set type: `" +
                        (JSON.stringify func) +
                        "`."
                    )
                    ret '?'
                ] (func_type.length > 1) [
                    ret '?'
                ] else [
                    assert (func_type@0 != undefined)
                    assert (is_instance func_type@0 FunctionType) (
                        "function is not a FunctionType: " +
                        (JSON.stringify func_type@0)
                    )
                    func_result_type = (func_type@0).resultType
                    assert (func_result_type != undefined) (
                        "no result defined for FunctionType: " +
                        (JSON.stringify func_type@0)
                    )
                    ret func_result_type
                ]
            ] else [
                console.warn (
                    "ALC: INTERNAL: Calling a non-function: `" +
                    (JSON.stringify func_type) +
                    "`."
                )
                ret '?'
            ]
            assert (res != undefined)
            
            ret res
        ]
    ]

    variable = [ variable context |
        ret if ((not KEYWORD_VARIABLES@(variable.name)) and
                (not (context.has variable.name))) [
            throw new SyntaxError (
                "ALC: Use of undeclared variable `" +
                variable.name + "` " + (at_loc variable.loc) + "."
            )
        ] else [
            if DEBUG_TYPES [
                console.log "context.get_type" variable.name (context.has variable.name)
            ]
            ret context.get_type variable.name
        ]
    ]

    object = [ obj context |
        typeObj = if (obj == null) [
            ret {'null'}
        ] (_.isArray obj) [
            ret ArrayType
        ] else [
            ret { mapObject obj [ val | get_type val context ] }
        ]
        
        ret typeObj
    ]

    lambda = [ lambda context |
        innercontext = if lambda.context [
            ret lambda.context
        ] else [
            mutate lambda.context = context.pushScope()
            ret lambda.context
        ]

        argTypes = _.map lambda.arguments [ arg |
            assert (arg.type == 'variable')
            ret if (arg.type != 'variable') [
                throw new SyntaxError (
                    "ALC: Param must be a valid variable name, " +
                    "but got `" + arg.type + "` " + (at_loc arg.loc)
                )
            ] else [
                ret if (not (innercontext.may_be_param arg.name)) [
                    throw new SyntaxError (
                        "ALC: Param shadowing `" + arg.name + "`" +
                        (at_loc arg.loc) +
                        " not permitted. Use `mutate` to mutate."
                    )
                ] else [
                    if DEBUG_TYPES [
                        console.log "declaring arg" arg.name "as '?'"
                    ]
                    // if no type is provided for an argument, we currently
                    // don't try to infer it, but imply it could be anything
                    // TODO: type inference for argument types
                    argtype = if (arg.vartype != null) [arg.vartype] else ['?']
                    innercontext.declare 'const' arg.name argtype
                    ret arg.vartype
                ]
            ]
        ]

        // Check function validity
        _.each lambda.statements [ stmt |
            get_type stmt innercontext
        ]
        
        // TODO: Re-enable this and actually get the result type
        lastStatement = _.last lambda.statements
        resultType = if ((lastStatement.type == 'unit-list') and
                (lastStatement.units@0.type == 'variable') and
                (lastStatement.units@0.name == 'ret')) [
            ret (get_type lastStatement.units@1 innercontext)
        ] else [
            ret {'undefined'}
        ]

        res = {(FunctionType argTypes resultType)}
        if DEBUG_TYPES [
            console.log "function of type" (global.JSON.stringify res)
        ]
        ret res
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
                    context.declare modifier left.name left.vartype assign.right
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

        // Checking types
        if (type == 'variable') [
            // TODO: check matching of function assignments later
            // This is super hacky and won't work with lambdas inside things
            // We really need a full on dfs to evaluate types with hoisting
            if (not (is_lambda assign.right)) [
                vartype = (context.get_type left.name)
                console.log "RIGHT SIDE NOT A LAMBDA"
                righttype = (get_type assign.right context)
                if DEBUG_TYPES [
                    console.log "check var" vartype left.name assign.right
                ]
                if (not (matchtypes righttype vartype)) [
                    throw new SyntaxError (
                        "Type mismatch: `" +
                        left.name +
                        "` of type `" +
                        (JSON.stringify vartype) +
                        "` is incompatible with expression of type `" +
                        (JSON.stringify righttype) + "` " +
                        (at_loc assign.loc) + "."
                    )
                ]
            ]
        ] (type == 'table-access') [
            key = left.key
            if ((typeof key) == 'string') [
                table_type = (get_type left.table context)
                ret if (table_type == '?') [
                    console.log "table access - giving up: type ?"
                    nop() // give up
                ] (table_type.length > 1) [
                    console.log "table access - giving up: length > 1" table_type
                    nop() // also give up
                ] (table_type.length == 0) [
                    throw new SyntaxError (
                        "ALC: Mutating table key `" + key + "` which has " +
                        "type empty-set, is impossible, " +
                        (at_loc assign.loc) + "."
                    )
                ] else [
                    single_table_type = table_type@0
                    property_type = single_table_type@key
                    righttype = (get_type assign.right context)

                    if (not (matchtypes property_type righttype)) [
                        throw new SyntaxError (
                            "Type mismatch: table key `" +
                            key +
                            "` of type `" +
                            (JSON.stringify property_type) +
                            "` is incompatible with expression of type `" +
                            (JSON.stringify righttype) + "` " +
                            (at_loc assign.loc)
                        )
                    ]
                ]
            ]
        ]

        ret {}
    ]
}


check_program = [ stmts external_vars |
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

    check_statements stmts context
]

mutate module.exports = check_program

assert = require "assert"
_ = require "underscore"

compile = require "./compile-for-testing"

describe = global.describe
it = global.it
SyntaxError = global.SyntaxError

describe "type checking" [|
    describe "undeclared variables" [|
        it "use of an undeclared variable should throw a type error" [|
            assert.throws [
                compile {
                    "a = b"
                }
            ] SyntaxError
        ]

        it "use of a declared variable should not throw a type error" [|
            assert.doesNotThrow [
                compile {
                    "b = 6"
                    "a = b"
                }
            ]
        ]
    ]

    describe "shadowing" [|
        it "should not allow shadowing at the same scope" [|
            assert.throws [
                compile {
                    "a = 1"
                    "a = 2"
                }
            ] SyntaxError
        ]

        it "should not allow shadowing at an inner scope" [|
            assert.throws [
                compile {
                    "a = 1"
                    "if false ["
                    "    a = 2"
                    "]"
                }
            ] SyntaxError
        ]
    ]

    describe "variable mutation" [|
        it "should throw for mutating a const var" [|
            assert.throws [
                compile {
                    "a = 5"
                    "mutate a = 6"
                }
            ] SyntaxError
        ]

        it "should not throw for mutating a mutable" [|
            assert.doesNotThrow [
                compile {
                    "mutable a = 5"
                    "mutate a = 6"
                }
            ]
        ]
    ]

    describe "variable types" [|
        it "should allow mutating a variable with the same type" [|
            assert.doesNotThrow [
                compile {
                    "mutable a = 5"
                    "mutate a = 6"
                }
            ]
        ]

        it "should not allow assigning an incompatible type to a new var" [|
            assert.throws [
                compile {
                    "a :: {'boolean'} = 5"
                }
            ] SyntaxError
        ]

        it "should not allow mutating a variable with an incompatible type" [|
            assert.throws [
                compile {
                    "mutable a = 5"
                    "mutate a = true"
                }
            ] SyntaxError
        ]

        it "should allow mutating a ? type variable to any type" [|
            assert.doesNotThrow [
                compile {
                    "mutable a :: ? = 5"
                    "mutate a = true"
                }
            ]
        ]

        it "type should be transitive through multiple assignments" [|
            assert.doesNotThrow [
                compile {
                    "a = 6"
                    "mutable b = a"
                    "mutate b = 7"
                }
            ]

            assert.throws [
                compile {
                    "a = 6"
                    "mutable b = a"
                    "mutate b = 'hi'"
                }
            ] SyntaxError
        ]

        it "an object with more keys should be assignable to a fewer-keyed variable" [|
            assert.doesNotThrow [
                compile {
                    "mutable t = {a: 1}"
                    "mutate t = {a: 2, b: 3}"
                }
            ]
        ]

        it "an object with fewer keys should not be assignable to a more-keyed variable" [|
            assert.throws [
                compile {
                    "mutable t = {a: 1, b: 2}"
                    "mutate t = {a: 3}"
                }
            ] SyntaxError
        ]

        it "an array and an object should be incompatible types" [|
            assert.throws [
                compile {
                    "mutable a = {:}"
                    "mutate a = {}"
                }
            ] SyntaxError

            assert.throws [
                compile {
                    "mutable a = {}"
                    "mutate a = {:}"
                }
            ] SyntaxError
        ]
    ]

    describe "table access types" [|
        it "should allow mutating a table field to a compatible value" [|
            assert.doesNotThrow [
                compile {
                    "mutable t = {a: 5, b: 6}"
                    "mutate t.a = t.b"
                }
            ]
        ]

        it "should not allow mutating a table field to an incompatible value" [|
            assert.throws [
                compile {
                    "mutable t = {a: 5, b: 6}"
                    "mutate t.a = true"
                }
            ] SyntaxError
        ]

        it "field type should infer variable type" [|
            assert.throws [
                compile {
                    "t = {a: 5, b: 6}"
                    "mutable c = t.a"
                    "mutate c = {}"
                }
            ] SyntaxError
        ]
    ]
]

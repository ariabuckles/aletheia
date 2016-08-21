assert = require "assert"
_ = require "underscore"

compile = require "./compile-for-testing"

describe = global.describe
it = global.it
SyntaxError = global.SyntaxError

compiles = [ prgm |
    assert.doesNotThrow [
        compile prgm
    ]
]

doesNotCompile = [ prgm |
    assert.throws [
        compile prgm
    ] SyntaxError
]

describe "type checking" [|
    describe "basic assignment" [|
        it "should work for nested tables" [|
            assert.doesNotThrow [
                compile {
                    "f = global.console.log"
                }
            ]
        ]
    ]

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

        it "use of an undeclared variable inside a function should throw" [|
            doesNotCompile {
                "f = ["
                "    a = b"
                "]"
            }
        ]
    ]

    describe "variable ~hoisting" [|
        it "compiles without hoisting" [|
            compiles {
                "mutable a = 0"
                "f = ["
                "    mutate a = a + 1"
                "]"
                "f()"
            }
        ]

        it "compiles with hoisting" [|
            compiles {
                "f = ["
                "    mutate a = a + 1"
                "]"
                "mutable a = 0"
                "f()"
            }
        ]

        it "doesn't have shadow errors on hoisting" [|
            compiles {
                "f = [ a | g a ]"
                "g = [ a | a + 1 ]"
            }
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

        it "should not allow shadowing a mutable at the same scope" [|
            assert.throws [
                compile {
                    "mutable a = 1"
                    "a = 2"
                }
            ] SyntaxError
        ]

        it "should not allow shadowing a mutable in an inner scope" [|
            assert.throws [
                compile {
                    "mutable a = 1"
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

    describe "table mutation" [|
        it "should require a `mutate` modifier" [|
            doesNotCompile {
                "t = {a: 5, b: 6}"
                "t.a = 6"
            }

            compiles {
                "t = {a: 5, b: 6}"
                "mutate t.a = 6"
            }
        ]
    ]

    describe "recursive functions" [|
        it "should not crash on a recursive function" [|
            compiles {
                "f = [ a::{'number'} |"
                "   ret if (a < 1) [a] else ["
                "       ret ((f (a - 1)) + (f (a - 2)))"
                "   ]"
                "]"
                "b::{'number'} = f 2"
            }
        ]
    ]
]

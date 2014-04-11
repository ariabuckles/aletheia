
start
    = program

program
    = additive

additive
    = left:multiplicative "+" right:additive { return left + right; }
    / multiplicative

multiplicative
    = left:primary "*" right:multiplicative { return left * right; }
    / primary

primary
    = number
    / "(" additive:additive ")" { return additive; }

number
    = num:[0-9]+ { return num.join(""); }
    / num:([0-9]+)?'.'[0-9]+ { return num.join(""); }


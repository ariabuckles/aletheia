statement = if (expr.type == "unit-list" and
        expr.units@0.type == "variable" and
        expr.units@0.name == "ret") [
    ret 5
] else [
    ret 6
]

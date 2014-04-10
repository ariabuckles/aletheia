x = 5
if x == 1 [
    
] x == 2 [

] else [

]


mutable i = 5
while [
    x = regex.match str
    ret x != null
] [
    console.log i
    mutate i = i - 1
]

for my_list [e |
    console.log e
]

for = [list lambda |
    mutable i = 0;
    while [ret i != list.length] [
        lambda list@i i
        mutate i = i + 1
    ];
];

mapwhile = [cond body |
    mutable result = ()
    while cond [
        result.push body!
    ]
    ret result
];

all_matches = [regex str |
    mutable match = null
    ret mapwhile [
        mutate match = regex.exec str
        ret match != null
    ] [
        ret match
    ]
];

if x == 5 [
    return 6
]


#####
try {
    __if(x == 5, function() {

    })
} catch (e) {
    if (e instanceof __return) {
        if (e.value instanceof __return) {
            throw e.value
        } else {
            return e.value;
        }
    }
}
#####

var __result = __if(x == 5, function() {

});
if (__result instanceof __return) {
    return 
}



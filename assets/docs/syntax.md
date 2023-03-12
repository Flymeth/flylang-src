# Flylang Syntax

This document will presents you how to write flylang code.

## Comments

To make a comment (= text that the interpreter will not care about), place your text between two `|` like so:

```fly
|This is a cool comment|
...
```

## Types

Because flylang is a high-level programming language, it has a lot of type. Here are them:

name | syntax
---|---
number | `25` - `.165` - `65_41`
string | `"hello"` - `'bonjour'` - `"result of 2 + 3: &(2 + 3)"`
array (list of datas) | `{}` - `{"hello", 15, "hello" + 5}`
object (list of key/datas) | `{:}` - `{"answer": 15 * 9}`

## Variables

To declare a variable, just write `<variable_name>: <variable_value>`.
You can also make a variable as a constant by doubleing the `:` character (`<variable_name>:: <variable_value>`).
Finaly, you can easily make operation with your variable as the operand, and the result storer by placing the operation symbol just before the `:` character(s).
NB: To access to a variable value, just type the variable's name.

```fly
my_var: 15
my_var2:: 3

if(my_var2,
    my_var-: my_var2
)
```

## Functions

Functions are a way to execute more than once a bit of code, and are the most basic element after variables of programation.
To declare a function in `flylang` just type `fn <name_of_your_function>(<arg1>, <arg2>, ..., <function's_code>)`.
Then, to call the function just write `<name_of_your_declared_function>(<arg1>, <arg2>, ...)`.
Note that you can stop the function's code execution (and return a value) by using the `return` keyword.

```fly
fn add2Numbers(nb1, nb2,
    return nb1 + nb2
)
myage: add2Numbers(17, 1)
```

### Vanilla Functions

name | arguments | description
---|---|---
clone | `<type>` | Clone the object and returns it
range | `<number>`, (`<number>`, (`<number>`)) | Make a list of number that starts at the first argument and ends at the second with a step of the third argument. (note that if the second argument isn't set, the list will start at 0 and will go automatically to the first argument. By default, the step argument is at 1).
typeof | `<type>` | Returns a string containing the type of the given object
eval | `<expression>` | Returns the processed value of the given expression

## Operations

### Symbols

symbol | description
---|---
\+ | addition
\- | substraction
\* | multiplication
\*\* | power
/ | division
\% | euclidian division's rest
// | euclidian division's value

### Usage

operation | valid operand type
---|---
addition | `<string> + <string>` - `<list> + <list>` *(cancat the two `<list>` objects)* - `<string> + <number>` - `<number> + <number>`
substraction | `<number> - <number>`
multiplication | `<string> * <number>` *(repeat the `<string>` `<number>` times)* - `<list> * <number>` *(repeat `<list>` `<number>` times)* - `<number> * <number>`
power | `<number> ** <number>`
division | `<number> / <number>`
euclidian division's rest | `<number> % <number>`
euclidian division's value | `<number> // <number>`

## Boolean

### Tests

symbol | a is **...** to b
---|---
a **=** b | equal
a **>=** b | greater or equal
a **>** b | greater
a **<=** b | lower or equal
a **<** b | lower

*NB: you can inverse the operation by placing a `!` symbol before the operation's symbol*

### Tests regroupments

symbol | a **...** b is true
---|---
a **&** b | and
a **?** b | or
a **^** b | nand
a **~** b | nor
a **!** b | xor

## Priorities

Some times you could need a priority, like for exemple if you want to multiply by `3` the result of `2 + 6`. In this case you can't just type `3 * 2 + 6` because the flylang parser will takes in priority `3 * 2` and then add to this result `6` (it's just maths calculation priorities).
So, to create priorities you can type inside parentheses the most important operation. In the exemple's case, you'll write `3 * (2 + 6)`.
Priorities works pretty much everywhere: operations, boolean tests, ...

## If statements

```doc
if(<condition>,
    <code to execute if condition is true>
)else if(<condition 2>,
    <code to execute if condition2 is true (and <condition> is false)>
)else (
    <code to execute if none of the 2 conditions above is true>
)
```

> *You can repeat this schema as many times you want*
> *Please note that variable declared inside if_statement will not be accessible outside this if_statement*

## Loops

### For loop

```doc
for(<iterable>, fn(value, index,
    <...>
))
```

### While loop

```doc
while(<condition>,
    <repeat while the given condition is true>
)
```

### Until loop

```doc
until(<condition>,
    <repeat while the given condition is false>
)
```

## Import statement

***!!** This feature is at this point a beta feature. It may not work*
This feature import flylang's code from another file or import a module's features.

```doc
import <module / file path> [only (import1, import2, ...)] [in <variable name>]
\-------------------------/ \----------------------------/ \------------------/
    Import all module           Import only the given       Set the imported
        data                            data                data into a variable
```

### Builtin modules

#### Maths

`import maths ...`
This module countain variables/functions tool related to mathematics

##### Maths - Variables

name|description
---|---
pi|The PI value

##### Maths - Functions

name|description|argument(s)
---|---|---
cos|Calculate the cosine of a number|`number`
sin|Calculate the sine of a number|`number`
tan|Calculate the tangent of a number|`number`
factorial|Calculate the factorial of a number (number!)|`number`
sqrt|Calculate the square root of a positive number|`number` (> 0)

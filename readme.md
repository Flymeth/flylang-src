# Flylang

Flylang is my own programming language coded entirely in javascript (using typescript).

## The language

It's been a really long time that I want to make my own programming language. But before to create it I had to deal as well as I could on my programming skills.
I wanted to make this language as simple as possible, and as minimalist as well (minimalist keywords, syntax, ...).
To know more on the syntax, you can call the `flylang --syntax` command.

### Syntax exemples

#### The fibonacci list

```fly
list: {0, 1}
for(range(10), fn(i,
    list.add(list.-2 + list.-1)
    std.out("Number #&(i): &(list.-1)")
))
```

#### Check if a number is odd

```fly
number: std.in("Number to check: ").asNbr()
if(number % 2 = 0,
    std.out("The number is odd!")
)else(
    std.out("The number is not odd!")
)
```

#### Factorial calculation

```fly
factorialOf: std.in("!").asNbr()
|Function below clears the console content|
std.cls()

out: 1
for(range(factorialOf), fn(v,
    out*: v
))
std.out("!&(factorialOf) = &(out)")
```

## Properties

You my have notice that in the same folder that the `flylang.exe` file there is an `assets` folder. Inside this folder a `flylang.properties` file is present: this is where all the flylang's interpreter behaviors can be modified. Here is the list of the modifiable behaviors:

property | description | default
---|---|---
maxRecurtionDepth | The maximum times that a function can calls them-self | 120
maxLoopIteration | The maximum loop iterations number | 300
autoSkipUseless | If yes (`1`) or no (`0`) flylang will skip what it thinks as useless code | 0 (`no`)

> *Please note that each propery value must be a number*
> *Deleting this file will make flylang not working*

## Author

I'm Flymeth, an independant developper who loves coding hard to create great things. Originaly, I'm a web developper (front-end and back-end) but I like to give me some challenges like this one.
If you want, you can get more informations about me on my [personal website](https://flymeth.net) !

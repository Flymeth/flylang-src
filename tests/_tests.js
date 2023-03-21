const {default: Positioner} = require('../dist/utils/positioner')
const {default: safeSplit} = require('../dist/utils/tools/safeSplit')
const {removeUselessBackSlashInStr, numberOfCharEnding} = require('../dist/interpreter/stringify')
const sentence = `My name is \\\\&(if(true, "Josh")else("John"))`
    console.log(sentence, "<->", removeUselessBackSlashInStr(sentence), numberOfCharEnding(`My name is \\\\`, "\\"));

const s = `
cs Cat(
    fn(
        me.type: "cat"
    ),
    fn displayType(
          std.out(me.type)
    )
)`

console.log(safeSplit(new Positioner(s)));

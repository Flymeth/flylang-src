const { readdirSync } = require("fs");
const { join } = require("path");
const {createInterface} = require('readline/promises')

const objs = readdirSync(join(__dirname, '../dist/parser/objects')).filter(f => !f.startsWith('_') && f.endsWith('.js')).map(e => e.split('.js')[0])
const result = {}

const lineReader = createInterface(process.stdin, process.stdout)
;(async () => {
    for await(const objName of objs) {
        result[objName] = 0
        const skip = Object.keys(result)
        for await(const tester of objs.filter(e => !skip.includes(e))) {
            console.clear()
            const a = parseInt(await lineReader.question(`${objName} -> ${tester}:\n[1] ${objName} > ${tester}\n[0] ${objName} = ${tester}\n[-1] ${objName} < ${tester}\n>>> `))
            if(isNaN(a)) continue
            result[objName]+= a
        }
    }

    console.log(result);
})()
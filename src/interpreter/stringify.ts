import { ParsedObject } from "../parser/parser.js";
import chalk from "chalk";

const validCharAfterBackSlashes = "ntr"
export function numberOfCharEnding(inside: string, character: string) {
    let counter = 0
    while(inside[inside.length - counter - 1] === character) counter++
    return counter
}
export function removeUselessBackSlashInStr(str: string): string {
    let str2 = ""
    let numberSimultanedBackSlashes = 0
    for(const char of str) {
        if(char === "\\") {
            if(numberSimultanedBackSlashes % 2 !== 0) str2+= char
            numberSimultanedBackSlashes++
        }else {
            if(numberSimultanedBackSlashes % 2 !== 0 && validCharAfterBackSlashes.includes(char)) {
                switch(char) {
                    case "n": str2+= "\n";break
                    case "t": str2+= "\t";break
                    case "r": str2+= "\r"
                    default: str2+= char
                }
            }else str2+= char
            numberSimultanedBackSlashes= 0
        }
    }
    return str2
}

export default function stringify(object: ParsedObject, colors= false): string {
    const {data, type} = object
    switch(type) {
        case "array": {
            return (data.values.length ? "" : "array") + `{${data.values.map(d => stringify(d, colors)).join(', ')}}`
        }
        case "attribute_access": {
            const {origin, access} = data
            const srcString = origin.fromScript ? `[${stringify(origin.object, colors)}]` : stringify(origin.object, colors)
            return `${srcString}-> ${access.map(obj => obj.fromScript ? `<${stringify(obj.object, colors)}>` : stringify(obj.object, colors)).join('.')}`
        }
        case "boolean_test": {
            const {test, testers} = data
            const stringTests: {[key: string]: string} = {
                and: "&",
                nand: "!&",
                or: "|",
                nor: "!|",
                xor: "~"
            }
            return `${stringify(testers[0], colors)}${stringTests[test]}${stringify(testers[1], colors)}`
        }
        case "class_constructor": {
            return `${data.name}<${data.extends.join('; ')}( ... )`
        }
        case "class_instanciation": {
            return `+${data.name}(${data.parameters.map(p => stringify(p, colors)).join(', ')})`
        }
        case "comment": {
            const txt = `<comment: ${data}>`
            return colors ? chalk.italic.gray(txt) : txt
        }
        case "comparaison": {
            const {comparaison, operators} = data
            const stringComps: {[key: string]: string[]} = {
                sup: [">=", "<"],
                inf: ["<=", ">"],
                sup_strict: [">", "<="],
                inf_strict: ["<", ">="],
                egual: ["=", "!="]
            }
            return `${stringify(operators[0], colors)} ${stringComps[comparaison.name][+comparaison.invert]} ${stringify(operators[1], colors)}`
        }
        case "function_asignation": {
            return `fn ${data.name}( ... )`
        }
        case "function_call": {
            return `${data.name}(${data.arguments.map(a => stringify(a, colors)).join(', ')})`
        }
        case "if_statement": {
            if(data.type === "else") return `else( ... )`
            return `if(${stringify(data.condition, colors)}, ...)` + (data.else ? "else( ... )" : "")
        }
        case "import": {
            return `imported data from <${data.importType}>: ${data.importType === "file" ? data.imported.origin.file : data.name}`
        }
        case "loop": {
            const txt = `${data.type}( ... )`
            return colors ? chalk.italic.magentaBright(txt) : txt
        }
        case "number": {
            const txt  = data.number.toString()
            return colors ? chalk.blueBright(txt) : txt
        }
        case "object": {
            return (data.values.length ? "" : "object") + `{${data.values.map(({key, value}) => `${key} -> ${stringify(value, colors)}`).join(',\n')}}`
        }
        case "strict_value": {
            const value = data.value === null ? "unset" : `${data.value}`
            return colors ? chalk.yellow(value) : value
        }
        case "variable": {
            return `< ${data.name} >`
        }
        case "variable_asignation": {
            return `${stringify(data.variable, colors)} <${data.constant ? "=" : "-"} ${data.value ? stringify(data.value, colors) : "unset"}`
        }
        case "stopper": {
            return `[X]> ${data.type.toUpperCase()}${data.return ? ` <<- ${stringify(data.return, colors)}` : ""}`
        }
        case "operation": {
            const {operation, operators} = data
            const stringOper: {[key: string]: string} = {
                "eucl_division": "//",
                "power": "**",
                "eucl_rest": "%",
                "division": "/",
                "multiplication": "*",
                "substraction": "-",
                "addition": "+"
            }

            return `${stringify(operators[0], colors)} ${stringOper[operation]} ${stringify(operators[1], colors)}`
        }
        case "string": {
            const baseString = data.map(v => v.type === "text" ? removeUselessBackSlashInStr(v.data) : `&(${stringify(v.data, colors)})`).join('')
            return colors ? chalk.green(baseString) : baseString
        }
    }

    return "<INVALID OBJECT>"
}

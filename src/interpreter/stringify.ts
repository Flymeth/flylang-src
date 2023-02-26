import { ParsedObject } from "../parser/parser.js";

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

export default function stringify(object: ParsedObject): string {
    const {data, type} = object
    switch(type) {
        case "array": {
            return (data.values.length ? "" : "array") + `{${data.values.map(d => stringify(d)).join(', ')}}`
        }
        case "attribute_access": {
            const {origin, access} = data
            const srcString = origin.fromScript ? `[${stringify(origin.object)}]` : stringify(origin.object)
            return `${srcString}-> ${access.map(obj => obj.fromScript ? `<${stringify(obj.object)}>` : stringify(obj.object)).join('.')}`
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
            return `${stringify(testers[0])}${stringTests[test]}${stringify(testers[1])}`
        }
        case "class_constructor": {
            return `${data.name}<${data.extends.join('; ')}( ... )`
        }
        case "class_instanciation": {
            return `+${data.name}(${data.parameters.map(p => stringify(p)).join(', ')})`
        }
        case "comment": {
            return `<comment: ${data}>`
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
            return `${stringify(operators[0])} ${stringComps[comparaison.name][+comparaison.invert]} ${stringify(operators[1])}`
        }
        case "function_asignation": {
            return `fn ${data.name}( ... )`
        }
        case "function_call": {
            return `${data.name}(${data.arguments.map(a => stringify(a)).join(', ')})`
        }
        case "if_statement": {
            if(data.type === "else") return `else( ... )`
            return `if(${stringify(data.condition)}, ...)` + (data.else ? "else( ... )" : "")
        }
        case "import": {
            return `imported data from <${data.importType}>: ${data.importType === "file" ? data.imported.origin.file : data.name}`
        }
        case "loop": {
            return `${data.type}( ... )`
        }
        case "number": {
            return data.number.toString()
        }
        case "object": {
            return (data.values.length ? "" : "object") + `{${data.values.map(({key, value}) => `${key} -> ${stringify(value)}`).join(',\n')}}`
        }
        case "strict_value": {
            if(data.value === null) return "unset"
            return `${data.value}`
        }
        case "variable": {
            return `< ${data.name} >`
        }
        case "variable_asignation": {
            return `${stringify(data.variable)} <${data.constant ? "=" : "-"} ${data.value ? stringify(data.value) : "unset"}`
        }
        case "stopper": {
            return `[X]> ${data.type.toUpperCase()}${data.return ? ` <<- ${stringify(data.return)}` : ""}`
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

            return `${stringify(operators[0])} ${stringOper[operation]} ${stringify(operators[1])}`
        }
        case "string": {
            const baseString = data.map(v => v.type === "text" ? removeUselessBackSlashInStr(v.data) : `&(${stringify(v.data)})`).join('')
            return baseString
        }
    }

    return "<INVALID OBJECT>"
}

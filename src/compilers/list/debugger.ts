import { ParsedObject, ParsableObjectList } from "../../parser/parser.js";
import { CompilerTypeObject } from "../compiler.js";

const indentation = 2
function stringify(data: ParsedObject, defaultIndent= 0): (string | null)[] {
    const exec = (value: ParsedObject | ParsedObject[], setIndentation = defaultIndent + indentation) => "\n" + debug.exec(value, {indent: setIndentation})
    const mapExec = (iterator: ParsableObjectList[], setIndentation?: number) => iterator.map(obj => exec(obj, setIndentation))

    switch(data.type) {
        case "array": {
            return mapExec(data.data.values)
        }
        case "attribute_access": {
            return [
                `ORIGIN: ${exec(data.data.origin.object)}`,
                `ACCESS:`,
                ...data.data.access.map(({fromScript, object}) => {
                    return `${" ".repeat(indentation)}${fromScript ? "SCRIPT" : "INDEX"}_VALUE: ${exec(object, defaultIndent + 2 * indentation)}`
                })
            ]
        }
        case "boolean_test": {
            return [
                `TYPE: ${data.data.test}`,
                `COMPARATOR 1: ${exec(data.data.testers[0])}`,
                `COMPARATOR 2: ${exec(data.data.testers[1])}`
            ]
        }
        case "comment": {
            return [
                data.data.message
            ]
        }
        case "comparaison": {
            return [
                `TYPE: ${data.data.comparaison.invert ? "NOT " : ""}${data.data.comparaison.name}`,
                `COMPARATOR 1: ${exec(data.data.operators[0])}`,
                `COMPARATOR 2: ${exec(data.data.operators[1])}`
            ]
        }
        case "function_asignation": {
            return [
                `NAME: ${data.data.name || "<ANONYMOUS>"}`,
                `ARGUMENTS: ${data.data.arguments?.join('; ') || "<WITHOUT>"}`,
                `EXECUTION: ${mapExec(data.data.code).join('')}`
            ]
        }
        case "function_call": {
            return [
                `FUNCTION: ${data.data.name}`,
                data.data.arguments.length ? `ARGUMENTS: ${mapExec(data.data.arguments).join('')}` : null
            ]
        }
        case "if_statement": {
            if(data.data.type === "else") return mapExec(data.data.code)
            return [
                `CONDITION: ${exec(data.data.condition)}`,
                `EXECUTION: ${mapExec(data.data.code).join('\n')}`,
                data.data.else ? `ELSE: ${exec({type: "if_statement", data: data.data.else})}` : null
            ]
        }
        case "loop": {
            if(data.data.type === "for") return [
                `TYPE: FOR`,
                `ITERATOR: ${exec(data.data.iterator)}`,
                `EXECUTION: ${exec(data.data.executor)}`
            ]
            else return [
                `TYPE: ${data.data.type.toUpperCase()}`,
                `${data.data.type === "while" ? "CONTINUE WHILE" : "END WHEN"}: ${exec(data.data.condition)}`,
                `EXECUTION: ${mapExec(data.data.code)}`
            ]
        }
        case "number": {
            return [
                `VALUE: ${data.data.number}`
            ]
        }
        case "object": {
            return data.data.values.map(({key, value}, index) => {
                return `#${index} => KEY: ${key}; VALUE: ${exec(value)}`
            })
        }
        case "operation": {
            return [
                `OPERATION: ${data.data.operation}`,
                `OPERATOR 1: ${exec(data.data.operators[0])}`,
                `OPERATOR 2: ${exec(data.data.operators[1])}`
            ]
        }
        case "stopper": {
            return [
                `TYPE: ${data.data.type}`,
                data.data.return ? `ENDING_VALUE: ${exec(data.data.return)}` : null
            ]
        }
        case "strict_value": {
            return [
                `LITTERAL: ${data.data.value}`
            ]
        }
        case "string": {
            return [
                "CONTENT:",
                data.data.reduce((pre, cur) => {
                    const value = cur.type === "text" ? " ".repeat(indentation) + `"${cur.data}"` : exec(cur.data)
                    return pre + value
                }, "")
            ]
        }
        case "variable": {
            return [
                `NAME: ${data.data.name}`
            ]
        }
        case "variable_asignation": {
            return [
                data.data.constant ? "(SET AS CONSTANT)" : null,
                `STORED IN: ${exec(data.data.variable)}`,
                `VALUE: ${data.data.value ? exec(data.data.value) : "<UNSET>"}`
            ]
        }
        case "class_constructor": {
            return [
                `NAME: ${data.data.name}`,
                data.data.extends.length ? `EXTENDS FROM: ${data.data.extends.join('; ')}` : null,
                data.data.content?.constructor ? `CONSTRUCTOR: ${exec(data.data.content.constructor)}` : null,
                data.data.content?.properties.length ? `ATTRIBUTES/PROPERTIES: ${mapExec(data.data.content.properties)}` : null
            ]
        }
        case "class_instanciation": {
            return [
                `CLASS: ${data.data.name}`,
                `PARAMETERS: ${mapExec(data.data.parameters)}`
            ]
        }
        case "import": {
            return [
                `IMPORTED FROM <${data.data.importType.toLowerCase()}>: ${data.data.importType === "module" ? data.data.name : data.data.imported.origin.file}`,
                data.data.informations.restrictions ? `IMPORT ONLY: ${data.data.informations.restrictions}` : null,
                data.data.informations.affectedTo ? `SET IMPORTED ELEMENTS INTO VARIABLE: ${data.data.informations.affectedTo.data.name}` : null,
                data.data.importType === "file" ? `IMPORTED: ${mapExec(data.data.imported.content, defaultIndent + indentation)}`: null
            ]
        }
        case "try_statement": {
            return [
                `TRYING: ${mapExec(data.data.try)}`,
                ...(data.data.handler?.data.code.length ? [
                    `IF FAILURE [HANDLE ERROR IN "${data.data.handler.data.arguments?.[0] || "<without>"}"]: ${mapExec(data.data.handler.data.code)}`
                ] : [])
            ]
        }
    }
    return ["/!\\ BLOCK ISN'T DEBUGGABLE /!\\"]
}
const debug: CompilerTypeObject = {
    name: "debugger",
    version: 0.1,
    exec(data, cache) {        
        const indent: number = cache?.indent || 0
        const indentationStr = " ".repeat(indent)
        if(data instanceof Array) return data.map(v => debug.exec(v, {indent})).join('\n' + indentationStr)

        const {type} = data
        return `${indentationStr}#${type.toUpperCase()}\n${stringify(data, indent + indentation).filter((e): e is string => typeof e === "string").map(v => indentationStr + " ".repeat(indentation) + v).join('\n')}\n${indentationStr}#${type.toLowerCase()}`
    },
}

export default debug
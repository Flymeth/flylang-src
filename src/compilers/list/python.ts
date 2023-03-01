import { ParsableObjectList } from "../../parser/parser.js";
import { CompilerTypeObject } from "../compiler.js";

function genAleaName() {
    return `_${Math.floor(Date.now() * Math.random() + .001)}`
}
const python: CompilerTypeObject = {
    name: "python",
    version: 0.1,
    exec(data, cache = {}) {
        const indent: number = cache.indent || 0
        const indentation = " ".repeat(indent)
        if(data instanceof Array) return data.map(v => python.exec(v, cache)).join('\n' + indentation)
        if(!cache.objects) cache.objects = []

        switch(data.type) {
            case "array": {
                return `[${data.data.values.map(v => python.exec(v, cache)).join(',')}]`
            }
            case "boolean_test": {
                const {test, testers} = data.data
                const compiledTesters = testers.map(v => python.exec(v, cache))
                switch(test) {
                    case "and":
                        return `${compiledTesters[0]} and ${compiledTesters[1]}`
                    case "nand":
                        return `not(${compiledTesters[0]} and ${compiledTesters[1]})`
                    case "or":
                        return `(${compiledTesters[0]} or ${compiledTesters[1]})`
                    case "nor":
                        return `not(${compiledTesters[0]} or ${compiledTesters[1]})`
                    case "xor":
                        return `bool(${compiledTesters[0]}) != bool(${compiledTesters[1]})`
                }
            }
            case "comment": {
                return `"""${data.data.message}"""`
            }
            case "comparaison": {
                const {comparaison, operators} = data.data
                const compiledOperators = operators.map(v => python.exec(v, cache))
                if(comparaison.invert && comparaison.name !== "egual") comparaison.name = (
                    comparaison.name === "inf" ? "sup_strict" :
                    comparaison.name === "sup" ? "inf_strict" :
                    comparaison.name === "inf_strict" ? "sup" :
                    "inf"
                )

                switch(comparaison.name) {
                    case "egual": {
                        return `${compiledOperators[0]}${comparaison.invert ? "!" : "="}=${compiledOperators[1]}`
                    }
                    default: {
                        const table: {[key in typeof comparaison["name"]]: string} = {
                            inf: "<=",
                            inf_strict: "<",
                            sup: ">=",
                            sup_strict: ">",
                            egual: "="
                        }
                        return `${compiledOperators[0]}${table[comparaison.name]}${compiledOperators[1]}`
                    }
                }
            }
            case "function_asignation": {
                const {name, code} = data.data                  
                const lineCode = code.map(e => python.exec(e, {...cache, indent: name ? indent + 2 : 0}))

                const args = data.data.arguments?.join(',') || ""
                if(name || code.length > 1 || code[0].type === "stopper") {
                    return `def ${name || genAleaName()}(${cache.insideClass ? `self${args ? "," :""}` : ""}${args}):${lineCode.length ? lineCode.map(v => '\n  ' + indentation + v).join('') : "pass"}`
                }else {
                    return `lambda ${args}:(${lineCode.join(',')})`
                }
            }
            case "function_call": {
                const args = data.data.arguments?.map(v => python.exec(v, cache)).join(',') || ''
                return `${cache.insideClass && cache.contentAttrs?.includes(data.data.name) ? "self." : ""}${data.data.name}(${args})`
            }
            case "if_statement": {
                const obj = data.data
                function parse(infos: typeof obj): string {
                    const code = infos.code.map(v => python.exec(v, {...cache, indent: indent + 2})).map(v => '\n  ' + indentation + v)

                    if(infos.type === "if") {
                        let str_if = `if ${python.exec(infos.condition)}:${code}`
                        if(infos.else) {
                            return `${str_if}\n${indentation}el${parse(infos.else)}` // "el" because this function is recurcive; So if next keyword is "if", it will generate an "elif", and a "else" else.
                        }else return str_if
                    }else {
                        return `se:${code}` // "se" because this function is recurcive (see above)
                    }
                }
                return parse(obj)
            }
            case "loop": {
                const {type} = data.data
                if(type === "while" || type === "until") {
                    const {condition, code} = data.data
                    const parsedCond = python.exec(condition, cache)
                    const parsedCode = code.map(v => python.exec(v, {...cache, indent: indent + 2})).map(v => '\n  ' + indentation + v)
                    return `while ${(type === "while" ? parsedCond : `not (${parsedCond})`)}: ${parsedCode.join('')}`
                }else if(type === "for") {
                    const {iterator, executor} = data.data
                    const parsedIterator = python.exec(iterator, cache)

                    const args = Array(2).fill(0).map((_, i) => (
                        executor.type === "function_asignation" ? executor.data.arguments?.[i] || genAleaName()
                        : genAleaName()
                    ))
                    args.reverse()

                    return `for ${args.join(',')} in enumerate(${parsedIterator}):${(
                        executor.type === "variable" ? `${python.exec(executor, cache)}(${args.join(',')})` :
                        executor.type === "function_asignation" ? `${
                            executor.data.code.length
                            ? executor.data.code.map(v => python.exec(v, {...cache, indent: indent + 2})).map(v => '\n  ' + indentation + v).join('')
                            : "pass"
                        }` :
                        python.exec(executor, cache)
                    )}`
                }
                return '""" >> INVALID LOOP HERE << """'
            }
            case "number": {
                return data.data.number.toString()
            }
            case "object": {
                const {values} = data.data
                return `{${values.map(v => (
                    `"${v.key}": ${python.exec(v.value, cache)}`
                ))}}`
            }
            case "operation": {
                const {operation, operators} = data.data
                const table: {[key in typeof operation]: string} = {
                    eucl_division: "//",
                    power: "**",
                    eucl_rest: "%",
                    division: "/",
                    multiplication: "*",
                    substraction: "-",
                    addition: "+"
                }
                const parse = (d: ParsableObjectList): string => {
                    const v = python.exec(d, cache)
                    if(d.type === "operation") {
                        const {data: {operation: operation2}} = d
                        const keys = Object.keys(table)
                        if(
                            keys.indexOf(operation) <= keys.indexOf(operation2)
                        ) return `(${v})`
                    }
                    return v
                }
                const parsedOperators = operators.map(parse)
                return parsedOperators[0] + table[operation] + parsedOperators[1]
            }
            case "stopper": {
                const {type} = data.data
                const table: {[key in typeof type]: string} = {
                    fct_returns: "return",
                    block_pass: "pass",
                    loop_breaks: "break"
                }
                if(data.data.return && type !== "fct_returns") console.warn("<!!!> Break/pass statement with a returned value isn't supported yet in python! <!!!>")

                return `${table[type] + (data.data.return && type === "fct_returns" ? " " + python.exec(data.data.return, cache) : "")}`
            }
            case "strict_value": {
                const {value} = data.data
                return (
                    value === true ? "True" :
                    value === false ? "False":
                    "None"
                )
            }
            case "string": {
                return `f"${data.data.map(({type, data}) =>
                    type === "text" ? data : `{${python.exec(data, cache)}}`
                ).join('')}"`
            }
            case "variable": {                
                return `${cache.insideClass && cache.contentAttrs?.includes(data.data.name) ? "self." : ""}${data.data.name}`
            }
            case "variable_asignation": {
                const {variable, value} = data.data
                if((value?.type === "array" || value?.type === "object") && variable.type === "variable") cache.objects.push(variable.data.name)
                return `${python.exec(variable, {...cache, insideClass: false})}= ${value ? python.exec(value, cache) : "None"}`
            }
            case "attribute_access": {
                const attrs = data.data
                const obj = python.exec(attrs.origin.object, cache)

                if(cache.objects instanceof Array && cache.objects.includes(obj)) {
                    return `${obj}${attrs.access.map(e => `[${e.fromScript || e.object.type === "number" ? python.exec(e.object, cache) : `"${python.exec(e.object, cache)}"`}]`).join('')}`
                }else return `${obj}.${attrs.access.map(e => python.exec(e.object, cache)).join('.')}`
            }
            case "class_constructor": {
                const {content, extends: classExtend, name: className} = data.data
                
                const contentAttrs = content?.properties.map(e => (e.type === "variable_asignation" && e.data.variable.type === "variable" ? e.data.variable.data.name : (e.type === "function_asignation" ? e.data.name : null)))
                return  `class ${className}():\n${indentation}  `
                        + `def __init__(self${content?.constructor.data.arguments?.length ? "," + content?.constructor.data.arguments?.join(',') : ""}):\n`
                        + `${indentation}  ${content?.constructor.data.code.length ? python.exec(content.constructor.data.code, {...cache, indent: indent + 4}) : "    pass"}\n`
                        + (content?.properties ? "  " + python.exec(content.properties, {...cache, indent: indent + 2, insideClass: true, contentAttrs}) : "")
            }
            case "class_instanciation": {
                const {name, parameters} = data.data
                return `${name}(${parameters.map(p => python.exec(p, cache)).join(', ')})`
            }
            case "import": {
                if(data.data.importType === "module") {
                    const {informations, name} = data.data
                    return `from ${name} import ${informations.restrictions?.join(',') || '*'}${informations.affectedTo ? `as ${informations.affectedTo.data.name}` : ""}`
                }else return data.data.informations.affectedTo ? python.exec({
                    type: "class_constructor",
                    data: {
                        content: {
                            constructor: {type: "function_asignation", data: {name: null, code: [], arguments: []}},
                            properties: data.data.imported.content
                        },
                        extends: [],
                        name: data.data.informations.affectedTo.data.name
                    }
                }, cache) + `\n${indentation}${data.data.informations.affectedTo.data.name}=${data.data.informations.affectedTo.data.name}()` : python.exec(data.data.imported.content, cache)
            }
            default:
                return `""" >> AN INVALID OBJECT HAS BEEN GIVEN HERE << """`
        }
    }
}
export default python
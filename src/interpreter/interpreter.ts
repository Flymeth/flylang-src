import CompilerError from "../errors/compiler/CompilerError.js"
import asignationError from "../errors/interpreter/asignationError.js"
import FunctionError from "../errors/interpreter/functionError.js"
import OperationError from "../errors/interpreter/operationError.js"
import VariableError from "../errors/interpreter/variableError.js"
import RaiseFlyLangCompilerError from "../errors/raiseError.js"
import { ArrayReturn } from "../parser/objects/array.js"
import { ClassConstrReturn } from "../parser/objects/class_construct.js"
import { FunctionAsignationReturn } from "../parser/objects/function_asignation.js"
import { NumberReturn } from "../parser/objects/number.js"
import { DictObjectReturn } from "../parser/objects/object.js"
import { StrictValueReturn } from "../parser/objects/strict_value.js"
import { StringReturn } from "../parser/objects/string.js"
import Parser, { ParsableObjectList, ParsedObject, ParserClassData, ParserReturn } from "../parser/parser.js"
import Positioner from "../utils/positioner.js"
import {Interface, createInterface} from "readline"
import stringify from "./stringify.js"
import AccessError from "../errors/interpreter/accessError.js"
import util from "util";
import ExecutionError from "../errors/interpreter/executionError.js"
import { AttrAccessReturn } from "../parser/objects/attr_access.js"

export type methodObject<obj extends ParsableObjectList["data"]> = {
    variables: {[key: string]: (object: obj) => Promise<ParsableObjectList>},
    functions: {[key: string]: (object: obj, ...args: ParsableObjectList[]) => Promise<ParsableObjectList>}
}
export type cacheInterface = {
    registered: {
        variables: {[key: string]: {editable: boolean, value: ParsableObjectList}},
        functions: {[key: string]: FunctionAsignationReturn["data"]},
        objects: {[key: string]: {data: cacheInterface["registered"], class?: ClassConstrReturn["data"]}}
    },
    builtin: {
        variables: {[key: string]: () => Promise<ParsableObjectList>},
        functions: {[key: string]: (...args: ParsableObjectList[]) => Promise<ParsableObjectList>},
        objects: {[key: string]: {data: cacheInterface["builtin"]}}
    },
    methods: {
        "string": methodObject<StringReturn["data"]>,
        "number": methodObject<NumberReturn["data"]>,
        "array": methodObject<ArrayReturn["data"]>,
        "object": methodObject<DictObjectReturn["data"]>,
        "class_constructor": methodObject<ClassConstrReturn["data"]>
    },
    functionsDepth: {
        max: number,
        list: {[key: string]: number}
    },
    workingAttrAccess?: AttrAccessReturn["data"]
}
export const UNDEFINED_TYPE: StrictValueReturn = {type: "strict_value", data: {value: null}}

export default class Interpreter {
    data: ParserClassData
    cache: cacheInterface
    linereader: Interface
    currentPosition: Positioner
    constructor(data: ParserClassData) {
        this.data = data
        this.linereader = createInterface(process.stdin, process.stdout)
        this.linereader.pause()
        this.currentPosition = new Positioner("")

        const interpMethods = this;
        this.cache= {
            registered: {
                variables: {},
                functions: {},
                objects: {}
            },
            builtin: {
                variables: {},
                functions: {
                    async clone(...args) {
                        let obj = await interpMethods.eval(args[0])
                        if(obj.type === "array") {
                            obj.data.values = await Promise.all(obj.data.values.map(async (e) => await interpMethods.cache.builtin.functions.clone(e)))
                        } else if(obj.type === "object") {
                            obj.data.values = await Promise.all(
                                obj.data.values.map(async (e) => ({...e, value: await interpMethods.eval(e.value)}))
                            )
                        }
                        return JSON.parse(JSON.stringify(obj))
                    },
                    async range(fromObj, toObj, stepObj, ..._) {
                        if(!fromObj) throw new RaiseFlyLangCompilerError(new FunctionError(interpMethods.currentPosition, "Range requires at least 1 argument.")).raise()
                        fromObj = await interpMethods.eval(fromObj)
                        if(toObj) toObj = await interpMethods.eval(toObj)
                        if(stepObj) stepObj = await interpMethods.eval(stepObj)
                        if(
                            fromObj && fromObj.type !== "number"
                            || toObj && toObj.type !== "number"
                            || stepObj && stepObj.type !== "number"
                        ) throw new RaiseFlyLangCompilerError(new FunctionError(interpMethods.currentPosition, "Range arguments must be of type number.")).raise()

                        let [from, to, step] = [fromObj.data.number, toObj?.data.number, stepObj?.data.number]
                        if(typeof to !== "number") [from, to] = [0, from]
                        if(typeof step !== "number") step = from < to ? 1 : -1
                        if(
                            step === 0
                            || step < 0 && from < to
                            || step > 0 && from > to
                        ) throw new RaiseFlyLangCompilerError(new FunctionError(interpMethods.currentPosition, "Step can't be egual to 0. If the initial value is greater than the ending value, step must be lower than 0, and reversly.")).raise()

                        const array: NumberReturn[] = []
                        for(let i = from; (step < 0 ? i > to : i < to); i+= step) array.push({type: "number", data: {number: i, negative: i < 0, type: i.toString().includes('.') ? "float" : "integer"}})
                        return {type: "array", data: {values: array}}
                    },
                    async typeof(obj, ..._) {
                        obj = await interpMethods.eval(obj)
                        return {type: "string", data: [{type: "text", data: obj.type}]}
                    },
                    async eval(str, ..._) {
                        if(str.type !== "string") return UNDEFINED_TYPE
                        const strContent = (await interpMethods.eval(str) as StringReturn).data[0].data as string
                        const p = new Parser({type: "manualy", data: interpMethods.data})
                        const parsed = await p.compile(strContent)
                        if(!parsed) return UNDEFINED_TYPE
                        return interpMethods.eval(parsed.content[0])
                    }
                },
                objects: {
                    std: {
                        data: {
                            variables: {},
                            functions: {
                                async in(...args) {
                                    const dataStr = (await Promise.all(args.map(async v => stringify(await interpMethods.eval(v) || v, true)))).join('')
                                    interpMethods.linereader.resume()
                                    const ans = await new Promise<string>(res => interpMethods.linereader.question(dataStr, res))
                                    interpMethods.linereader.pause()
                                    return {type: "string", data: [{type: "text", data: ans}]}
                                },
                                async out(...args) {
                                    const dataStr = (await Promise.all(args.map(async v => stringify(await interpMethods.eval(v) || v, true)))).join(' ')
                                    interpMethods.linereader.resume()
                                    interpMethods.linereader.write(dataStr + "\n")
                                    interpMethods.linereader.pause()
                                    return UNDEFINED_TYPE
                                },
                                async cls(..._) {
                                    console.clear()
                                    return UNDEFINED_TYPE
                                }
                            },
                            objects: {}
                        }
                    }
                },
            },
            methods: {
                array: {
                    variables: {
                        async len(obj) {
                            const {length} = obj.values
                            return {type: "number", data: {number: length, negative: length < 0, type: length.toString().includes('.') ? 'float' : 'integer'}}
                        }
                    },
                    functions: {
                        async add(object, ...args) {
                            object.values.push(...(
                                await Promise.all(args.map(e => interpMethods.eval(e)))
                            ))
                            return UNDEFINED_TYPE
                        },
                        async pop(object, ...args) {
                            const index = args[0] || {type: "number", data: {number: 0}}
                            if(index.type !== "number") return UNDEFINED_TYPE
                            const numberedIndex = index.data.number < 0 ? object.values.length + index.data.number : index.data.number
                            const deleted = object.values[numberedIndex]
                            object.values = object.values.filter((_, i) => i !== numberedIndex)

                            return deleted
                        }
                    }
                },
                class_constructor: {
                    variables: {},
                    functions: {}
                },
                number: {
                    variables: {},
                    functions: {}
                },
                object: {
                    variables: {},
                    functions: {}
                },
                string: {
                    variables: {
                        async len(args) {
                            const {length} = (await Promise.all(args.map(async v => v.type === "data" ? stringify(await interpMethods.eval(v.data) || v.data) : v.data))).join('')
                            return {type: "number", data: {number: length, negative: length < 0, type: length.toString().includes('.') ? "float" : "integer"}}
                        }
                    },
                    functions: {
                        async asNbr(args, ..._) {
                            const content = (await Promise.all(args.map(async v => v.type === "data" ? stringify(await interpMethods.eval(v.data) || v.data) : v.data))).join('').trim()
                            const isFloat = content.includes('.')
                            const parsed = isFloat ? parseFloat(content) : parseInt(content)
                            if(isNaN(parsed)) return UNDEFINED_TYPE
                            
                            return {type: "number", data: {number: parsed, negative: parsed < 0, type: isFloat ? "float" : "integer"}}
                        }
                    }
                }
            },
            functionsDepth: {
                max: parseInt(this.data.properties.getValue('maxRecurtionDepth')?.value || (125).toString()),
                list: {}
            }
        }
    }
    generateID() {
        return Math.floor(Date.now() * Math.random() + .001)
    }
    
    private async evalFunction(fct: FunctionAsignationReturn["data"], parameters: ParsableObjectList[]): Promise<ParsableObjectList | void> {        
        const {arguments: args} = fct
        
        if((args?.length || 0) < parameters.length) throw new RaiseFlyLangCompilerError(new FunctionError(this.currentPosition, `"${fct.name}" requires ${fct.arguments?.length || "no"} arguments but ${arguments.length} has been given.`)).raise()
        
        const scopeArguments: cacheInterface["registered"] = {
            functions: {},
            objects: {},
            variables: {}
        }

        args?.forEach((name, index) => {
            scopeArguments.variables[name]= {editable: true, value: parameters[index] || UNDEFINED_TYPE}
        })

        let res = await this.process(fct.code, false, true, scopeArguments)
        if(res?.type === "stopper" && res.data.type === "fct_returns") res= await this.eval(res.data.return || UNDEFINED_TYPE)

        return res
    }
    private instanciateClass(cls: ClassConstrReturn["data"], parameters: ParsableObjectList[]): cacheInterface["registered"] {
        // todo
        return {variables: {}, functions: {}, objects: {}}
    }
    private convertToBoolean(element?: ParsedObject): boolean {
        if(!element) return false
        switch(element.type) {
            case "array": {
                return !!element.data.values.length
            }
            case "number": {
                return element.data.number !== 0
            }
            case "string": {
                return !!(element.data[0]?.data !== "")
            }
            case "strict_value": {
                return !!element.data.value
            }
            case "object": {
                return element.data.values.length !== 0
            }
        }
        return true
    }

    /**
     * Execute an instructino
     * @param instruction The instruction to execute
     */
    async eval(instruction: ParsedObject): Promise<ParsableObjectList> {
        this.currentPosition = new Positioner(this.data.file.src.content || "", undefined, this.data.file.src.path)
        if(instruction.map) this.currentPosition.indexes= instruction.map        

        const {data, type} = instruction
        switch(type) {
            case "variable": {
                const variables = {
                    ...this.cache.registered.variables,
                    ...this.cache.builtin.variables
                }
                const functions = {
                    ...this.cache.registered.functions,
                    ...this.cache.builtin.functions
                }
                const objects = {
                    ...this.cache.registered.objects,
                    ...this.cache.builtin.objects
                }

                if(data.name in variables) {
                    const v = variables[data.name]                    
                    if(typeof v !== "function") {
                        if(v.value.type === "variable") return await this.eval(v.value)
                        else return v.value
                    } else return await v()
                }else if(data.name in functions) {
                    const v = functions[data.name]
                    if(typeof v !== "function") return {type: "function_asignation", data: v}
                    else return {type: "function_asignation", data: {name: data.name, arguments: [], code: []}}
                }else if(data.name in objects) {
                    const v = objects[data.name]
                    if(("class" in v) && v.class) return {type: "class_constructor", data: v.class}
                    else return {type: "class_constructor", data: {name: data.name, extends: [], content: {constructor: {type: "function_asignation", data: {name: null, code: []}}, properties: []}}}
                }else throw new RaiseFlyLangCompilerError(new VariableError(this.currentPosition, `"${data.name}" has not been set.`)).raise()
            }
            case "function_call": {
                const functions = {
                    ...this.cache.registered.functions,
                    ...this.cache.builtin.functions
                }

                if(data.name in functions) {
                    if(typeof this.cache.functionsDepth.list[data.name] !== "number") this.cache.functionsDepth.list[data.name] = 0
                    if(this.cache.functionsDepth.list[data.name] >= this.cache.functionsDepth.max) throw new RaiseFlyLangCompilerError(new FunctionError(this.currentPosition, `${this.cache.functionsDepth.list[data.name]} recursion depth limit has been reached.`)).raise()

                    const fct = functions[data.name]
                    if(typeof fct === "function") return await fct(...data.arguments)

                    this.cache.functionsDepth.list[data.name]++
                    const res = await this.evalFunction(fct, data.arguments)
                    this.cache.functionsDepth.list[data.name]--
                    return res || UNDEFINED_TYPE
                }
                else throw new RaiseFlyLangCompilerError(new VariableError(this.currentPosition, `"${data.name}" has not been declared as a function.`)).raise()
            }
            case "class_instanciation": {
                let variable: ParsableObjectList | undefined = undefined;
                try {
                    variable = await this.eval({type: "variable", data: {name: data.name}})
                } catch (_) {  }
                if(variable?.type !== "class_constructor") throw new RaiseFlyLangCompilerError(new VariableError(this.currentPosition, `"${data.name}" has not been declared as a class.`)).raise()
                delete this.cache.registered.variables[data.name]
                delete this.cache.registered.functions[data.name]
                const classCache = this.instanciateClass(variable.data, data.parameters)
                this.cache.registered.objects[data.name] = {data: classCache, class: variable.data}
                return {type: "variable", data: {name: data.name}}
            }
            case "variable_asignation": {
                const {constant, value, variable} = data

                if(variable.type === "variable") {
                    if(this.cache.registered.variables[variable.data.name]?.editable === false) throw new RaiseFlyLangCompilerError(new asignationError(this.currentPosition)).raise()
                    
                    delete this.cache.registered.objects[variable.data.name]
                    delete this.cache.registered.functions[variable.data.name]
                    this.cache.registered.variables[variable.data.name] = {
                        value: (value ? await this.eval(value) : undefined) || UNDEFINED_TYPE,
                        editable: !constant
                    }                    
                }else if(variable.type === "array" && value) {
                    const asignationValues = variable.data.values
                    const valueContent = await this.eval(value)
                    if(valueContent.type === "array") {
                        const values = valueContent.data.values.slice(0, asignationValues.length)
                        for(const index in asignationValues) {
                            const variable = asignationValues[index]
                            if(variable.type !== "variable") throw new RaiseFlyLangCompilerError(new asignationError(this.currentPosition)).raise()

                            await this.eval({type: "variable_asignation", data: {variable, value: values[index], constant}})
                        }
                    }
                }else if(variable.type === "attribute_access") {
                    const [keyObject, accesser] = [variable.data.access.at(-1), variable.data.access.slice(0, -1)]
                    const objectWhereDefine = accesser.length ? await this.eval({type: "attribute_access", data: {...variable.data, access: accesser}}) : await this.eval(variable.data.origin.object)
                    
                    const key = keyObject?.fromScript ? await this.eval(keyObject.object) : keyObject?.object
                    if(objectWhereDefine.type === "array" && key?.type === "number") {
                        const index = key.data.number < 0 ? objectWhereDefine.data.values.length - key.data.number : key.data.number
                        objectWhereDefine.data.values[index] = await this.eval(value || UNDEFINED_TYPE)
                    }else if(objectWhereDefine.type === "object") {                        
                        const name = (
                            key?.type === "variable" ? key.data.name :
                            key?.type === "string" ? stringify(await this.eval(key)) :
                            key?.type === "number" ? key.data.number.toString() : null
                        )
                        if(!name) throw new RaiseFlyLangCompilerError(new AccessError(this.currentPosition, "Invalid key provided.")).raise()

                        let index = objectWhereDefine.data.values.findIndex(e => e.key === name)
                        if(index < 0) (index = objectWhereDefine.data.values.length), objectWhereDefine.data.values.push({key: name, value: UNDEFINED_TYPE})
                        objectWhereDefine.data.values[index].value = await this.eval(value || UNDEFINED_TYPE)
                    }else throw new RaiseFlyLangCompilerError(new AccessError(this.currentPosition, `"${stringify(key || UNDEFINED_TYPE)}" doesn't exist on the object.`)).raise()
                }
                return UNDEFINED_TYPE
            }
            case "function_asignation": {
                if(data.name) {
                    delete this.cache.registered.variables[data.name]
                    delete this.cache.registered.objects[data.name]
                    this.cache.registered.functions[data.name] = data
                }
                return {type, data}
            }
            case "string": {
                let sentence = ""
                for await(const current of data) {
                    if(current.type === "text") sentence += current.data
                    else {
                        const evaluated = (await this.eval(current.data)) || UNDEFINED_TYPE
                        sentence += (evaluated.type === "string" ? evaluated.data[0].data : stringify(evaluated))
                    }
                }

                return {type: "string", data: [{type: "text", data: sentence}]}
            }
            case "boolean_test": {
                const operators = {
                    first: this.convertToBoolean(await this.eval(data.testers[0]) || undefined),
                    second: this.convertToBoolean(await this.eval(data.testers[1]) || undefined)
                }
                switch(data.test) {
                    case "and": {
                        return {type: "strict_value", data: {value: operators.first && operators.second}}
                    }
                    case "or": {
                        return {type: "strict_value", data: {value: operators.first || operators.second}}
                    }
                    case "nand": {
                        return {type: "strict_value", data: {value: !(operators.first && operators.second)}}
                    }
                    case "nor": {
                        return {type: "strict_value", data: {value: !(operators.first || operators.second)}}
                    }
                    case "xor": {
                        return {type: "strict_value", data: {value: operators.first != operators.second}}
                    }
                }
            }
            case "comparaison": {
                const getComparableValue = async (obj: ParsableObjectList): Promise<[string, number] | null> => {
                    switch (obj.type) {
                        case "array": {
                            return [JSON.stringify(obj.data.values), obj.data.values.length]
                        }
                        case "object": {
                            return [JSON.stringify(obj.data.values.map(e => e.key)), obj.data.values.length]
                        }
                        case "string": {
                            const content = (await this.eval(obj) as StringReturn).data[0].data as string // This function parse automatically the string and its content
                            return [content, content.length]
                        }
                        case "number": {
                            return [obj.data.number.toString(), obj.data.number]
                        }
                        case "strict_value": {
                            return [!!obj.data.value ? "true" : "false", !!obj.data.value ? 1 : 0]
                        }
                    }
                    return null
                }

                const operators = {
                    first: await getComparableValue(await this.eval(data.operators[0]) || data.operators[0]),
                    second: await getComparableValue(await this.eval(data.operators[1]) || data.operators[1]),
                }

                if(operators.first === null || operators.second === null) throw new RaiseFlyLangCompilerError(new OperationError(this.currentPosition, "Types can't be compared.")).raise()

                let res: StrictValueReturn | null = null
                switch(data.comparaison.name) {
                    case "egual": {
                        res= {type: "strict_value", data: {value: operators.first[0] === operators.second[0]}}
                        break;
                    }
                    case "inf": {
                        res= {type: "strict_value", data: {value: operators.first[1] <= operators.second[1]}}
                        break;
                    }
                    case "inf_strict": {
                        res= {type: "strict_value", data: {value: operators.first[1] < operators.second[1]}}
                        break;
                    }
                    case "sup": {
                        res= {type: "strict_value", data: {value: operators.first[1] >= operators.second[1]}}
                        break;
                    }
                    case "sup_strict": {
                        res= {type: "strict_value", data: {value: operators.first[1] > operators.second[1]}}
                        break;
                    }
                }
                if(!res) return UNDEFINED_TYPE
                else {
                    if(data.comparaison.invert) res.data.value= !res.data.value
                    return res
                }
            }
            case "operation": {
                const operations = {
                    first: await this.eval(data.operators[0]) || data.operators[0],
                    second: await this.eval(data.operators[1]) || data.operators[1]
                }
                
                if(data.operation === "addition") {
                    if(operations.first.type === operations.second.type) {
                        // Bellow there is "as ..." because the 2 operators are the same and ts/intelisense doens't understand that.
                        switch(operations.first.type) {
                            case "array": {
                                const values1 = operations.first.data.values
                                const values2 = (operations.second as ArrayReturn).data.values
                                return {type: "array", data: {values: [...values1, ...values2]}}
                            }
                            case "object": {
                                const values2 = (operations.second as DictObjectReturn).data.values
                                const values1 = operations.first.data.values.filter(e => !values2.find(({key}) => key === e.key)) // An object must has unique keys

                                return {type: "object", data: {values: [...values1, ...values2]}}
                            }
                            case "number": {
                                const nb1 = operations.first.data.number
                                const nb2 = (operations.second as NumberReturn).data.number
                                const res = nb1 + nb2
                                
                                return {type: "number", data: {number: res, negative: res < 0, type: res.toString().includes('.') ? "float" : "integer"}}
                            }
                            case "string": {
                                const str1 = (await this.eval(operations.first) as StringReturn).data[0].data as string
                                const str2 = (await this.eval(operations.second) as StringReturn).data[0].data as string
                                
                                return {type: "string", data: [{type: "text", data: str1 + str2}]}
                            }
                        }
                    }else if(operations.first.type === "string") {
                        const str = (await this.eval(operations.first) as StringReturn).data[0].data as string
                        return {type: "string", data: [{type: "text", data: `${str}${stringify(await this.eval(operations.second))}`}]}
                    }

                    throw new RaiseFlyLangCompilerError(new OperationError(this.currentPosition, `Cannot add a "${operations.first.type}" with a "${operations.second.type}"`)).raise()
                } else if(data.operation === "multiplication") {
                    if( operations.first.type === operations.second.type 
                        && operations.first.type !== "number"
                    ) throw new RaiseFlyLangCompilerError(new OperationError(this.currentPosition, `Cannot multiply a "${operations.first.type}" and a "${operations.first.type}".`)).raise()
                    
                    if(operations.first.type === operations.second.type) {
                        const numbers: NumberReturn[] = [operations.first as NumberReturn, operations.second as NumberReturn]
                        const result = numbers[0].data.number * numbers[1].data.number
                        return {
                            type: "number", data: {number: result, negative: result < 0, type: result.toString().includes('.') ? "float" : "integer"}
                        }
                    }else {
                        //@ts-ignore Checked above
                        const {data: {number}}: NumberReturn = operations.first.type === "number" ? operations.first : operations.second
                        const obj = operations.first.type === "number" ? operations.second : operations.first
                        switch(obj.type) {
                            case "string": {
                                if(number <= 0) return {type: "string", data: []}
                                else {
                                    const str = (await this.eval(obj) as StringReturn).data[0].data as string
                                    return {type: "string", data: [{type: "text", data: str.repeat(number)}]}
                                }
                            }
                            case "array": {
                                if(number <= 0) return {type: "array", data: {values: []}}
                                else {
                                    const {values} = obj.data
                                    for(let i = 1; i < number; i++) {
                                        obj.data.values.push(...[...values])
                                    }
                                    return obj
                                }
                            }
                        }
                        throw new RaiseFlyLangCompilerError(new OperationError(this.currentPosition, `Cannot multiply ${number} times a "${obj.type}".`)).raise()
                    }
                } else {
                    if(
                        operations.first.type !== "number"
                        || operations.second.type !== "number"
                    ) throw new RaiseFlyLangCompilerError(new OperationError(this.currentPosition, `This operation operate only if operands are numbers.`)).raise()
                    const numbers = [operations.first.data.number, operations.second.data.number]
                    if(numbers[1] === 0 && (
                        ["eucl_division", "division"].includes(data.operation)
                    )) throw new RaiseFlyLangCompilerError(new OperationError(this.currentPosition, "Division by 0 is not a valid math operation.")).raise()
                    
                    const result = (
                        data.operation === "eucl_division" ? Math.floor(numbers[0] / numbers[1]) :
                        data.operation === "eucl_rest" ? numbers[0] % numbers[1] :
                        data.operation === "power" ? numbers[0] ** numbers[1] :
                        data.operation === "division" ? numbers[0] / numbers[1] :
                        data.operation === "substraction" ? numbers[0] - numbers[1] : null
                    ) // Multiplication & addition are processed above

                    if(result === null) throw new RaiseFlyLangCompilerError(new CompilerError()).raise()
                    return {type: "number", data: {negative: result < 0, number: result, type: result.toString().includes('.') ? "float" : "integer"}}
                }
            }
            case "attribute_access": {
                const {origin, access} = data
                const firstAccessor = access[0]
                if(!firstAccessor) return origin.object

                const deleteAttrCache = !this.cache.workingAttrAccess
                if(deleteAttrCache) this.cache.workingAttrAccess = data

                const originValue = await this.eval(origin.object)
                const litteralValue = origin.fromScript ? originValue : origin.object
                const accessValue = firstAccessor.fromScript ? await this.eval(firstAccessor.object) : firstAccessor.object

                const classes = {
                    ...this.cache.registered.objects,
                    ...this.cache.builtin.objects
                }
                
                let returnsValue: ParsableObjectList | undefined = undefined;
                if(originValue.type === "array" && accessValue.type === "number") { // Access to an array' item
                    const {values} = originValue.data
                    let {number} = accessValue.data
                    if(number < 0) number = values.length + number
                    if(number > values.length) throw new RaiseFlyLangCompilerError(new AccessError(this.currentPosition, `Index [${accessValue.data.number}] out of range`)).raise()
                    returnsValue = values[number]
                }else if(originValue.type === "object") { // Access to an object's key
                    const keyName = (
                        accessValue.type === "variable" ? accessValue.data.name : 
                        accessValue.type === "function_call" ? accessValue.data.name :
                        stringify(accessValue)
                    )
                    
                    const value = originValue.data.values.find(k => k.key === keyName)?.value || UNDEFINED_TYPE
                    returnsValue = await this.eval(value)

                    if(accessValue.type === "function_call") {
                        if(returnsValue.type !== "function_asignation") throw new RaiseFlyLangCompilerError(new FunctionError(this.currentPosition, `"${keyName}" is not a function!`)).raise()
                        returnsValue = await this.evalFunction(returnsValue.data, accessValue.data.arguments) || UNDEFINED_TYPE
                    }
                } else if(litteralValue.type === "variable" && (litteralValue.data.name in classes)) { // Access to a class method/property
                    const classMethods = classes[litteralValue.data.name]
                    if(accessValue.type === "variable") {
                        const {variables, functions} = classMethods.data
                        if(accessValue.data.name in variables) {
                            const v = variables[accessValue.data.name]
                            if(typeof v === "function") returnsValue = await v()
                            else returnsValue = v.value
                        }else if((accessValue.data.name in functions) && this.cache.workingAttrAccess) {
                            const v = functions[accessValue.data.name]
                            if(typeof v === "function") {
                                this.cache.builtin.functions[`//builtin_${accessValue.data.name}`] = v
                                returnsValue = await this.eval({type: "variable", data: {name: `//builtin_${accessValue.data.name}`}})
                            }else returnsValue = {type: "function_asignation", data: v}
                        }
                    }else if(accessValue.type === "function_call") {
                        const {functions} = classMethods.data
                        if(accessValue.data.name in functions) {
                            const v = functions[accessValue.data.name]
                            if(typeof v === "function") returnsValue = await v(...accessValue.data.arguments) || UNDEFINED_TYPE
                            else returnsValue = await this.evalFunction(v, accessValue.data.arguments) || UNDEFINED_TYPE
                        }
                    }
                }
                if(!returnsValue) {
                    if(originValue.type in this.cache.methods) {
                        // @ts-ignore - Because it's too generic and can't do in another way.
                        const methods: methodObject<any> = this.cache.methods[originValue.type]
                        switch(accessValue.type) {
                            case "variable": {
                                if(!(accessValue.data.name in methods.variables)) break;
                                else returnsValue = await methods.variables[accessValue.data.name](originValue.data)
                                break;
                            }
                            case "function_call": {
                                if(!(accessValue.data.name in methods.functions)) break;
                                else returnsValue = await methods.functions[accessValue.data.name](originValue.data, ...accessValue.data.arguments)
                                break;
                            }
                        }
                    }
                }
                if(!returnsValue) throw new RaiseFlyLangCompilerError(new AccessError(this.currentPosition, `Invalid attribute/method for a ${originValue.type}.`)).raise()
                if(access.length - 1) returnsValue = await this.eval({type: "attribute_access", data: {origin: {fromScript: false, object: returnsValue}, access: access.slice(1)}})
                if(returnsValue.type === "variable") returnsValue = await this.eval(returnsValue)
                if(deleteAttrCache) delete this.cache.workingAttrAccess
                return returnsValue
            }
            case "loop": {
                const maxLoopIteration = parseInt(this.data.properties.getValue('maxLoopIteration')?.value || (150).toString())
                const skipNoCodeLoops = parseInt(this.data.properties.getValue('autoSkipUseless')?.value || (0).toString())

                if(data.type === "for") {
                    const {executor, iterator} = data
                    const parsedIterator = await this.eval(iterator)
                    const iteratorArray = (
                        parsedIterator.type === "array" ? parsedIterator.data.values :
                        parsedIterator.type === "object" ? parsedIterator.data.values.map(e => e.key) :
                        parsedIterator.type === "string" ? Array.from(parsedIterator.data.reduce((str, cur) => str + (cur.type === "data" ? stringify(cur.data) : cur.data), "")) : null
                    )
                    
                    if(iteratorArray === null) throw new RaiseFlyLangCompilerError(new ExecutionError(this.currentPosition, "The given iterator type is invalid.")).raise()
                    if(iteratorArray.length >= maxLoopIteration) throw new RaiseFlyLangCompilerError(new ExecutionError(this.currentPosition, `Iterator length is above iteration limit (${maxLoopIteration}).`)).raise()

                    const fct = await this.eval(executor)                    
                    if(fct.type !== "function_asignation") throw new RaiseFlyLangCompilerError(new ExecutionError(this.currentPosition, "An invalid function has been given for a 'for' loop.")).raise()
                    const isBuiltinFct = fct.data.name?.startsWith('//builtin')
                    if(skipNoCodeLoops && !(fct.data.code.length || isBuiltinFct)) return UNDEFINED_TYPE

                    let index = 0
                    while(index < iteratorArray.length) {
                        let value= iteratorArray[index]

                        if(typeof value === "string") value= {type: "string", data: [{type: "text", data: value}]}
                        const fctArgs: ParsableObjectList[] = [
                            value, {type: "number", data: {number: index, negative: false, type: "integer"}} as NumberReturn // Typescript compiler doesn't recognize it (but intelisence does)
                        ].slice(0, fct.data.arguments?.length || (isBuiltinFct ? 2 : 0))
                        
                        if(isBuiltinFct && fct.data.name) {
                            await this.cache.builtin.functions[fct.data.name](...fctArgs)
                        }else {
                            const res = await this.evalFunction(fct.data, fctArgs)
                            if(res?.type === "stopper") return res
                        }
                        index++
                    }

                    return UNDEFINED_TYPE
                }else {
                    const {condition, code, type} = data
                    if(skipNoCodeLoops && !code.length) return UNDEFINED_TYPE

                    const conditionNeedToBe = type === "while" // 'until' -> conditionNeedToBe 'true'; else -> conditionNeedToBe 'false' (= while)

                    const isValid = async () => this.convertToBoolean(await this.eval(condition))
                    let iterationCount = 0
                    while(await isValid() === conditionNeedToBe) {
                        if(iterationCount >= maxLoopIteration) throw new RaiseFlyLangCompilerError(new ExecutionError(this.currentPosition, `Max iteration count (${maxLoopIteration}) has been reached.`)).raise()
                        
                        const res = await this.process(code, false)
                        if(res?.type === "stopper") return res

                        iterationCount++
                    }
                }
                return UNDEFINED_TYPE
            }
            case "if_statement": {
                if(data.type === "if") {
                    const {code, condition, else: ifNot} = data
                    if(this.convertToBoolean(await this.eval(condition))) return await this.process(code, false) || UNDEFINED_TYPE
                    else if(ifNot) return await this.eval({type: "if_statement", data: ifNot})

                }else return await this.process(data.code, false) || UNDEFINED_TYPE

                return UNDEFINED_TYPE
            }
            case "object": {
                for await(const e of data.values) await this.eval(e.value)
                break;
            }
            case "array": {
                for await(const e of data.values) await this.eval(e)
                break;
            }
            case "comment": {
                return UNDEFINED_TYPE
            }
        }
        return instruction
    }

    /**
     * Execute in order a lisst of instruction
     * @param instructions An array of instruction to execute
     * @param allowNotStopperResult If the interpreter coulds return other type that a stopper (default: `true`)
     * @param incrementScope If true, after the execution of the process the interpreter will delete all created variables/functions/...
     * @param scopeVariables The cache variable to set unicly in this scope
     */
    async process(instructions: ParserReturn["content"], allowNotStopperResult= true, incrementScope = true, scopeVariables: cacheInterface["registered"] = {variables: {}, functions: {}, objects: {}}): Promise<ParsableObjectList | void> {
        let result: ParsableObjectList | undefined = undefined

        const saveVars = Object.keys(this.cache.registered.variables)
        const saveFcts = Object.keys(this.cache.registered.functions)
        const saveClass = Object.keys(this.cache.registered.objects)

        for(const name in scopeVariables.variables) {
            this.cache.registered.variables[name] = scopeVariables.variables[name]
        }
        for(const name in scopeVariables.functions) {
            this.cache.registered.functions[name] = scopeVariables.functions[name]
        }
        for(const name in scopeVariables.objects) {
            this.cache.registered.objects[name] = scopeVariables.objects[name]
        }

        // Instructions execution
        if(instructions.length) {
            if(instructions.length <= 1) {
                result = await this.eval(instructions[0])
                if(!allowNotStopperResult && result.type !== "stopper") result = undefined
            } else {
                for await(const data of instructions) {
                    const res = await this.eval(data)
                    if(res?.type === "stopper") {
                        result= res
                        break;
                    }
                }
            }
        }

        if(result?.type === "stopper") result= {type: "stopper", data: {...result.data, return: await this.eval(result.data.return || UNDEFINED_TYPE)}}
        if(incrementScope) { // Deletes only if scope has been incremented
            // Delete local variables/functions/classes from cache
            for(const name in this.cache.registered.variables) {
                if(!saveVars.includes(name)) delete this.cache.registered.variables[name]
            }
            for(const name in this.cache.registered.functions) {
                if(!saveFcts.includes(name)) delete this.cache.registered.functions[name]
            }
            for(const name in this.cache.registered.objects) {
                if(!saveClass.includes(name)) delete this.cache.registered.objects[name]
            }
        }

        return result
    }
}
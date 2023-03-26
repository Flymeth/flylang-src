import { inspect } from "util";
import FunctionError from "../errors/interpreter/functionError";
import RaiseFlyLangCompilerError from "../errors/raiseError";
import { ArrayReturn } from "../parser/objects/array";
import { AttrAccessReturn } from "../parser/objects/attr_access";
import { ClassConstrReturn } from "../parser/objects/class_construct";
import { FunctionAsignationReturn } from "../parser/objects/function_asignation";
import { NumberReturn } from "../parser/objects/number";
import { DictObjectReturn } from "../parser/objects/object";
import { StringReturn } from "../parser/objects/string";
import Parser, { ParsableObjectList } from "../parser/parser";
import Interpreter, { ICM, UNDEFINED_TYPE } from "./interpreter";
import {BigNumber} from "bignumber.js";
import stringify, { createStringObj } from "./stringify";
import { join } from "path";
import RaiseCodeError from "../errors/raiseCodeError";

export type methodObject<obj extends ParsableObjectList["data"]> = {
    variables: {[key: string]: (object: obj) => Promise<ParsableObjectList>},
    functions: {[key: string]: (object: obj, ...args: ParsableObjectList[]) => Promise<ParsableObjectList>}
}
export type cacheInterface = {
    registered: {
        /**
         * @key value - The value of this variable (like another variable, a function call, ...)
         * @key default - If the value is not accecible, take this instead.
         */
        variables: {[key: string]: {editable: boolean, value: ParsableObjectList, default?: ParsableObjectList}},
        functions: {[key: string]: FunctionAsignationReturn["data"]},
        objects: {[key: string]: {data: cacheInterface["registered"], class: ClassConstrReturn["data"], id: number}}
    },
    builtin: {
        variables: {[key: string]: () => Promise<ParsableObjectList>},
        functions: {[key: string]: (...args: ParsableObjectList[]) => Promise<ParsableObjectList>},
        objects: {[key: string]: {data: cacheInterface["builtin"], id: number}}
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
export default function genDefaultCache(interpMethods: Interpreter): cacheInterface {
    return {
        registered: {
            variables: {},
            functions: {},
            objects: {}
        },
        builtin: {
            variables: {
                async __path() {
                    const path = interpMethods.currentPosition.file?.value || join(process.cwd(), "console.fly")
                    if(!path) return UNDEFINED_TYPE
                    return createStringObj(path)
                },
                async __main() {
                    const path = interpMethods.currentPosition.original.file?.value
                    if(!path) return UNDEFINED_TYPE
                    return createStringObj(path)
                },
                async debug() {
                    const depthRegistered= 10
                    const depthBuiltIn= 5
                    interpMethods.print(`# REGISTERED:\n${inspect(interpMethods.cache.registered, false, depthRegistered)}\n# BUILTIN:\n${inspect(interpMethods.cache.builtin, false, depthBuiltIn)}`)
                    await interpMethods.input("[DEBUGGER CALLED]>> Press Enter To Continue. -> ")
                    if(ICM()) interpMethods.consoleModeCache.blockNextPrint = true
                    return UNDEFINED_TYPE
                }
            },
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
                    return await interpMethods.eval(JSON.parse(JSON.stringify(obj)))
                },
                async range(fromObj, toObj, stepObj, ..._) {
                    if(!fromObj) throw new RaiseCodeError(interpMethods.currentPosition, new FunctionError("Range requires at least 1 argument.")).raise()
                    fromObj = await interpMethods.eval(fromObj)
                    if(toObj) toObj = await interpMethods.eval(toObj)
                    if(stepObj) stepObj = await interpMethods.eval(stepObj)
                    if(
                        fromObj && fromObj.type !== "number"
                        || toObj && toObj.type !== "number"
                        || stepObj && stepObj.type !== "number"
                    ) throw new RaiseCodeError(interpMethods.currentPosition, new FunctionError("Range arguments must be of type number.")).raise()

                    let [from, to, step] = [fromObj.data.number, toObj?.data.number, stepObj?.data.number]
                    if(!to) [from, to] = [new BigNumber(0), from]
                    if(!step) step = from.isLessThan(to) ? new BigNumber(1) : new BigNumber(-1)
                    if(
                        step.isEqualTo(0)
                        || step.isLessThan(0) && from.isLessThan(to)
                        || step.isGreaterThan(0) && from.isGreaterThan(to)
                    ) throw new RaiseCodeError(interpMethods.currentPosition, new FunctionError("Step can't be egual to 0. If the initial value is greater than the ending value, step must be lower than 0, and reversly.")).raise()

                    const finalLen = to.minus(from).abs()
                    if(finalLen.isGreaterThan(parseInt(interpMethods.data.properties.getValue("maxObjectsSize")?.value || "0"))) throw new RaiseCodeError(interpMethods.currentPosition, new FunctionError("The output array length will be above the limit.")).raise()

                    const array: NumberReturn[] = []
                    const checkerIsGreaterThan = step.isLessThan(0)
                    for(let i = from; ( checkerIsGreaterThan ? i.isGreaterThan(to) : i.isLessThan(to)); i= i.plus(step)) array.push({type: "number", data: {number: i, negative: i.isNegative(), type: i.isInteger() ? "integer" : "float"}})
                    return {type: "array", data: {values: array}}
                },
                async typeof(obj, ..._) {
                    obj = await interpMethods.eval(obj)
                    const stringType = obj.type === "variable" && obj.data.name.startsWith('//') ? /[a-z-]+$/i.exec(obj.data.name)?.[0] || obj.type : obj.type
                    return createStringObj(stringType)
                },
                async eval(str, ..._) {
                    if(str.type !== "string") return UNDEFINED_TYPE
                    const strContent = (await interpMethods.eval(str) as StringReturn).data[0].data as string
                    const p = new Parser({type: "manualy", data: interpMethods.data})
                    p.data.position= interpMethods.currentPosition

                    const parsed = await p.compile(strContent)
                    if(!parsed) return UNDEFINED_TYPE
                    return await interpMethods.process(parsed.content, true, false) || UNDEFINED_TYPE
                }
            },
            objects: {
                std: {
                    id: 0,
                    data: {
                        variables: {},
                        functions: {
                            async in(...args) {                      
                                const dataStr = (await Promise.all(args.map(async v => stringify(await interpMethods.eval(v) || v, process.stdout.hasColors())))).join('')
                                const ans = await interpMethods.input(dataStr)
                                return {type: "string", data: [{type: "text", data: ans}]}
                            },
                            async out(...args) {
                                const dataStr = (await Promise.all(args.map(async v => stringify(await interpMethods.eval(v), process.stdout.hasColors())))).join(' ')
                                interpMethods.print(dataStr)
                                return UNDEFINED_TYPE
                            },
                            async cls(..._) {
                                interpMethods.clear()
                                return UNDEFINED_TYPE
                            },
                            async exit(..._) {
                                process.kill(process.pid)
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
                        return {type: "number", data: {number: new BigNumber(length), negative: length < 0, type: length.toString().includes('.') ? 'float' : 'integer'}}
                    }
                },
                functions: {
                    async add(object, ...args) {
                        if((args.length + object.values.length) > parseInt(interpMethods.data.properties.getValue("maxObjectsSize")?.value || "250")) throw new RaiseCodeError(interpMethods.currentPosition, new FunctionError("The array length will be above the limit.")).raise()
                        const parsedValues= await Promise.all(args.map(async e => await interpMethods.eval(e)))
                        
                        object.values = [...object.values, ...parsedValues]
                        return UNDEFINED_TYPE
                    },
                    async rmv(object, ...args) {
                        const index = await interpMethods.eval(args[0] || {type: "number", data: {number: 0}})
                        if(index.type !== "number") return UNDEFINED_TYPE
                        const numberedIndex = index.data.number.isLessThan(0) ? index.data.number.plus(object.values.length) : index.data.number
                        if(numberedIndex.isLessThan(0) || numberedIndex.isGreaterThanOrEqualTo(object.values.length)) throw new RaiseCodeError(interpMethods.currentPosition, new FunctionError(`Index [${numberedIndex}] does not exist on array.`)).raise()
                        const deleted = object.values[numberedIndex.toNumber()]
                        object.values = object.values.filter((_, i) => !numberedIndex.isEqualTo(i))

                        return deleted
                    }
                }
            },
            class_constructor: {
                variables: {},
                functions: {
                    async checkInstance(obj, tester, ..._) {
                        tester = await interpMethods.eval(tester)
                        if(
                            tester.type !== "variable"
                            || !tester.data.name.startsWith('//instance')
                        ) return {type: "strict_value", data: {value: false}}

                        return {type: "strict_value", data: {value: new RegExp(`//instance_${obj.name}_\\d+`).test(tester.data.name)}}
                    }
                }
            },
            number: {
                variables: {
                    async type(obj) {
                        return {type: "string", data: [{type: "text", data: obj.type}]}
                    }
                },
                functions: {
                    async asStr(nb, ..._) {
                        return {type: "string", data: [{type: "text", data: nb.number.toFixed()}]}
                    },
                }
            },
            object: {
                variables: {
                    async len(obj) {
                        const {length} = obj.values
                        return {type: "number", data: {number: new BigNumber(length), negative: length < 0, type: length.toString().includes('.') ? 'float' : 'integer'}}
                    },
                    async keys(obj) {
                        const {values} = obj
                        return {type: "array", data: {values: values.map(({key}) => createStringObj(key))}}
                    },
                    async values(obj) {
                        const {values} = obj
                        return {type: "array", data: {values: values.map(({value}) => value)}}
                    }
                },
                functions: {}
            },
            string: {
                variables: {
                    async len(args) {
                        const {length} = (await Promise.all(args.map(async v => v.type === "data" ? stringify(await interpMethods.eval(v.data) || v.data) : v.data))).join('')
                        return {type: "number", data: {number: new BigNumber(length), negative: length < 0, type: length.toString().includes('.') ? "float" : "integer"}}
                    }
                },
                functions: {
                    async asNbr(args, ..._) {
                        const content: string = (await Promise.all(args.map(async v => v.type === "data" ? stringify(await interpMethods.eval(v.data) || v.data) : v.data))).join('').trim()
                        const parsed = new BigNumber(content)
                        if(parsed.isNaN()) return UNDEFINED_TYPE
                        
                        return {type: "number", data: {number: parsed, negative: parsed.isNegative(), type: parsed.isInteger() ? "integer" : "float"}}
                    }
                }
            }
        },
        functionsDepth: {
            max: parseInt(interpMethods.data.properties.getValue('maxRecurtionDepth')?.value || (125).toString()),
            list: {}
        }
    }
}
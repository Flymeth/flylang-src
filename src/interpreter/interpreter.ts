import CompilerError from "../errors/compiler/CompilerError.js"
import asignationError from "../errors/interpreter/asignationError.js"
import FunctionError from "../errors/interpreter/functionError.js"
import OperationError from "../errors/interpreter/operationError.js"
import VariableError from "../errors/interpreter/variableError.js"
import RaiseFlyLangCompilerError, { setAllowErrors } from "../errors/raiseError.js"
import { ArrayReturn } from "../parser/objects/array.js"
import { ClassConstrReturn } from "../parser/objects/class_construct.js"
import { FunctionAsignationReturn } from "../parser/objects/function_asignation.js"
import { NumberReturn } from "../parser/objects/number.js"
import { DictObjectReturn } from "../parser/objects/object.js"
import { StrictValueReturn } from "../parser/objects/strict_value.js"
import { StringReturn } from "../parser/objects/string.js"
import { ParsableObjectList, ParsedObject, ParserClassData, ParserReturn } from "../parser/parser.js"
import Positioner from "../utils/positioner.js"
import {Interface, createInterface} from "readline"
import stringify, { createStringObj } from "./stringify.js"
import AccessError from "../errors/interpreter/accessError.js"
import ExecutionError from "../errors/interpreter/executionError.js"
import { VariableAsignationReturn } from "../parser/objects/variable_asignation.js"
import { VariableReturn } from "../parser/objects/variable.js"
import importError from "../errors/interpreter/importError.js"
import genDefaultCache, { cacheInterface } from "./defaultCache.js"
import InstanciationError from "../errors/interpreter/instanciationError.js"
import {BigNumber} from "bignumber.js";
import { join, parse } from "path"
import { needParseBeforeInterpretName } from "../utils/registeries.js"
import safeSplit from "../utils/tools/safeSplit.js"
import stripAnsi from "strip-ansi"
import { inspect } from "util"
import chalk from "chalk";

export const UNDEFINED_TYPE: StrictValueReturn = {type: "strict_value", data: {value: null}}
let inConsoleMode = false

/**
 * Returns if the program is in console mode
 */
export const ICM = () => inConsoleMode
export default class Interpreter {
    data: ParserClassData
    cache: cacheInterface
    linereader: Interface
    currentPosition: Positioner
    consoleModeCache: {[key: string]: any}

    constructor(data: ParserClassData, consoleMode = false, parentPositioner?: Positioner) {
        this.data = data
        this.linereader = createInterface(process.stdin, process.stdout)
        this.linereader.pause()
        this.currentPosition = new Positioner(data.file.src.content || "", parentPositioner, data.file.src.path)
        this.cache= genDefaultCache(this)
        this.consoleModeCache= {}

        if(consoleMode) this.start_InConsoleMode()
    }

    async input(prompt: string) {
        this.linereader.resume()
        const v = await new Promise<string>(res => this.linereader.question(prompt, res))
        this.linereader.pause()
        return v
    }
    async print(data: string) {
        if(this.consoleModeCache.blockNextPrint) return this.consoleModeCache.blockNextPrint= false        
        process.stdout.write(data + "\n")
    }
    async clear() {
        console.clear()
        if(inConsoleMode) this.consoleModeCache.blockNextPrint = true
    }
    
    private async evalFunction(fct: FunctionAsignationReturn["data"], parameters: ParsableObjectList[]): Promise<ParsableObjectList | void> {        
        const {arguments: args} = fct
        if((args?.length || 0) < parameters.length) throw new RaiseFlyLangCompilerError(new FunctionError(this.currentPosition, `"${fct.name}" requires ${fct.arguments?.length || "no"} arguments but ${arguments.length} has been given.`)).raise()
        
        const scopeArguments: cacheInterface["registered"] = {
            functions: {},
            objects: {},
            variables: {}
        }
        
        if(args && args.length) {
            let index = 0
            while(index < args.length) {
                scopeArguments.variables[args[index]]= {editable: true, value: await this.eval(parameters[index]) || UNDEFINED_TYPE}
                index++
            }
        }

        let res = await this.process(fct.code, false, true, scopeArguments)
        if(res?.type === "stopper" && res.data.type === "fct_returns") res= await this.eval(res.data.return || UNDEFINED_TYPE)

        return res
    }

    async genVariableValue(editable: boolean, value: ParsableObjectList = UNDEFINED_TYPE): Promise<cacheInterface["registered"]["variables"][string]> {
        if(needParseBeforeInterpretName.includes(value.type)) value = await this.eval(value)

        return {
            editable,
            value,
        }
    }

    private async instanciateClass(cls: ClassConstrReturn["data"], parameters: ParsableObjectList[], forceInstanceName?: string): Promise<string> {
        let instanceName = forceInstanceName
        if(!instanceName) {
            const className = `//instance_${cls.name}`
            const instanceID = Object.keys(this.cache.registered.objects).filter(n => n.startsWith(className)).length
            instanceName = `${className}_${instanceID}`
        }
        //?                                                                       /-> Because `instanceName` has obligatory a number at the end.
        const instanceID = parseInt(/(?<id>\d*)$/.exec(instanceName)?.groups?.id as string)

        const classCache: cacheInterface["registered"]["objects"][string]["data"] = this.cache.registered.objects[instanceName]?.data || {variables: {}, functions: {}, objects: {}}
        /**
         * If true: this instanciate a extend from another class
         * If false: this is a real class instancier
         */
        const isAnExtender = !!this.cache.registered.objects[instanceName]
        this.cache.registered.objects[instanceName] = {data: classCache, class: cls, id: instanceID}

        if(cls.content) {
            const {constructor, properties} = cls.content

            const fcts = properties.filter((p): p is FunctionAsignationReturn => p.type === "function_asignation")
            const vars = properties.filter((p): p is VariableAsignationReturn => p.type === "variable_asignation")
            
            for(const {data} of fcts) {
                if(!data.name) continue
                classCache.functions[data.name] = data
            }
            for(const {data} of vars) {
                if(data.variable.type !== "variable") continue
                classCache.variables[data.variable.data.name] = {editable: !data.constant, value: data.value || UNDEFINED_TYPE}
            }

            const extended: string[] = []
            for await(const name of cls.extends) {
                const extender = await this.eval({type: "variable", data: {name}})
                if(extender.type !== "class_constructor") throw new RaiseFlyLangCompilerError(new InstanciationError(this.currentPosition, "Invalid extender has been given.")).raise()
                
                if(!this.cache.builtin.functions[extender.data.name]) {
                    this.cache.builtin.functions[extender.data.name] = async (...args) => {
                        if(extended.includes(extender.data.name)) throw new RaiseFlyLangCompilerError(new InstanciationError(this.currentPosition, "Class already extended with this object.")).raise()
                        await this.instanciateClass(extender.data, args, instanceName)
                        
                        extended.push(extender.data.name)
                        return {type: "variable", data: {name: "me"}}
                    }
                }else throw new RaiseFlyLangCompilerError(new ExecutionError(this.currentPosition, `${name} has already been declared as a function.`)).raise()
            }

            this.cache.registered.variables["me"] = {editable: false, value: {type: "variable", data: {name: instanceName}}}
            await this.evalFunction(constructor.data,  parameters)
            if(extended.length < cls.extends.length) throw new RaiseFlyLangCompilerError(new InstanciationError(this.currentPosition, "Class extenders has been missed.")).raise()

            if(!isAnExtender) {
                delete this.cache.registered.variables["me"]
                for(const name of extended) delete this.cache.builtin.functions[name]
            }
        }
        return instanceName
    }
    private convertToBoolean(element?: ParsedObject): boolean {
        if(!element) return false
        switch(element.type) {
            case "array": {
                return !!element.data.values.length
            }
            case "number": {
                return !element.data.number.isEqualTo(0)
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
     * Execute an instruction
     * @param instruction The instruction to execute
     * @param referenceMode If true, object's data will be parsed and returns instead a reference of them self
     */
    async eval(instruction: ParsedObject): Promise<ParsableObjectList> {
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
                        if(v.value.type === "variable" && !v.value.data.name.startsWith('//')) return await this.eval(v.value)
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
                const variable = await this.eval({type: "variable", data: {name: data.name}})
                if(variable.type !== "class_constructor") throw new RaiseFlyLangCompilerError(new VariableError(this.currentPosition, `"${data.name}" has not been declared as a class.`)).raise()
                const instanceName = `//instance_${data.name}`
                const instances = Object.keys(this.cache.registered.objects).filter(n => n.startsWith(instanceName)).length
                const className = `${instanceName}_${instances}`

                await this.instanciateClass(variable.data, data.parameters, className)
                return {type: "variable", data: {name: className}}
            }
            case "variable_asignation": {
                const {constant, value, variable} = data

                if(variable.type === "variable") {
                    if(this.cache.registered.variables[variable.data.name]?.editable === false) throw new RaiseFlyLangCompilerError(new asignationError(this.currentPosition, "Variable has been set as a constant.")).raise()
                    this.cache.registered.variables[variable.data.name] = await this.genVariableValue(!constant, value || undefined)
                }else if(variable.type === "array" && value) {
                    const asignationValues = variable.data.values
                    const valueContent = await this.eval(value)
                    if(valueContent.type === "array") {
                        const values = valueContent.data.values.slice(0, asignationValues.length)
                        for(const index in asignationValues) {
                            const variable = asignationValues[index]
                            if(variable.type !== "variable") throw new RaiseFlyLangCompilerError(new asignationError(this.currentPosition, "Invalid deconstructed properties")).raise()

                            await this.eval({type: "variable_asignation", data: {variable, value: values[index], constant}})
                        }
                    }else if(valueContent.type === "object") {
                        for(const variable of asignationValues) {
                            if(variable.type !== "variable") throw new RaiseFlyLangCompilerError(new asignationError(this.currentPosition, "Invalid deconstructed properties")).raise()
                            
                            await this.eval({type: "variable_asignation", data: {variable, value: valueContent.data.values.find(e => e.key === variable.data.name)?.value || UNDEFINED_TYPE, constant}})                            
                        }
                    }
                }else if(variable.type === "attribute_access") {
                    const [keyObject, accesser] = [variable.data.access.at(-1), variable.data.access.slice(0, -1)]
                    const objectWhereDefine = accesser.length ? await this.eval({type: "attribute_access", data: {...variable.data, access: accesser}}) : await this.eval(variable.data.origin.object)

                    const key = keyObject?.fromScript ? await this.eval(keyObject.object) : keyObject?.object
                    const strKey = (
                        key?.type === "variable" ? key.data.name :
                        key?.type === "string" ? stringify(await this.eval(key)) :
                        key?.type === "number" ? key.data.number.toString() : null
                    )
                    if(objectWhereDefine.type === "variable" && objectWhereDefine.data.name.startsWith('//instance')) {
                        //instance = Class object

                        if(!strKey) throw new RaiseFlyLangCompilerError(new AccessError(this.currentPosition, "Invalid key provided.")).raise()
                        const cls = this.cache.registered.objects[objectWhereDefine.data.name]
                        if(value?.type === "function_asignation") {
                            cls.data.functions[strKey] = value.data
                        }else {
                            cls.data.variables[strKey] = await this.genVariableValue(true, value || undefined)
                        }

                    } else if(objectWhereDefine.type === "array" && key?.type === "number") {
                        let index = key.data.number.toNumber()
                        if(index < 0) index = objectWhereDefine.data.values.length - index

                        objectWhereDefine.data.values[index] = await this.eval(value || UNDEFINED_TYPE)
                    } else if(objectWhereDefine.type === "object") {                        
                        if(!strKey) throw new RaiseFlyLangCompilerError(new AccessError(this.currentPosition, "Invalid key provided.")).raise()

                        let index = objectWhereDefine.data.values.findIndex(e => e.key === strKey)
                        if(index < 0) {
                            index = objectWhereDefine.data.values.length
                            objectWhereDefine.data.values.push({key: strKey, value: UNDEFINED_TYPE})
                        }
                        
                        objectWhereDefine.data.values[index].value = (await this.genVariableValue(true, value || UNDEFINED_TYPE)).value
                    }else throw new RaiseFlyLangCompilerError(new AccessError(this.currentPosition, `"${stringify(key || UNDEFINED_TYPE)}" doesn't exist on the object.`)).raise()
                    
                }
                return variable
            }
            case "function_asignation": {
                if(data.name) {
                    delete this.cache.registered.variables[data.name]
                    delete this.cache.registered.objects[data.name]
                    this.cache.registered.functions[data.name] = data
                }
                break;
            }
            case "string": {
                let sentence = ""
                for await(const current of data) {
                    if(current.type === "text") sentence += current.data
                    else {
                        const evaluated = await this.eval(current.data)
                        sentence += (evaluated.type === "string" ? evaluated.data[0].data : stringify(evaluated))
                    }
                }
                return {type: "string", data: [{type: "text", data: sentence}]}
            }
            case "boolean_test": {
                const operators = {
                    first: this.convertToBoolean(await this.eval(data.testers[0])),
                    second: this.convertToBoolean(await this.eval(data.testers[1]))
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
                const getComparableValue = async (obj: ParsableObjectList): Promise<[string, BigNumber] | null> => {                    
                    switch (obj.type) {
                        case "array": {
                            return [JSON.stringify(obj.data.values), new BigNumber(obj.data.values.length)]
                        }
                        case "object": {
                            return [JSON.stringify(obj.data.values.map(e => e.key)), new BigNumber(obj.data.values.length)]
                        }
                        case "string": {
                            const content = (await this.eval(obj) as StringReturn).data[0].data as string // This function parse automatically the string and its content
                            return [content, new BigNumber(content.length)]
                        }
                        case "number": {
                            return [obj.data.number.toString(), obj.data.number]
                        }
                        case "strict_value": {
                            return [!!obj.data.value ? "true" : "false", new BigNumber(!!obj.data.value ? 1 : 0)]
                        }
                    }
                    return null
                }

                const parsed = await Promise.all(data.operators.map(e => this.eval(e)))
                if(data.operators[1].type === "comparaison") {
                    if(this.convertToBoolean(parsed[1])) parsed[1] = await this.eval(data.operators[1].data.operators[0])
                }
                const operators = {
                    first: await getComparableValue(parsed[0]),
                    second: await getComparableValue(parsed[1])
                }
                if(operators.first === null || operators.second === null) throw new RaiseFlyLangCompilerError(new OperationError(this.currentPosition, "Types can't be compared.")).raise()
                
                let res: StrictValueReturn | null = null
                switch(data.comparaison.name) {
                    case "egual": {
                        res= {type: "strict_value", data: {value: operators.first[0] === operators.second[0]}}
                        break;
                    }
                    case "inf": {
                        res= {type: "strict_value", data: {value: operators.first[1].isLessThanOrEqualTo(operators.second[1])}}
                        break;
                    }
                    case "inf_strict": {
                        res= {type: "strict_value", data: {value: operators.first[1].isLessThan(operators.second[1])}}
                        break;
                    }
                    case "sup": {
                        res= {type: "strict_value", data: {value: operators.first[1].isGreaterThanOrEqualTo(operators.second[1])}}
                        break;
                    }
                    case "sup_strict": {
                        res= {type: "strict_value", data: {value: operators.first[1].isGreaterThan(operators.second[1])}}
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
                                const values2 = await Promise.all((operations.second as ArrayReturn).data.values.map(e => this.eval(e)))
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
                                const res = nb1.plus(nb2)
                                
                                return {type: "number", data: {number: res, negative: res.isNegative(), type: res.isInteger() ? "integer" : "float"}}
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
                        const result = numbers[0].data.number.multipliedBy(numbers[1].data.number)
                        return {
                            type: "number", data: {number: result, negative: result.isNegative(), type: result.isInteger() ? "integer" : "float"}
                        }
                    }else {
                        //@ts-ignore Checked above
                        const {data: {number}}: NumberReturn = operations.first.type === "number" ? operations.first : operations.second
                        const obj = operations.first.type === "number" ? operations.second : operations.first
                        switch(obj.type) {
                            case "string": {
                                if(number.isNegative()) return {type: "string", data: []}
                                else {
                                    const str = (await this.eval(obj) as StringReturn).data[0].data as string
                                    return {type: "string", data: [{type: "text", data: str.repeat(number.toNumber())}]}
                                }
                            }
                            case "array": {
                                if(number.isNegative()) return {type: "array", data: {values: []}}
                                else {
                                    const {values} = obj.data
                                    const max = number.toNumber()
                                    for(let i = 1; i < max; i++) {
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
                    if(numbers[1].isEqualTo(0) && (
                        ["eucl_division", "division"].includes(data.operation)
                    )) throw new RaiseFlyLangCompilerError(new OperationError(this.currentPosition, "Division by 0 is not a valid math operation.")).raise()
                    
                    const result = (
                        data.operation === "eucl_division" ? numbers[0].dividedToIntegerBy(numbers[1]) :
                        data.operation === "eucl_rest" ? numbers[0].modulo(numbers[1]) :
                        data.operation === "power" ? numbers[0].pow(numbers[1]) :
                        data.operation === "division" ? numbers[0].dividedBy(numbers[1]) :
                        data.operation === "substraction" ? numbers[0].minus(numbers[1]) : null
                    ) // Multiplication & addition are processed above

                    if(result === null) throw new RaiseFlyLangCompilerError(new CompilerError()).raise()
                    return {type: "number", data: {negative: result.isNegative(), number: result, type: result.isInteger() ? "integer" : "float"}}
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
                    if(number.isNegative()) number = number.plus(values.length)
                    if(number.isGreaterThan(values.length)) throw new RaiseFlyLangCompilerError(new AccessError(this.currentPosition, `Index [${accessValue.data.number}] out of range`)).raise()
                    returnsValue = values[number.toNumber()]
                }else if(originValue.type === "object") { // Access to an object's key
                    const keyName = (
                        accessValue.type === "variable" ? accessValue.data.name : 
                        accessValue.type === "function_call" ? accessValue.data.name :
                        stringify(accessValue, false, false)
                    )
                    const value = await this.eval(originValue.data.values.find(k => k.key === keyName)?.value || UNDEFINED_TYPE)
                    if(value.type !== "strict_value" || value.data.value !== null) returnsValue = value

                    if(returnsValue && accessValue.type === "function_call") {
                        if(returnsValue.type !== "function_asignation") throw new RaiseFlyLangCompilerError(new FunctionError(this.currentPosition, `"${keyName}" is not a function!`)).raise()
                        returnsValue = await this.evalFunction(returnsValue.data, accessValue.data.arguments) || UNDEFINED_TYPE
                    }
                } else if(
                    litteralValue.type === "variable" && (litteralValue.data.name in classes)
                    || originValue.type === "variable" && (originValue.data.name in classes)
                ) { // Access to a class method/property
                    const thenSetMeAs: cacheInterface["registered"]["variables"][string] | undefined = this.cache.registered.variables.me
                    const className = originValue.type === "variable" ? originValue.data.name : (litteralValue as VariableReturn).data.name
                    //?                                                                         \\ This has been tested above //
                    
                    const isRegisteredClass = originValue.type === "variable" && originValue.data.name.startsWith('//instance')
                    const classMethods = classes[className]
                    
                    if(isRegisteredClass) this.cache.registered.variables.me = {editable: false, value: originValue}
                    if(accessValue.type === "variable") {
                        const {variables, functions, objects} = classMethods.data

                        if(accessValue.data.name in variables) {
                            const v = variables[accessValue.data.name]
                            if(typeof v === "function") returnsValue = await v()
                            else returnsValue = await this.eval(v.value)
                        }else if(accessValue.data.name in functions) {
                            const v = functions[accessValue.data.name]
                            if(typeof v === "function") {
                                const fctName = `//builtin_${accessValue.data.name}`
                                this.cache.builtin.functions[`${fctName}`] = v
                                returnsValue = await this.eval({type: "variable", data: {name: `${fctName}`}})
                            }else returnsValue = {type: "function_asignation", data: v}
                        }else if(accessValue.data.name in objects) {
                            const v = objects[accessValue.data.name]
                            const isRegisteredInstance = "class" in v
                            const cacheMemory = isRegisteredInstance ? this.cache.registered : this.cache.builtin
                            
                            const className = `//${isRegisteredInstance ? "instance" : "builtin"}_${accessValue.data.name}`
                            const InstanceName = Object.keys(cacheMemory.objects).filter(n => n.startsWith(className)).find(name => cacheMemory.objects[name].id === v.id) || `${className}_${v.id}`
                            if(!InstanceName) throw new RaiseFlyLangCompilerError(new AccessError(this.currentPosition, "Cannot access to this object.")).raise()

                            cacheMemory.objects[InstanceName] = v
                            returnsValue = {type: "variable", data: {name: InstanceName}}
                        }
                    }else if(accessValue.type === "function_call") {
                        const {functions} = classMethods.data

                        if(accessValue.data.name in functions) {
                            const v = functions[accessValue.data.name]
                            if(typeof v === "function") returnsValue = await v(...accessValue.data.arguments) || UNDEFINED_TYPE
                            else returnsValue = await this.evalFunction(v, accessValue.data.arguments) || UNDEFINED_TYPE
                        }
                    }
                    
                    if(isRegisteredClass) {
                        if(thenSetMeAs) this.cache.registered.variables.me = thenSetMeAs
                        else delete this.cache.registered.variables.me
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

                if(!returnsValue) throw new RaiseFlyLangCompilerError(new AccessError(this.currentPosition, `Invalid attribute/method for type "${originValue.type}".`)).raise()
                if(access.length - 1) returnsValue = await this.eval({type: "attribute_access", data: {origin: {fromScript: false, object: returnsValue}, access: access.slice(1)}})
                if(returnsValue.type === "variable" && !returnsValue.data.name.startsWith('//builtin')) returnsValue = await this.eval(returnsValue)
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

                    let index = new BigNumber(0)
                    while(index.isLessThan(iteratorArray.length)) {
                        let value= iteratorArray[index.toNumber()]

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
                        index= index.plus(1)
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
                    if(this.convertToBoolean(await this.eval(condition))) return await this.process(code, true, true) || UNDEFINED_TYPE
                    else if(ifNot) return await this.eval({type: "if_statement", data: ifNot})
                }else return await this.process(data.code, true, true) || UNDEFINED_TYPE
                
                return UNDEFINED_TYPE
            }
            case "class_constructor": {
                this.cache.registered.variables[data.name] = {editable: true, value: {type, data}}
                break;
            }
            case "import": {
                const {importType, informations} = data
                const importName = importType === "file" ? (data.imported.origin.file || "<unknow>") : data.name
                if(importType === "file") {
                    const {affectedTo} = informations
                    const obj: cacheInterface["registered"]["objects"][string] = this.cache.registered.objects[affectedTo?.data.name || ""] || {
                        data: {functions: {}, objects: {}, variables: {}},
                        class: {name: `//import_${importType}_${importName}`, extends: [], content: null}
                    }

                    const [value, path] = [data.imported.origin.file?.path || "<unknow>", parse(data.imported.origin.file?.path || "")]
                    const intrData = {...this.data}
                    intrData.file.src= {
                        path: {
                            value,
                            parsed: path
                        },
                        content: data.imported.origin.file?.content
                    }
                    const intr = new Interpreter(this.data, false, this.currentPosition)
                    const needToBeReturn = await intr.process(data.imported.content, false, false) || UNDEFINED_TYPE
                    const {registered} = intr.cache
                    
                    const requiring = [...informations.restrictions || []]
                    for(const name in registered.variables) {
                        if(!requiring.length || requiring.includes(name)) {
                            obj.data.variables[name] = {editable: true, value: await this.eval(registered.variables[name].value)}
                        }
                    }
                    for(const name in registered.functions) {
                        if(!requiring.length || requiring.includes(name)) {
                            obj.data.functions[name] = registered.functions[name]
                        }
                    }
                    for(const name in registered.objects) {
                        if(!requiring.length || requiring.includes(name)) {
                            obj.data.objects[name] = registered.objects[name]
                        }
                    }

                    if(affectedTo) this.cache.registered.objects[affectedTo.data.name]= obj
                    else {
                        this.cache.registered.variables= {
                            ...this.cache.registered.variables, ...obj.data.variables
                        }
                        this.cache.registered.functions= {
                            ...this.cache.registered.functions, ...obj.data.functions
                        }
                        this.cache.registered.objects= {
                            ...this.cache.registered.objects, ...obj.data.objects
                        }
                    }

                    return needToBeReturn
                }else { //? Import a builtin module
                    const modFilePath = join(__dirname, './modules/', `${data.name}.js`)
                    try {
                        var moduleFct: ((intr: Interpreter) => Promise<cacheInterface["builtin"]>) | undefined = require(modFilePath)?.default
                        if(!moduleFct) throw 1
                    } catch (_) {
                        throw new RaiseFlyLangCompilerError(new importError(this.currentPosition, `Module ${data.name} has not been found.`)).raise()
                    }
                    const module = await moduleFct(this)                    
                    const {affectedTo, restrictions} = informations

                    if(restrictions) {
                        for(const name in module.variables) {
                            if(!restrictions.includes(name)) delete module.variables[name]
                        }
                        for(const name in module.functions) {
                            if(!restrictions.includes(name)) delete module.functions[name]
                        }
                        for(const name in module.objects) {
                            if(!restrictions.includes(name)) delete module.objects[name]
                        }
                    }

                    if(affectedTo) {
                        const obj: cacheInterface["builtin"]["objects"][string] = this.cache.builtin.objects[affectedTo?.data.name || ""] || {
                            data: {functions: {}, objects: {}, variables: {}},
                            class: {name: `//import_${importType}_${importName}`, extends: [], content: null}
                        }
                        for(const name in module.variables) obj.data.variables[name]= module.variables[name]
                        for(const name in module.functions) obj.data.functions[name]= module.functions[name]
                        for(const name in module.objects) obj.data.objects[name]= module.objects[name]

                        this.cache.builtin.objects[affectedTo.data.name]= obj
                    } else {
                        for(const name in module.variables) this.cache.builtin.variables[name]= module.variables[name]
                        for(const name in module.functions) this.cache.builtin.functions[name]= module.functions[name]
                        for(const name in module.objects) this.cache.builtin.objects[name]= module.objects[name]
                    }
                }

                break;
            }
            case "try_statement": {
                const {try: tryCode, handler} = data
                setAllowErrors(false)
                try {
                    await this.process(tryCode, false, true)
                } catch (err) {
                    if(handler) {
                        await this.evalFunction(handler.data, handler.data.arguments?.length ? [
                            err ? createStringObj(stripAnsi(`${err}`)) : UNDEFINED_TYPE
                        ] : [])

                    }
                }
                setAllowErrors(true)
                break;
            }
            case "number": {
                // After a JSON.parse(JSON.stringify), the number instance is parsed in a string representation of the number
                if(!(data.number instanceof BigNumber)) data.number = new BigNumber(data.number)
                break;
            }
            case "array": {
                for await(const value of data.values) await this.eval(value)
                break
            }
            case "object": {
                for await(const {value} of data.values) await this.eval(value)
                break
            }
            case "comment": {
                return UNDEFINED_TYPE
            }
        }
        return instruction
    }

    /**
     * Execute in order a list of instruction
     * @param instructions An array of instruction to execute
     * @param allowNonStopperResult If there is only one instruction, and it's not a "stopper", if the interpreter should returns it after processed it (default: `true`)
     * @param incrementScope If true, after the execution of the process the interpreter will delete all created variables/functions/...
     * @param scopeVariables The cache variable to set unicly in this scope
     */
    async process(instructions: ParserReturn["content"], allowNonStopperResult= true, incrementScope = true, scopeVariables: cacheInterface["registered"] = {variables: {}, functions: {}, objects: {}}): Promise<ParsableObjectList | void> {
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
                if(!allowNonStopperResult && result.type !== "stopper") result = undefined
            } else {
                for await(const data of instructions) {
                    try {
                        var res = await this.eval(data)
                    } catch (err) {
                        return console.error(`[CRITICAL ERROR]: Map -> ${data.map}\n${err}`)
                    }

                    if(res?.type === "stopper") {
                        result= res
                        break;
                    }
                }
            }
        }

        if(result?.type === "stopper") result.data.return = await this.eval(result.data.return || UNDEFINED_TYPE)
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

    //? In-console mode methods //
    async start_InConsoleMode(): Promise<void> {
        inConsoleMode= true
        const input = await this.consoleModeInput()
        if(input.startsWith('//')) return this.exec_InConsoleCmd(input.slice(2))

        if(input.trim()) {
            this.currentPosition = new Positioner(input, this.currentPosition.asParent, this.currentPosition.file)
            try {
                const evaluated = await this.cache.builtin.functions['eval']({type: "string", data: [{type: "text", data: input}]})
                this.print(stringify(evaluated, true))
            } catch (_) { }
        }

        return this.start_InConsoleMode()
    }
    async consoleModeInput(prefix= "[FLYLANG]", prec = ""): Promise<string> {
        let input = prec + await this.input(prefix + "> ")
        try {
            setAllowErrors(false)
            safeSplit(new Positioner(input))
        } catch (_) {
            return await this.consoleModeInput(`${" ".repeat(prefix.length)}`, `${input}\n`)
        }

        setAllowErrors(true)
        return input
    }

    async exec_InConsoleCmd(cmd: string): Promise<void> {
        const helpCmd = "help -> Display this message\n"
                        + "clear -> Clear the console\n"
                        + "exit -> Exit the console mode"

        switch(cmd) {
            case "help": {
                this.print(helpCmd)
                break;
            }
            case "clear": {
                await this.cache.builtin.objects["std"].data.functions["cls"]()
                this.consoleModeCache.blockNextPrint= false
                break;
            }
            case "exit": {
                return
            }
            default: {
                this.print("This command doesn't exist.")
                break;
            }
        }
        return this.start_InConsoleMode()
    }
}
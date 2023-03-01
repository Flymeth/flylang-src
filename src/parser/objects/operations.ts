import FlyLang, { ParsableObjectList, ParserClassData } from "../parser.js";
import CompilerObject from "./_object.js";
import { variableAcceptedObjects, langRules as rules } from "../../utils/registeries.js";
import { handleRecursiveSeparate, separate } from "../../utils/tools/separate.js";
import RaiseFlyLangCompilerError from "../../errors/raiseError.js";
import { fastSyntaxError } from "../../errors/code/SyntaxError.js";
import Positioner from "../../utils/positioner.js";
import { RegExp_OR } from "../../utils/tools/regExpTools.js";
import Number from "./number.js";
import CompilerError from "../../errors/compiler/CompilerError.js";

const validOperations = rules.operations
const validFastOperations = validOperations.filter(({symbol}) => ["+", "-"].indexOf(symbol) >= 0)
export type OperationReturn = {
    type: "operation",
    data: {
        operation: typeof rules.operations[number]["name"],
        operators: ParsableObjectList[]
    }
}
export default class Operation extends CompilerObject {
    constructor(data: ParserClassData) {
        const operationReg = RegExp_OR(validOperations.map(e => e.symbol))
        super(data, "operation", `15 + 9 - 15`, {
            fast: new RegExp(`(?:.*?(?<!\\${rules.attribute_access_char}\\s*)${operationReg.source}.+)+`),
            detailed: new RegExp(`(?:.*?(?<!\\${rules.attribute_access_char}\\s*)${operationReg.source}.+)+`)
        })
        
        this.bonus_score-= 2
    }

    async parse(code: Positioner): Promise<OperationReturn | null> {
        const operations = validOperations.map(e => e.symbol)
        const separated = separate(code, operations)
        
        if(separated?.length === 1 && separated[0] instanceof Positioner) { // -val; +val
            const [sign, ...data] = separated[0].now
            const thisFastOperation = validFastOperations.find(op => op.symbol === sign)
            if(!thisFastOperation) throw new RaiseFlyLangCompilerError(fastSyntaxError(separated[0], `Invalid syntax. The 'fast operation' can only be ${validFastOperations.map(e => `"${e.symbol}variable"`).join(' or ')}.`))

            const parsedNumber = await new Number(this.data).parse(new Positioner("0"))
            if(!parsedNumber) throw new RaiseFlyLangCompilerError(new CompilerError()).raise()

            const parsedData = await FlyLang.parse(this.data, code.take(data.join('')), variableAcceptedObjects(this.data))
            if(!parsedData) throw new RaiseFlyLangCompilerError(fastSyntaxError(code, "Operand is invalid.")).raise()

            return {
                type: "operation",
                data: {
                    operation: thisFastOperation.name,
                    operators: [
                        parsedNumber,
                        parsedData
                    ]
                }
            }
        }

        const parsed = separated && await handleRecursiveSeparate<OperationReturn>(separated, async (symbol, before, after) => {
            const operation: typeof rules.operations[number] | undefined = validOperations.find(e => e.symbol === symbol.now)
            if(!operation) throw new RaiseFlyLangCompilerError(fastSyntaxError(symbol, "Operator isn't valid."))

            const objects = variableAcceptedObjects(this.data)

            const op1 = (
                before instanceof Positioner
                ? await FlyLang.parse(this.data, before, objects)
                : before
            )
            if(!op1) throw new RaiseFlyLangCompilerError(fastSyntaxError(before instanceof Positioner ? before : code, "Operand is invalid.")).raise()
            
            const op2 = (
                after instanceof Positioner
                ? await FlyLang.parse(this.data, after, objects)
                : after
            )
            
            if(!op2) throw new RaiseFlyLangCompilerError(fastSyntaxError(after instanceof Positioner ? after : code, "Operand is invalid.")).raise()
            
            return {
                type: "operation",
                data: {
                    operation: operation.name,
                    operators: [op1, op2]
                }
            }
        }, operations)
        
        if(!parsed) return new RaiseFlyLangCompilerError(fastSyntaxError(code, "Invalid operation.")).raise()
        return parsed
    }
}
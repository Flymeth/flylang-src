import FlyLang, { ParsableObjectList, ParserClassData } from "../parser.js";
import SyntaxError, { fastSyntaxError } from "../../errors/code/SyntaxError.js";
import RaiseFlyLangCompilerError from "../../errors/raiseError.js";
import { variableAcceptedObjects, langRules as rules } from "../../utils/registeries.js";
import CompilerObject from "./_object.js";
import FunctionAsignation from "./function_asignation.js";
import Positioner from "../../utils/positioner.js";
import { RegExp_OR } from "../../utils/tools/regExpTools.js";
import safeSplit from "../../utils/tools/safeSplit.js";
import { multipleEndsWith } from "../../utils/tools/extremityTester.js";
import Array, { ArrayReturn } from "./array.js";
import Variable, { VariableReturn } from "./variable.js";
import AttrAccess, { AttrAccessReturn } from "./attr_access.js";
import NameError from "../../errors/code/NameError.js";

const operationsString = rules.operations.map(e => e.symbol)
export type VariableNameType = VariableReturn | ArrayReturn | AttrAccessReturn
export type VariableAsignationReturn = {
    type: "variable_asignation",
    data: {
        variable: VariableNameType,
        constant: boolean,
        value: ParsableObjectList | null
    }
}
export default class VariableAsignation extends CompilerObject {
    constructor(data: ParserClassData) {
        const operaters = RegExp_OR(operationsString)
        super(data, "variable_asignation", `my_var: 15`, {
            fast: new RegExp(`.+?\\s*(?:${operaters.source}|:)?\\s*:\\s*.*`, "s"),
            detailed: new RegExp(`(?<name>.+?)\\s*((?<operand>${operaters.source})|(?<constant>:))?\\s*:\\s*(?<value>.+)`, "s")
        })
        
        this.bonus_score+= 1
    }

    async parse(code: Positioner): Promise<VariableAsignationReturn | null> {
        const details = this.regexps.detailed.exec(code.now)
        if(!details || !details.groups?.name) return null
        
        const [name, value] = safeSplit(code, [":"], false, 1)
        const operation = multipleEndsWith(name.now, operationsString)
        if(operation) name.end-= operation.length

        const isConstant = !!details.groups.constant
        if(isConstant) value.start++

        if(isConstant && operation) throw new RaiseFlyLangCompilerError(fastSyntaxError(code, "Cannot perfom operation to a constant variable declaration.")).raise()
        
        const parsedName = await FlyLang.parse(this.data, name, [
            new Variable(this.data), new Array(this.data, [new Variable(this.data)]), new AttrAccess(this.data)
        ]) as VariableNameType | null
        if(!parsedName) throw new RaiseFlyLangCompilerError(fastSyntaxError(code, "Can only set a variable to a variable name or an object's attribute.")).raise()
        if(
            parsedName.type === "variable" && rules.keywords.find(w => w === parsedName.data.name)
            || parsedName.type === "array" && (
                parsedName.data.values.find(v => v.type === "variable" && rules.keywords.find(w => w === v.data.name))
            )
        ) throw new RaiseFlyLangCompilerError(new NameError(name, name.now)).raise()

        const value_code = operation ? new Positioner(`${name.now}${operation}${value.now}`, code) : value

        const parsedValue = await FlyLang.parse(this.data, value_code, [new VariableAsignation(this.data), ...variableAcceptedObjects(this.data).filter(obj => !(obj instanceof FunctionAsignation))])
        if(!parsedValue) new RaiseFlyLangCompilerError(new SyntaxError(value_code)).raise()
        
        return {
            type: "variable_asignation",
            data: {
                variable: parsedName,
                constant: isConstant,
                value: parsedValue
            }
        }

    }
}
import FlyLang, { ParsableObjectList, ParserReturn, ParserClassData } from "../parser.js";
import { RegExp_OR } from "../../utils/tools/regExpTools.js";
import CompilerObject from "./_object.js";
import FunctionAsignation, { FunctionAsignationReturn } from "./function_asignation.js";
import FunctionCall, { FunctionCallReturn } from "./function.js"
import Variable, { VariableReturn } from "./variable.js";
import safeSplit from "../../utils/tools/safeSplit.js";
import RaiseFlyLangCompilerError from "../../errors/raiseError.js";
import { variableAcceptedObjects } from "../../utils/registeries.js";
import { fastSyntaxError } from "../../errors/code/SyntaxError.js";
import Positioner from "../../utils/positioner.js";
import Stopper from "./stoppers.js";
import AttrAccess, { AttrAccessReturn } from "./attr_access.js";

const loop_types = ["while", "until", "for"]

export type LoopsReturn = {
    type: "loop",
    data: {
        type: "while" | "until",
        condition: ParsableObjectList,
        code: ParserReturn["content"]
    } | {
        type: "for",
        iterator: ParsableObjectList,
        executor: FunctionAsignationReturn | VariableReturn | FunctionCallReturn | AttrAccessReturn
    }
}
export default class Loops extends CompilerObject {
    constructor(data: ParserClassData) {
        const typesReg = RegExp_OR(loop_types)
        super(data, "loop", `while(1, echo("lolilol")); for((1,2,3), fn(i, v, echo(i, v)))`, {
            fast: new RegExp(`${typesReg.source}\\s*\\(.+\\)`, "s"),
            detailed: new RegExp(`(?<type>${typesReg.source})\\s*\\((?<inputs>.+)\\)`, "s")
        })
        this.bonus_score+= 2
    }

    async parse(code: Positioner): Promise<LoopsReturn | null> {
        const detailed = this.regexps.detailed.exec(code.now)
        if(
            !(  detailed
                && detailed.groups?.type
                && detailed.groups?.inputs
            )
        ) return null
        
        const {type, inputs} = detailed.groups;
        const loopType: typeof loop_types[number] | undefined = loop_types.find(val => val === type.trim())        
        if(!loopType) return null
        
        const input_code = code.take(inputs)
        const splitted = safeSplit(input_code, [","], false, 1)
        
        if(splitted.length !== 2) throw new RaiseFlyLangCompilerError(fastSyntaxError(input_code, "Loops must have only 2 arguments. One for the condition, and the other one for the execution.")).raise()
        
        this.data.objects.push(new Stopper(this.data, ["loop_breaks"]))
        const [firstArg, secondArg] = splitted
        if(loopType === "for") {
            const iterator = await FlyLang.parse(this.data, firstArg)
            if(!iterator) throw new RaiseFlyLangCompilerError(fastSyntaxError(firstArg))
            
            //@ts-ignore TS can't understand that is just the given class that will parse the code that I give.
            const executor: FunctionAsignationReturn | VariableReturn | FunctionCallReturn | null = await FlyLang.parse(this.data, secondArg, [
                new FunctionAsignation(this.data), new Variable(this.data), new FunctionCall(this.data), new AttrAccess(this.data)
            ])
            if(!executor) throw new RaiseFlyLangCompilerError(fastSyntaxError(secondArg)).raise()

            return {
                type: "loop",
                data: {
                    type: "for",
                    iterator,
                    executor
                }
            }
        }else {
            const condition = await FlyLang.parse(this.data, firstArg, variableAcceptedObjects(this.data))
            if(!condition) throw new RaiseFlyLangCompilerError(fastSyntaxError(firstArg))

            const compiler = new FlyLang({
                type: "manualy", data: this.data
            })
            const code = await compiler.compile(secondArg)
            if(!code) throw new RaiseFlyLangCompilerError(fastSyntaxError(secondArg))

            return {
                type: "loop",
                data: {
                    type: loopType === "while" ? "while" : "until",
                    condition,
                    code: code.content
                }
            }
        }
    }
}
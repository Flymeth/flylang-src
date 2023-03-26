import FlyLang, { ParsableObjectList, ParserClassData } from "../parser.js";
import SyntaxError from "../../errors/code/SyntaxError.js";
import { variableAcceptedObjects } from "../../utils/registeries.js";
import safeSplit from "../../utils/tools/safeSplit.js";
import CompilerObject from "./_object.js";
import Variable from "./variable.js";
import Positioner from "../../utils/positioner.js";
import RaiseCodeError from "../../errors/raiseCodeError.js";
import SplitError from "../../errors/code/splitError.js";

export type FunctionCallReturn = {
    type: "function_call",
    data: {
        name: string,
        arguments: ParsableObjectList[]
    }
}
export default class FunctionCall extends CompilerObject {
    constructor(data: ParserClassData) {
        const {fast} = new Variable(data).regexps
        super(data, "function_call", `foo()`, {
            fast: new RegExp(fast.source + '\\(.*?\\)', "si"),
            detailed: /(?<name>(?:[a-z_])(?<!\.)\w*)\((?<arguments>.*)\)/si
        })
        
        this.bonus_score-= 1
    }

    async parse(code: Positioner): Promise<FunctionCallReturn | null> {
        const details= this.regexps.detailed.exec(code.now)
        if(!details || !details.groups?.name) return null
        const   name= details.groups?.name,
                args= details.groups?.arguments
        ;

        const argsPosition = code.take(args)
        const splitedArgs = safeSplit(argsPosition.split(), [","], false, undefined)
        if(!splitedArgs) throw new RaiseCodeError(argsPosition, new SplitError()).raise()
        
        const parsedArgs= await Promise.all(
            splitedArgs.map(async value => {
                const parsed = await FlyLang.parse(this.data, value, variableAcceptedObjects(this.data))
                if(!parsed) throw new RaiseCodeError(value, new SyntaxError("Invalid argument(s) were given")).raise()
                
                return parsed
            })
        )
        
        return {
            type: "function_call",
            data: {
                name,
                arguments: parsedArgs
            }
        }
    }
}
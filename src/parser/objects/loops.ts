import FlyLang, { ParsableObjectList, ParserReturn, ParserClassData } from "../parser.js";
import { RegExp_OR } from "../../utils/tools/regExpTools.js";
import CompilerObject from "./_object.js";
import safeSplit from "../../utils/tools/safeSplit.js";
import { variableAcceptedObjects } from "../../utils/registeries.js";
import Positioner from "../../utils/positioner.js";
import Stopper from "./stoppers.js";
import SyntaxError from "../../errors/code/SyntaxError.js";
import RaiseCodeError from "../../errors/raiseCodeError.js";

const loop_types = ["while", "until", "for"]

export type LoopsReturn = {
    type: "loop",
    data: {
        type: "while" | "until",
        condition: ParsableObjectList,
        code: ParserReturn["content"]
    } | {
        type: "for",
        iterator: {
            getter: ParsableObjectList,
            /**
             * The variable's name where the iterator's values will be set
             */
            value?: string,
            /**
             * The variable's name where the iterator's values' index will be set
             */
            index?: string
        }
        executor: ParserReturn["content"]
    }
}

const typesReg = RegExp_OR(loop_types)
export const LoopsRegExp = {
    fast: new RegExp(`${typesReg.source}\\s*\\(.+\\)`, "s"),
    detailed: new RegExp(`(?<type>${typesReg.source})\\s*\\((?<inputs>.+)\\)`, "s")
}

export default class Loops extends CompilerObject {
    constructor(data: ParserClassData) {
        super(data, "loop", `while(1, echo("lolilol")); for({1,2,3}, i, v, std.out(i, v))`, LoopsRegExp)
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
        const splitted = safeSplit(input_code, [","], false)
        
        if(
            loopType === "for" && splitted.length > 4
            || (loopType !== "for" && splitted.length !== 2)
        ) throw new RaiseCodeError(input_code, new SyntaxError("Loops must have only 2 arguments. One for the condition, and the other one for the execution. (a 'for' loop can has up to for argument, the iterator, the optional value and/or index, and the execution)")).raise()
        
        this.data.objects.push(new Stopper(this.data, ["loop_breaks", "block_pass"]))
        const compiler = new FlyLang({
            type: "manualy", data: this.data
        })

        const [firstArg, ...secondArgs] = splitted
        if(loopType === "for") {
            const iterator = await FlyLang.parse(this.data, firstArg)
            if(!iterator) throw new RaiseCodeError(firstArg, new SyntaxError())

            const execution = secondArgs.pop()
            const indexVar = secondArgs.length >= 2 ? secondArgs.pop() : undefined
            const valueVar = secondArgs.pop()
            
            const parsedExecution = execution ? (await compiler.compile(execution))?.content : []
            if(!parsedExecution) throw new RaiseCodeError(execution || input_code, new SyntaxError())
            
            return {
                type: "loop",
                data: {
                    type: "for",
                    executor: parsedExecution,
                    iterator: {
                        getter: iterator,
                        value: valueVar?.now.trim(),
                        index: indexVar?.now.trim()
                    }
                }
            }
        }else {
            const condition = await FlyLang.parse(this.data, firstArg, variableAcceptedObjects(this.data))
            if(!condition) throw new RaiseCodeError(firstArg, new SyntaxError())

            const codeArgs = secondArgs[0]
            
            const code = await compiler.compile(codeArgs)
            if(!code) throw new RaiseCodeError(codeArgs, new SyntaxError())

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
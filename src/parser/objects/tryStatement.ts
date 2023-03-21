import Positioner from "../../utils/positioner.js"
import safeSplit from "../../utils/tools/safeSplit.js"
import Parser, { ParsableObjectList, ParserClassData, ParserReturn } from "../parser.js"
import CompilerObject, { ObjectRegexpsType } from "./_object.js"
import FunctionAsignation, { FunctionAsignationReturn } from "./function_asignation.js"


export type TryStatementReturn = {
    type: "try_statement",
    data: {
        try: ParserReturn["content"],
        handler?: FunctionAsignationReturn
    }
}
export const TryStatementRegExp: ObjectRegexpsType = {
    fast: /try\s*\(.*\)(?:else\s*\(.*?\))?/s,
    detailed: /try\s*\(\s*(?<try_code>.*)\s*\)(?:else\s*\(\s*(?:(?<handle_err_arg>\w+)\s*,\s*)?(?<handle_code>.*)\s*\))?/s
}
export default class TryStatement extends CompilerObject {
    constructor(data: ParserClassData) {
        super(data, "try-handle", `try(...)else(myError, ...)`, TryStatementRegExp)
        
        this.bonus_score+= 3
    }

    async parse(content: Positioner): Promise<TryStatementReturn | null> {
        const tryPos = content.split()
        tryPos.start+= tryPos.now.indexOf("try") + 3
        const [tryCode, handlePos] = safeSplit(tryPos.split(), [")"], false, 1)
        if(!tryCode) return null
        tryCode.start++
        tryCode.autoTrim()

        const parser = new Parser({type: "manualy", data: this.data})
        const tryResult = await parser.compile(tryCode.split())
        if(!tryResult) return null

        let handler: FunctionAsignationReturn | undefined= undefined;
        if(handlePos) {
            const customPositioner = new Positioner(`fn ${handlePos.now}`, handlePos)
            const fctParser = new FunctionAsignation(this.data, true)
            const res = await fctParser.parse(customPositioner)
            if(res) {
                res.data.name = null
                handler = res
            }
        }

        return {
            type: "try_statement",
            data: {
                try: tryResult.content,
                handler
            }
        }
    }
}
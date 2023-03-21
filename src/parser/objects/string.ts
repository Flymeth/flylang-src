import Parser, { ParsedObject, ParserClassData } from "../parser.js";
import CompilerObject from "./_object.js";
import Positioner from "../../utils/positioner.js";
import safeSplit from "../../utils/tools/safeSplit.js";
import RaiseFlyLangCompilerError from "../../errors/raiseError.js";
import { fastSyntaxError } from "../../errors/code/SyntaxError.js";
import { variableAcceptedObjects, langRules as rules } from "../../utils/registeries.js";
const {string, string_data} = rules

export type StringReturn = {
    type: "string",
    data: ({
        type: "text",
        data: string
    } | {
        type: "data",
        data: ParsedObject
    })[]
}
export default class String extends CompilerObject {
    constructor(data: ParserClassData) {        
        super(data, "string", `"Hey i'm Flymeth and i love this language!"`, {
            fast: new RegExp(`([${string.openner.join("")}]).*\\1`, 's'),
            detailed: new RegExp(`(?<char>[${string.openner.join("")}])(?<content>.*)\\k<char>`, 's')
        })
        
        this.bonus_score+= 2
    }
    
    private endingWithCharSkip(str: string): boolean {
        let number = 0
        while(str.length >= number && str[str.length - number -1] === "\\") number++
        return !!number && number%2 !== 0
    }

    private async parseStringPortion(position: Positioner): Promise<StringReturn["data"]> {
        const res = (
            position.now.startsWith(string_data.openner)
            ? [position.split().take(''), position.split().take(position.now.slice(string_data.openner.length))]
            : safeSplit(position, [string_data.openner], false, 1, {
                block: true,
                comment: true,
                object: true,
                string: true
            })
        )        
        
        if(res.length === 1) {
            const txt = res[0].now
            return txt ? [{
                type: "text",
                data: txt
            }] : []
        }
        const [text_before_value, data_after_oppener] = res
        const beforeTxt = text_before_value.now
        if(this.endingWithCharSkip(beforeTxt)) { // for exemple: "hello \&(number)" should not display the content of the "number" variable
            const text = text_before_value.global
            return [{
                type: "text",
                data: text
            }, ...await this.parseStringPortion(data_after_oppener)]
        }
        
        const requiresSplitData = data_after_oppener.asParent        
        requiresSplitData.start-- // Include the "(" character
        const [text_data, text_after_closer] = safeSplit(requiresSplitData.split(), [string_data.closer], false, 1)
        text_data.start++ // Exclude the "(" character
        
        const parsedData: ParsedObject | null = await Parser.parse(this.data, text_data.autoTrim().split(), variableAcceptedObjects(this.data))
        if(!parsedData) throw new RaiseFlyLangCompilerError(fastSyntaxError(text_data, "Invalid in-string data")).raise()
        parsedData.map = text_data.asOriginal.indexes
        
        const data: StringReturn["data"] = beforeTxt ? [{
            type: "text", data: beforeTxt
        }] : []
        data.push({type: "data", data: parsedData})

        if(text_after_closer) data.push(...await this.parseStringPortion(text_after_closer))
        return data
    }

    async parse(code: Positioner): Promise<StringReturn | null> {
        const details = this.regexps.detailed.exec(code.now)
        if(!details || typeof details.groups?.content !== "string") return null
        const {content} = details.groups
        
        const data: StringReturn["data"] = content ? await this.parseStringPortion(code.take(content)) : []
        
        return {
            type: "string",
            data
        }
    }
}
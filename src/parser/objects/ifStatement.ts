import FlyLang, { ParserReturn, ParsableObjectList, ParserClassData } from "../parser.js";
import CompilerObject from "./_object.js";
import safeSplit, { createSplitError } from "../../utils/tools/safeSplit.js";
import { multipleEndsWith } from "../../utils/tools/extremityTester.js";
import RaiseFlyLangCompilerError from "../../errors/raiseError.js";
import { variableAcceptedObjects, langRules as rules } from "../../utils/registeries.js";
import Positioner from "../../utils/positioner.js";
import SyntaxError, { fastSyntaxError } from "../../errors/code/SyntaxError.js";

type IfElseObjectType = {
    type: "if",
    condition: ParsableObjectList,
    code: ParserReturn["content"],
    else?: IfElseObjectType
} | {
    type: "else",
    code: ParserReturn["content"]
}
export type ifStatementReturn = {
    type: "if_statement",
    data: IfElseObjectType
}
export default class ifStatement extends CompilerObject {
    constructor(data: ParserClassData) {
        super(data, "if", `if(condition, echo("condition passed"))`, {
            fast: /if\s*\(.+?,.*\)(?:\s*else.+)*/s,
            detailed: /if\s*\(\s*(?<condition>.+?)\s*,\s*(?<requires_parsing>.*)/s
        })

        this.bonus_score+= 3
    }

    /**
     * Parse a block code
     * Note that the block needs to end with a ")" but starts directly with the code
     * @exemple
     * ```fly
     *      #(
     *          This comment is inside the block (and the there is no "(" that opens the block)
     *      )
     *      variable: value
     * )
     * ```
     * ^
     * 
     * Here we close the main block
     */
    private async parseBlock(block: Positioner): Promise<{result: ParserReturn["content"], next?: Positioner} | null> {
        const { block: block_borns } = rules
        const closerIndex = block_borns.closer.indexOf(multipleEndsWith(block.now, block_borns.closer) || "")
        if(closerIndex < 0) return null

        const openner = block_borns.openner[closerIndex]
        const splitted = safeSplit(
            new Positioner(openner + block.now, block),
            block_borns.closer,
            undefined,
            1
        )
        
        if(!splitted) return new RaiseFlyLangCompilerError(createSplitError(block)).raise()        
        const executable = splitted.shift()
        if(!executable) return new RaiseFlyLangCompilerError(createSplitError(block)).raise()        
        executable.start+= openner.length
        
        const parser = new FlyLang({
            type: "manualy",
            data: this.data
        })

        const code= await parser.compile(executable)
        if(!code) return null // This is useless but typescript can't understand...
        
        return {
            result: code.content,
            next: splitted[0]
        }
    }

    private async parseElse(code: Positioner): Promise<IfElseObjectType | null> {
        const reg = /\s*else\s*(?:(?<is_elif>if.+)|(?<simple_else>\((?<requires_parsing>.+)))/s
        const regRes = reg.exec(code.now)
        if(!regRes || !(regRes.groups?.is_elif || regRes.groups?.requires_parsing)) throw new RaiseFlyLangCompilerError(new SyntaxError(code))
        
        const {is_elif, requires_parsing} = regRes.groups
        if(is_elif) {
            const elif = code.split()
            elif.start = code.now.indexOf(is_elif)
            elif.end = elif.start + is_elif.length
            return this.parseIf(elif)
        }
        else {
            const pos = code.split()
            pos.start = code.now.indexOf(requires_parsing)
            pos.end = pos.start + requires_parsing.length
            const block = await this.parseBlock(pos)
            if(!block || block.next?.autoTrim().now) throw new RaiseFlyLangCompilerError(new SyntaxError(pos, "'else (...)' must be the last block of your if/else statement."))
            const {result} = block
            return {
                type: "else",
                code: result
            }
        }
    }

    private async parseIf(pos: Positioner): Promise<IfElseObjectType | null> {        
        const ifRegRes = this.regexps.detailed.exec(pos.now)
        if( !ifRegRes 
            || ifRegRes.index
            || !ifRegRes.groups?.condition
            || !ifRegRes.groups?.requires_parsing
        ) return null;        
        
        const condition = pos.split()
        condition.start = pos.now.indexOf(ifRegRes.groups.condition)
        condition.end = condition.start + ifRegRes.groups.condition.length
        const parsedCondition = await FlyLang.parse(this.data, condition, variableAcceptedObjects(this.data))
        if(!parsedCondition) return null
        
        const requires_parsing= pos.split()
        requires_parsing.start = pos.now.indexOf(ifRegRes.groups.requires_parsing)
        requires_parsing.end= requires_parsing.start + ifRegRes.groups.requires_parsing.length        
        const block = await this.parseBlock(requires_parsing)
        if(!block) throw new RaiseFlyLangCompilerError(fastSyntaxError(requires_parsing)).raise()

        const {result, next} = block

        const object: IfElseObjectType = {
            type: "if",
            condition: parsedCondition,
            code: result,
        }

        if(next?.autoTrim().now) {
            const parsedElse = await this.parseElse(next)
            if(!parsedElse) return null
            object["else"]= parsedElse
        }
        return object
    }

    async parse(positioner: Positioner): Promise<ifStatementReturn | null> {
        const parsed = await this.parseIf(positioner)
        if(!parsed) return null
        
        return {
            type: "if_statement",
            data: parsed
        }
    }
}
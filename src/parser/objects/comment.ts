import { ParserClassData } from "../parser.js";
import CompilerObject from "./_object.js";
import { RegExp_OR } from "../../utils/tools/regExpTools.js";
import Positioner from "../../utils/positioner.js";
import { langRules as rules } from "../../utils/registeries.js"

export type CommentaryReturn = {
    type: "comment",
    data: {
        message: string
    }
}

const opennersReg = RegExp_OR(rules.comments.openner)
const closerReg = RegExp_OR(rules.comments.closer)
export const CommentaryRegexps = {
    fast: new RegExp(`(?:${opennersReg.source}{2}.*?$)|(?:${opennersReg.source}(?:.|\\s)+?${closerReg.source})`, "m"),
    detailed: new RegExp(`(?:${opennersReg.source}{2}\\s*(?<inlineContent>.*?)\\s*$)|(?:${opennersReg.source}\\s*(?<blockContent>(?:.|\\s)+?)\\s*${closerReg.source})`, "m")
}

export default class Commentary extends CompilerObject {
    constructor(data: ParserClassData) {
        super(data, "comment", `#(Hey this texte is a commentary!)`, CommentaryRegexps)
        this.bonus_score+= 10
    }

    async parse(code: Positioner): Promise<CommentaryReturn | null> {
        const details = this.regexps.detailed.exec(code.now)
        if(!details) return null

        const content = details?.groups?.inlineContent || details?.groups?.blockContent
        return {
            type: "comment",
            data: {
                message: content?.trim() || ""
            }
        }
    }
}
import Positioner from "../../utils/positioner.js"
import { ParsableObjectList, ParserClassData } from "../parser.js"

export type ObjectRegexpsType = {
    fast: RegExp,
    detailed: RegExp
}
export default class CompilerObject {
    help: {
        type: string,
        exemple: string
    }
    bonus_score: number
    regexps: ObjectRegexpsType
    data: ParserClassData
    testedScore: number
    constructor(data: ParserClassData, type: string, exemple: string, regexps: ObjectRegexpsType) {
        this.help = {type, exemple}
        this.regexps = regexps
        this.bonus_score = 0
        this.data= data
        this.testedScore= -Infinity
    }

    private setScore(score: number) {
        this.testedScore= score
        return score
    }

    testScore(tester: string): number {
        const regRes = this.regexps.fast.exec(tester)
        if(!regRes || regRes.index || regRes[0].length < tester.length) return this.setScore(-Infinity)
        const score = regRes[0].length - regRes.index + this.bonus_score

        // console.log(tester, score, this.help.type);
        
        return this.setScore(score)
    }
    async parse(content: Positioner): Promise<ParsableObjectList | null> { return null }
}
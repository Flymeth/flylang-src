import Positioner from "../../utils/positioner.js";
import { ParserClassData } from "../parser.js";
import CompilerObject from "./_object.js";

export type NumberReturn = {
    type: "number",
    data: {
        type: "float" | "integer",
        negative: boolean,
        number: number
    }
}
export default class Number extends CompilerObject {
    constructor(data: ParserClassData) {
        super(data, "number", `125 or 153.5 or 94_005_000`, {
            fast: /[+-]?(?:\d_?)*(?:\.(?:\d_?)+)?/,
            detailed: /(?<sign>[+-])?(?<integer>(?:\d_?)+)?(?:\.(?<float>(?:\d_?)+))?/
        })
        
        this.bonus_score+= 1
    }

    async parse(code: Positioner): Promise<NumberReturn | null> {
        const details = this.regexps.detailed.exec(code.now)
        if(!details?.[0].length) return null

        const   integer= details.groups?.integer,
                float= details.groups?.float,
                negative= details.groups?.sign === "-";
        const number: number = 
            eval(`${integer?.replaceAll('_', '') || "0"}.${float?.replaceAll('_', '') || "0"}`) // If the number is "15.0", it will returns "15"
            * (negative ? -1 : 1) // If the number is negative
        const type = number.toString().includes('.') ? "float" : "integer"
        
        return {
            type: "number",
            data: {
                type,
                negative,
                number
            }
        }
    }
}
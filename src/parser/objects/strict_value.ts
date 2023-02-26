import Positioner from "../../utils/positioner.js";
import { ParserClassData } from "../parser.js";
import CompilerObject from "./_object.js";

const allowedKeyword = ["unset", "false", "true"]
export type StrictValueReturn = {
    type: "strict_value",
    data: {
        value: null | boolean
    }
}
export default class StrictValue extends CompilerObject {
    constructor(data: ParserClassData) {
        super(data, "strict_value", `unset, true, false`, {
            fast: new RegExp(allowedKeyword.join('|')),
            detailed: new RegExp(`(?<value>${allowedKeyword.join('|')})`)
        })
        this.bonus_score+= 2
    }

    async parse(code: Positioner): Promise<StrictValueReturn | null> {
        const details = this.regexps.detailed.exec(code.now)
        if(!details || !details.groups?.value) return null
        const str_value = details.groups.value
        const values: {[key: string]: StrictValueReturn["data"]["value"]} = {
            "unset": null,
            "false": false,
            "true": true
        }

        return {
            type: "strict_value",
            data: {
                value: values[str_value]
            }
        }
    }
}
import Parser, { ParsableObjectInformations, ParsableObjectList, ParserClassData } from "../parser.js";
import CompilerObject from "./_object.js";
import Positioner from "../../utils/positioner.js";
import safeSplit from "../../utils/tools/safeSplit.js";
import { variableAcceptedObjects, langRules as rules } from "../../utils/registeries.js";
import SyntaxError from "../../errors/code/SyntaxError.js";
import { multipleEndsWith, multipleStartsWith } from "../../utils/tools/extremityTester.js";
import RaiseCodeError from "../../errors/raiseCodeError.js";

type AttrAccessDataItem = {
    fromScript: boolean,
    object: ParsableObjectList
}
export type AttrAccessReturn = {
    type: "attribute_access",
    data: {
        origin: AttrAccessDataItem,
        access: AttrAccessDataItem[]
    }
}
export const AttrAccessRegExps = {
    fast: new RegExp(`\\w+(?:\\s*\\${rules.attribute_access_char}\\s*[+-]?\\w+(?:\\s*\\((?:\\w+|,)*\\))?)+`, 'is'),
    detailed: new RegExp(`(?<origin>\\w+)(?:\\s*\\${rules.attribute_access_char}\\s*[+-]?\\w+(?:\\s*\\((?:\\w+|,)*\\))?)+`, 'is')
}
export default class AttrAccess extends CompilerObject {
    constructor(data: ParserClassData) {
        super(data, "attribute_access", `my_var.attr.function()`, AttrAccessRegExps)
        this.bonus_score-= 3
    }

    async parse(content: Positioner): Promise<AttrAccessReturn | null> {
        const data = safeSplit(content.autoTrim().split(), [rules.attribute_access_char])

        const access: AttrAccessReturn["data"]["access"] = []
        for await(const pos of data) {
            const obj = await Parser.parse(this.data, pos, variableAcceptedObjects(this.data, true))
            if(!obj) throw new RaiseCodeError(pos,  new SyntaxError("Invalid syntax for accessing to an attribute.")).raise()
            
            let fromScriptTester = pos.global.trim()
            if(fromScriptTester.endsWith('.')) fromScriptTester = fromScriptTester.slice(0, fromScriptTester.length - 1)
            access.push({
                fromScript: !!(multipleStartsWith(fromScriptTester, rules.block.openner) && multipleEndsWith(fromScriptTester, rules.block.closer)),
                object: obj
            })
        }

        const origin = access.shift()
        if(!origin) throw new RaiseCodeError(content, new SyntaxError("Invalid origin of attribute accessor")).raise()
        return {
            type: "attribute_access",
            data: {
                origin,
                access
            }
        }
    }
}
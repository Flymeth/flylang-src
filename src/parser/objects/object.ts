import FlyLang, { ParsableObjectList, ParserClassData } from "../parser.js";
import { RegExp_OR } from "../../utils/tools/regExpTools.js";
import CompilerObject from "./_object.js";
import safeSplit from "../../utils/tools/safeSplit.js";
import { variableAcceptedObjects, langRules as rules } from "../../utils/registeries.js";
import Positioner from "../../utils/positioner.js";
import RaiseCodeError from "../../errors/raiseCodeError.js";
import SyntaxError from "../../errors/code/SyntaxError.js";

export type DictObjectReturn = {
    type: "object",
    data: {
        values: {key: string, value: ParsableObjectList}[]
    }
}
export default class DictObject extends CompilerObject {
    constructor(data: ParserClassData) {
        const { objects } = rules
        const opener = RegExp_OR(objects.openner)
        const closer = RegExp_OR(objects.closer)

        super(data, "object", `(my_key: true, another: 15)`, {
            fast: new RegExp(`${opener.source}(?:\\s*\\w*\\s*:.*)+${closer.source}`, "si"),
            detailed: new RegExp(`${opener.source}\\s*(?<items>(?:\\s*\\w*\\s*:.*)+)\\s*${closer.source}`, "si")
        })
        
        this.bonus_score+= 2;
    }

    async parse(code: Positioner): Promise<DictObjectReturn | null> {
        const detailed = this.regexps.detailed.exec(code.now)
        if( !(
            detailed
            && detailed.groups?.items
        )) return null

        if(detailed.groups.items?.trim() === ":") return {
            type: "object",
            data: {
                values: []
            }
        }
        
        const items_code = code.take(detailed.groups.items).autoTrim()
        const splitted = safeSplit(items_code, [","])
        const items: DictObjectReturn["data"]["values"] = []
        
        if(splitted.length) {
            for await(const value of splitted) {                
                const splittedVal = value.autoTrim(undefined, true, false).now.startsWith(':') ? [
                    null, (() => {
                        value.start++; return value.split()
                    })()
                ] : safeSplit(value, [":"], false, 1)
                if(!splittedVal) throw new RaiseCodeError(value, new SyntaxError("Invalid object syntax.")).raise()
                
                const [key, val] = splittedVal.map(e => e?.split().autoTrim(rules.trim_chars.concat(",")))
                if(!val) throw new RaiseCodeError(value, new SyntaxError("This is not a valid object value.")).raise()
                
                const parsedVal = await FlyLang.parse(this.data, val, variableAcceptedObjects(this.data))
                if(!parsedVal) throw new RaiseCodeError(val, new SyntaxError("Invalid object syntax.")).raise()
    
                items.push({
                    key: key?.now.trim() || val.now.trim(),
                    value: parsedVal
                })
            }
        }

        return {
            type: "object",
            data: {
                values: items
            }
        }
    }
}
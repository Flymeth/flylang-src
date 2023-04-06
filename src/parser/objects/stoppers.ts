import FlyLang, { ParsableObjectList, ParserClassData } from "../parser.js";
import CompilerObject from "./_object.js";
import { variableAcceptedObjects, langRules as rules } from "../../utils/registeries.js";
import Positioner from "../../utils/positioner.js";
import RaiseCodeError from "../../errors/raiseCodeError.js";
import SyntaxError from "../../errors/code/SyntaxError.js";

type rulesStoppersKeys= keyof (typeof rules.stoppers)
export type StopperReturn = {
    type: "stopper",
    data: {
        type: rulesStoppersKeys,
        /**
         * 0= Execute the stopper at the current scope
         * -1= Execute the stopper at the current scope + the one down itself
         * -2= ...
         */
        scope: number,
        return: ParsableObjectList | null
    }
}

export default class Stopper extends CompilerObject {
    constructor(data: ParserClassData, types?: rulesStoppersKeys[]) {
        //@ts-ignore
        const valid_types: rulesStoppersKeys[]= types || Object.keys(rules.stoppers)
        const code_type: string[] = []
        for(const name of valid_types) code_type.push(rules.stoppers[name])

        super(data, "stopper", `return 0 or break; pass (..<e> to execute the block passor in the above scope)`, {
            fast: new RegExp(`(?:\\.\\.)*(?:${code_type.join("|")})(?:[ \\t]+(?:.+))?`, "s"),
            detailed: new RegExp(`(?<pass_above>(?:\\.\\.)*)(?<type>${code_type.join("|")})(?:[ \\t]+(?<data>.+))?`, "s")
        })

        this.bonus_score+= 2
    }

    async parse(code: Positioner): Promise<StopperReturn | null> {
        const details = this.regexps.detailed.exec(code.now)
        if(!details || !details?.groups?.type) return null

        const   type = details.groups?.type?.trim(),
                data = details.groups?.data
        ;
        const index = Object.values(rules.stoppers).indexOf(type)
        //@ts-ignore Trust me
        const type_name: rulesStoppersKeys = Object.keys(rules.stoppers)[index]

        const return_code = data ? code.take(data) : null
        const parsedData = return_code ? await FlyLang.parse(this.data, return_code, variableAcceptedObjects(this.data)) : null
        if(data && !parsedData) return null
        
        const useAtScopes = details.groups.pass_above.length /2 // Returns a integer because of the regular expression of this object
        return {
            type: "stopper",
            data: {
                type: type_name,
                scope: useAtScopes,
                return: parsedData
            }
        }
    }
}
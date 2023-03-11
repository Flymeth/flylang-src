import FlyLang, { ParsableObjectInformations, ParsableObjectList, ParserClassData } from "../parser.js";
import CompilerObject from "./_object.js";
import { RegExp_OR } from "../../utils/tools/regExpTools.js";
import safeSplit, { createSplitError } from "../../utils/tools/safeSplit.js";
import RaiseFlyLangCompilerError from "../../errors/raiseError.js";
import { variableAcceptedObjects, langRules as rules } from "../../utils/registeries.js";
import Positioner from "../../utils/positioner.js";
import { fastSyntaxError } from "../../errors/code/SyntaxError.js";

export type ArrayReturn = {
    type: "array",
    data: {
        values: ParsableObjectList[]
    },
}

const { objects } = rules                
const opener = RegExp_OR(objects.openner)
const closer = RegExp_OR(objects.closer)
export const ArrayRegExps = {
    fast: new RegExp(`${opener.source}.*${closer.source}`, "si"),
    detailed: new RegExp(`${opener.source}(?<items>.*)${closer.source}`, "si")
}
export default class Array extends CompilerObject {
    restrictedWith?: CompilerObject[]

    constructor(data: ParserClassData, restriction?: CompilerObject[]) {
        super(data, "array", `{0, 12, 3}`, ArrayRegExps)
        
        this.restrictedWith = restriction
        this.bonus_score-= 1
    }

    async parse(position: Positioner): Promise<ArrayReturn | null> {
        const code= position.now
        const detailed = this.regexps.detailed.exec(code)

        if(!(
            detailed
            && typeof detailed.groups?.items === "string"
        )) return null
        position.start += position.now.indexOf(detailed.groups.items)
        position.end = position.start + detailed.groups.items.length;
                    
        const items = position.split().autoTrim()

        const splitted = safeSplit(items, [","])
        if(!splitted) return new RaiseFlyLangCompilerError(createSplitError(position)).raise()
        
        const parsedItems: ParsableObjectList[] = []
        for(const value of splitted) {
            const parsed = await FlyLang.parse(this.data, value.autoTrim(), this.restrictedWith  || variableAcceptedObjects(this.data))
            if(!parsed) return new RaiseFlyLangCompilerError(fastSyntaxError(value, "Invalid item specified.")).raise()
            parsedItems.push(parsed)
        }

        return {
            type: "array",
            data: {
                values: parsedItems
            }
        }
    }
}
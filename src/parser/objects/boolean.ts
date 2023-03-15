import FlyLang, { ParsableObjectList, ParserClassData } from "../parser.js";
import CompilerObject from "./_object.js";
import Number from "./number.js";
import RaiseFlyLangCompilerError from "../../errors/raiseError.js";
import { handleRecursiveSeparate, separate } from "../../utils/tools/separate.js";
import { variableAcceptedObjects, langRules as rules } from "../../utils/registeries.js";
import { fastSyntaxError } from "../../errors/code/SyntaxError.js";
import Positioner from "../../utils/positioner.js";
import { multipleStartsWith } from "../../utils/tools/extremityTester.js";

export type BooleanTestReturn = {
    type: "boolean_test",
    data: {
        test: keyof typeof rules.boolean_symbols, // rules.boolean_symbols keys
        testers: ParsableObjectList[]
    }
}
export default class BooleanTest extends CompilerObject {
    constructor(data: ParserClassData) {
        const boolChars= Object.values(rules.boolean_symbols)
        const invalidCharAfterCompSymb= [
            ...Object.values(rules.comparaisons).filter(v => v.length === 1),
            ...boolChars,
            ":"
        ]
        super(data, "boolean_test", `1 ~ 0 or !5 or 15 ! 5 (= 15 XOR 5)`, {
            fast: new RegExp(`.*?(?:[${boolChars.join("")}])(?!\s*[${invalidCharAfterCompSymb.join("")}]).+`, "si"),
            detailed: new RegExp(`(?<tester_secondary>.*?)\s*(?<test>[${boolChars.join("")}])\s*(?<tester_primary>.+)`, "si")
        })
        
        this.bonus_score-= 3
    }

    async parse(position: Positioner): Promise<BooleanTestReturn | null> {
        const symbols = Object.values(rules.boolean_symbols)
        let separated = separate(position, symbols)
        if(!separated) return new RaiseFlyLangCompilerError(fastSyntaxError(position)).raise()

        if(separated.length === 1) {
            position.autoTrim()
            const char = multipleStartsWith(position.now, symbols)
            if(!char) return null
            const charPositioner = position.split().take(char)
            const before = position.split()
            before.start= 0
            before.end = 0

            const after = position.split()
            after.start+= char.length // Because the char is at the begining of the given positioner ("+" because we called the "autoTrim" method)
            after.end = after.global.length
            separated = [before, charPositioner, after]
        }        

        const res = await handleRecursiveSeparate<BooleanTestReturn>(separated, async (booleanSymb, before, after) => {
            const beforeParsed= ( 
                before instanceof Positioner
                ? ( before.autoTrim().now
                    ? await FlyLang.parse(this.data, before, variableAcceptedObjects(this.data))
                    : await new Number(this.data).parse(new Positioner("1"))
                )
                : before
            )
            if(!beforeParsed) return null

            const afterParsed= (
                after instanceof Positioner
                ? await FlyLang.parse(this.data, after, variableAcceptedObjects(this.data))
                : after
            )
            if(!afterParsed) return null

            const testIndex= Object.values(rules.boolean_symbols).indexOf(booleanSymb.now)
            if(testIndex < 0) return null
            //@ts-ignore
            const test: BooleanTestReturn["data"]["test"] = Object.keys(rules.boolean_symbols)[testIndex]

            return {
                type: "boolean_test",
                data: {
                    test,
                    testers: [beforeParsed, afterParsed]
                }
            }
        })
        
        return res
    }
}
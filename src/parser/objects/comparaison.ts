import FlyLang, { ParsableObjectList, ParserClassData } from "../parser.js";
import CompilerObject from "./_object.js";
import { handleRecursiveSeparate, separate } from "../../utils/tools/separate.js";
import { variableAcceptedObjects, langRules as rules } from "../../utils/registeries.js";
import SyntaxError from "../../errors/code/SyntaxError.js";
import Positioner from "../../utils/positioner.js";
import RaiseCodeError from "../../errors/raiseCodeError.js";

type CompKeysType = keyof (typeof rules.comparaisons)
export type ComparaisonReturn = {
    type: "comparaison",
    data: {
        comparaison: {
            name: CompKeysType,
            invert: boolean
        },
        operators: ParsableObjectList[]
    }
}
export default class Comparaison extends CompilerObject {
    constructor(data: ParserClassData) {
        const comp_symbols= Object.values(rules.comparaisons)

        super(data, "comparaison", `foo = foo1 or 2 < 3 or 2 >= 9`, {
            fast: new RegExp(`.+?\\s*${rules.invertion_char}?\\s*(?:${comp_symbols.map(char => `(?:${char})`).join("|")})\\s*.+`, 's'),
            detailed: new RegExp(`(?<operator1>.+?)\\s*(?<invert>${rules.invertion_char})?\\s*(?<type>${comp_symbols.map(char => `(?:${char})`).join("|")})\\s*(?<operator2>.+)`, 's')
        })

        this.bonus_score-= 3
    }

    async parse(code: Positioner): Promise<ComparaisonReturn | null> {
        const comparators = Object.values(rules.comparaisons)
        comparators.unshift(...comparators.map(char => rules.invertion_char + char))
        const separated = separate(code, comparators)
        if(!separated) throw new RaiseCodeError(code, new SyntaxError()).raise()
        
        return await handleRecursiveSeparate<ComparaisonReturn>(separated, async (comparator, operand1, operand2) => {
            const op1 = (
                operand1 instanceof Positioner
                ? await FlyLang.parse(this.data, operand1, variableAcceptedObjects(this.data))
                : operand1
            )
            if(!op1) return null
            
            const op2 = (
                operand2 instanceof Positioner
                ? await FlyLang.parse(this.data, operand2, variableAcceptedObjects(this.data))
                : operand2
            )
            if(!op2) return null

            const invert = comparator.now.startsWith(rules.invertion_char)
            if(invert) comparator.start++
            
            const comparaison_type_index= Object.values(rules.comparaisons).indexOf(comparator.autoTrim().now)
            if(comparaison_type_index < 0) return null
            //@ts-ignore Trust me
            const comparaison_name: CompKeysType= Object.keys(rules.comparaisons)[comparaison_type_index]
            
            return {
                type: "comparaison",
                data: {
                    comparaison: {
                        name: comparaison_name,
                        invert
                    },
                    operators: [op1, op2]
                }
            }
        })
    }
}
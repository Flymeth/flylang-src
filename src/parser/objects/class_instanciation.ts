import { fastSyntaxError } from "../../errors/code/SyntaxError.js";
import RaiseFlyLangCompilerError from "../../errors/raiseError.js";
import Positioner from "../../utils/positioner.js";
import { variableAcceptedObjects } from "../../utils/registeries.js";
import safeSplit from "../../utils/tools/safeSplit.js";
import Parser, { ParsableObjectList, ParserClassData } from "../parser.js";
import CompilerObject from "./_object.js";

export type ClassInstanciationReturn = {
    type: "class_instanciation",
    data: {
        name: string,
        parameters: ParsableObjectList[]
    }
}
export default class ClassInstanciation extends CompilerObject {
    constructor(data: ParserClassData) {
        super(data, "class_instanciation", `new MyClass()`, {
            fast: /new\s*[a-z_]\w*\s*\(.*\)/i,
            detailed: /new\s*(?<name>[a-z_]\w*)\s*\((?<properties>.*)\)/i
        })

        this.bonus_score+= 1
    }

    async parse(code: Positioner): Promise<ClassInstanciationReturn | null> {
        const detailed = this.regexps.detailed.exec(code.now)
        if(!detailed || !detailed.groups?.name) return null
        const   className = detailed.groups.name,
                props = detailed.groups.properties
        ;

        const classProperties = await Promise.all(safeSplit(code.take(props), [","]).map(async v => {
            const parsed = await Parser.parse(this.data, v, variableAcceptedObjects(this.data))
            if(!parsed) throw new RaiseFlyLangCompilerError(fastSyntaxError(v, "Invalid syntax.")).raise()
            return parsed
        }))

        return {
            type: "class_instanciation",
            data: {
                name: className,
                parameters: classProperties
            }
        }
    }
}
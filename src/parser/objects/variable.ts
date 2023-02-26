import Positioner from "../../utils/positioner.js";
import { ParserClassData } from "../parser.js";
import CompilerObject from "./_object.js";

export type VariableReturn = {
    type: "variable",
    data: {
        name: string,
    }
}
export default class Variable extends CompilerObject {
    constructor(data: ParserClassData) {
        super(data, "variable", `my_var`, {
            fast: /[a-z_]\w*/i,
            detailed: /(?<variable>[a-z_]\w*)/i
        })
    }

    async parse(code: Positioner): Promise<VariableReturn | null> {
        const details = this.regexps.detailed.exec(code.now)
        if(!details || !details.groups?.variable) return null
        const variable = details.groups.variable
        
        return {
            type: "variable",
            data: {
                name: variable
            }
        }
    }
}
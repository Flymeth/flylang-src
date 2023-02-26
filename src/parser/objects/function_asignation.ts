import FlyLang, { ParserReturn, ParserClassData } from "../parser.js";
import UnknowError from "../../errors/compiler/UnknowError.js";
import RaiseFlyLangCompilerError from "../../errors/raiseError.js";
import CompilerObject from "./_object.js";
import Stopper from "./stoppers.js";
import Positioner from "../../utils/positioner.js";
import { fastSyntaxError } from "../../errors/code/SyntaxError.js";
import { langRules } from "../../utils/registeries.js";
import NameError from "../../errors/code/NameError.js";

export type FunctionAsignationReturn = {
    type: "function_asignation",
    data: {
        name: string | null,
        arguments?: string[],
        code: ParserReturn["content"]
    }
}
export default class FunctionAsignation extends CompilerObject {
    constructor(data: ParserClassData) {
        super(data, "fct_asignation", `fn my_func(parameter1, ..., parametern, \n    #(code)\n)`, {
            fast: /fn(?:\s+[a-zA-Z_]\w*)?\s*\(.*\)/s,
            detailed: /fn(?:\s+(?<name>[a-zA-Z_]\w*))?\s*\((?<args>(?:\s*[a-zA-Z_]\w*\s*,)*)\s*(?<code>.*)\)/s
        })

        this.bonus_score+= 1
    }

    async parse(code: Positioner): Promise<FunctionAsignationReturn | null> {        
        const details = this.regexps.detailed.exec(code.now)        
        if(!details || !details.groups) return null
        
        const   name = details.groups.name,
                args= details.groups.args, // Need to be parsed
                fct_code= details.groups.code // Need to be parsed
        ;
        if(langRules.keywords.find(w => w === name)) throw new RaiseFlyLangCompilerError(new NameError(code.take(name), name)).raise()

        const args_array: Positioner[] = []
        if(args) {
            const array = args.split(',')

            const argPosition = code.split()
            argPosition.start += code.now.indexOf(args)
            argPosition.end = argPosition.start
            
            for(const value of array.slice(0, array.length -1)) {
                argPosition.end+= value.length

                if(/[^\s\d]\w*/.test(value)) args_array.push(argPosition.split().autoTrim())
                else throw new RaiseFlyLangCompilerError(fastSyntaxError(argPosition, "Invalid argument.")).raise()

                argPosition.start+= value.length +1 // +1 for the "," character
            }
        }
        

        this.data.objects.push(new Stopper(this.data, ["fct_returns"]))
        const parser = new FlyLang({
            type: "manualy",
            data: this.data
        })

        const fct_code_pos = code.take(fct_code).autoTrim()        
        const compiled= await parser.compile(fct_code_pos)
        if(!compiled) return new RaiseFlyLangCompilerError(new UnknowError("Your code is great, but mine is bad...")).raise()

        return {
            type: "function_asignation",
            data: {
                name: name || null,
                arguments: args_array.map(e => e.now),
                code: compiled.content
            }
        }
    }
}
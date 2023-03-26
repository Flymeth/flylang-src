import NameError from "../../errors/code/NameError.js";
import SyntaxError from "../../errors/code/SyntaxError.js";
import RaiseCodeError from "../../errors/raiseCodeError.js";
import RaiseFlyLangCompilerError from "../../errors/raiseError.js";
import Positioner from "../../utils/positioner.js";
import { langRules } from "../../utils/registeries.js";
import safeSplit from "../../utils/tools/safeSplit.js";
import Parser, { ParserReturn, ParserClassData } from "../parser.js";
import CompilerObject from "./_object.js"
import FunctionAsignation, { FunctionAsignationReturn } from "./function_asignation.js";

export type ClassConstrReturn = {
    type: "class_constructor",
    data: {
        name: string,
        extends: string[],
        content: {
            constructor: FunctionAsignationReturn,
            properties: ParserReturn["content"]
        } | null
    }
}
export const ClassConstrRegexps= {
    fast: /cs\s+[a-zA-Z_]\w*\(\s*.+\s*\)/s,
    detailed: /cs\s+(?<name>[a-zA-Z_]\w*)\(\s*(?<data>.+)\s*\)/s
}
export default class ClassConstr extends CompilerObject {
    constructor(data: ParserClassData) {
        super(data, "class_constructor", `cs MyClass(\n  fn (arg1, arg2,\n    |This is the constructor|\n  )\n)`, ClassConstrRegexps)

        this.bonus_score+= 2
    }

    async parse(code: Positioner): Promise<ClassConstrReturn | null> {
        const detailed = this.regexps.detailed.exec(code.now)
        if(!detailed || !detailed.groups?.name || !detailed.groups?.data) return null
        const   name = detailed.groups.name,
                content = detailed.groups.data
        ;
        
        if(langRules.keywords.find(w => w === name)) throw new RaiseCodeError(code, new NameError(name)).raise()

        const splittedContent = safeSplit(code.take(content), [","])
        const classExtenders: string[] = []

        while(splittedContent.length && /\s*[a-z_]\w*\s*$/i.test(splittedContent[0].now)) {            
            //@ts-ignore ^^^^ Because we checked if there is something on splittedContent
            classExtenders.push(splittedContent.shift()?.now)
        }
        
        if(splittedContent.length) {
            const constructor = splittedContent.shift()
            try {
                var parsedConstructor = constructor && await new FunctionAsignation(this.data).parse(constructor)
            } catch (_) { }
            if(!parsedConstructor) throw new RaiseCodeError(code, new SyntaxError("A valid constructor is required in a class definition.")).raise()
            
            if(splittedContent.length > 1) throw new RaiseCodeError(splittedContent.reduce((pre, cur) => pre.concat(cur) || cur), new SyntaxError()).raise()
            
            const parsedClassCode: ParserReturn["content"] = []
            const data = splittedContent.shift()
            if(data) {
                const compiler = new Parser({type: "manualy", data: this.data})
                const classCode = await compiler.compile(data)
                if(!classCode) throw new RaiseCodeError(data, new SyntaxError("Invalid syntax for a class.")).raise()
                parsedClassCode.push(...classCode.content)
            }            
        
            return {
                type: "class_constructor",
                data: {
                    name,
                    extends: classExtenders,
                    content: {
                        constructor: parsedConstructor,
                        properties: parsedClassCode
                    }
                }
            }
        }else return {
            type: "class_constructor",
            data: {
                name,
                extends: classExtenders,
                content: null
            }
        }
    }
}
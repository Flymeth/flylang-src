import { ParserReturn } from "../parser/parser.js";
import python from "./list/python.js";
import debug from "./list/debugger.js";

export type CompilerTypeObject = {
    name: string,
    version: number,
    exec: (data: ParserReturn["content"][number] | ParserReturn["content"][number][], cache?: {[key: string]: any}) => string
}
export default class Compiler {
    constructor() {  }

    getLangList() {
        return [
            python, debug
        ]
    }

    async generate(parsed: ParserReturn, lang: string) {
        if(!lang) return null
        
        const langs = this.getLangList()
        const compiler = langs.find(obj => obj?.name?.toLowerCase() === lang.toLowerCase())
        
        return compiler?.exec(parsed.content) || null
    }
}
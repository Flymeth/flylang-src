import { readdirSync } from "fs";
import { ParserReturn } from "../parser/parser.js";
import { join } from "path";

export type CompilerTypeObject = {
    name: string,
    version: number,
    exec: (data: ParserReturn["content"][number] | ParserReturn["content"][number][], cache?: {[key: string]: any}) => string
}
export default class Compiler {
    constructor() {  }

    async getLangList() {
        return await Promise.all(readdirSync(join(__dirname, "./list")).map(async file => {
            if(!file.endsWith('.js') || file.startsWith('__')) return
            return await import(join(__dirname, "./list", file)).then<CompilerTypeObject>(e => e.default)
        })).then(list => list.filter(e => e))
    }

    async generate(parsed: ParserReturn, lang: string) {
        if(!lang) return null
        
        const langs = await this.getLangList()
        const compiler = langs.find(obj => obj?.name.toLowerCase() === lang.toLowerCase())
        
        return compiler?.exec(parsed.content) || null
    }
}
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
            const module = await import(join('file://',__dirname, "./list", file)).then(mod => mod.default.default)
            return module
        })).then(list => list.filter(e => e))
    }

    async generate(parsed: ParserReturn, lang: string) {
        if(!lang) return null
        
        const langs = await this.getLangList()        
        const compiler = langs.find(obj => obj?.name?.toLowerCase() === lang.toLowerCase())
        
        return compiler?.exec(parsed.content) || null
    }
}
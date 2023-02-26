import { Arguments, DotProperties } from './utils/readers.js'
import { dirname, join } from 'path'
import FlyLang from './parser/parser.js'
import { writeFileSync } from 'fs'
import Compiler from './compilers/compiler.js'
import RaiseFlyLangCompilerError from './errors/raiseError.js'
import ArgError from './errors/compiler/ArgumentError.js'
import Interpreter from './interpreter/interpreter.js'
import accessToDoc from './doc.js'

const binMode = "pkg" in process
const [nodePath, thisPath, ...inputArgs] = process.argv
const args = new Arguments(inputArgs)
const properties = new DotProperties(join(binMode ? dirname(process.execPath) : __dirname, "../assets/flylang.properties"))

const flyLangFilePath = args.getArgument(0)
const flyLangOutPath = args.getArgument(1)

!(async () => {
    if(!flyLangFilePath) {
        if(!(args.arguments.length + args.options.length)) return console.log("In-console mode is not implemented yet.");
        return accessToDoc(args, properties)
    }
    
    const parser = new FlyLang({
        type: "auto",
        properties, 
        args, 
        path: flyLangFilePath ? {
            in: join(process.cwd(), flyLangFilePath),
            out: join(process.cwd(), flyLangOutPath || "")
        } : undefined
    });

    const oLang = args.getOptionValue('langOutput')
    const jsonParsed = await parser.compile()
    
    if(!jsonParsed) return
    try { // Json output
        const debugJsonFile = args.getOptionValue("debugJsonFile")
        
        if(typeof debugJsonFile === "string") {
            writeFileSync(join(debugJsonFile), JSON.stringify(jsonParsed, undefined, 2))
            console.log(`JSON debug file has been created at ${debugJsonFile}`);
        }
    } catch (e) {}
    
    if(typeof oLang === "string") {
        const compiler = new Compiler()
        const res = await compiler.generate(jsonParsed, oLang)
        if(!res) throw new RaiseFlyLangCompilerError(new ArgError("This language is not supported. Please check the list of supported language on the documentation!", "--langOutput")).raise()
        try {
            writeFileSync(flyLangOutPath, res, {encoding: "utf-8"})
        } catch (e) {}
    }else {
        const interpreter = new Interpreter(parser.data)
        const out= await interpreter.process(jsonParsed.content)        
    }
})()

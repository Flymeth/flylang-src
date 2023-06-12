import { join } from 'path'
import FlyLang from './parser/parser.js'
import { writeFileSync } from 'fs'
import Compiler from './compilers/compiler.js'
import RaiseFlyLangCompilerError from './errors/raiseError.js'
import ArgError from './errors/compiler/ArgumentError.js'
import Interpreter from './interpreter/interpreter.js'
import accessToDoc from './doc.js'
import {args, properties} from "./utils/input_infos.js"

const flyLangFilePath = args.getArgument(0)
const flyLangOutPath = args.getArgument(1)

!(async () => {
    if(process.argv[1] !== __filename) return
    
    process.title = "FlyLang"
    
    const parser = new FlyLang({
        type: "auto",
        properties, 
        args, 
        path: flyLangFilePath ? {
            in: /^[a-z]:/i.test(flyLangFilePath) ? flyLangFilePath : join(process.cwd(), flyLangFilePath),
            out: /^[a-z]:/i.test(flyLangOutPath) ? flyLangOutPath : join(process.cwd(), flyLangOutPath || "")
        } : undefined
    });

    if(!flyLangFilePath) {
        if(!(args.arguments.length + args.options.length)) return new Interpreter(parser.data, true)
        return accessToDoc(args, properties)
    }

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
        await interpreter.process(jsonParsed.content)

        if(properties.getValue("inConsoleModeWhenFileExecuted")?.value === "1") interpreter.fetchAndExecPrompt()
    }
    process.exit(0) //? Sometimes process doesn't exit (When opening/writing a file for exemple)
})()

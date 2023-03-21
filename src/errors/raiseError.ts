import { ICM } from "../interpreter/interpreter.js"
import CompilerError from "./_error.js"
import UnknowError from "./compiler/UnknowError.js"

export let allowErrors = true
export function setAllowErrors(allow: boolean) {
    allowErrors = allow
}
export default class RaiseFlyLangCompilerError {
    error: CompilerError
    constructor(error?: CompilerError) {
        this.error = error || new UnknowError()
    }
    
    raise() {
        if(!allowErrors) return this.error
        console.error(this.error.toString())
        
        if(!ICM()) process.kill(process.pid) // This kill the current process (without any additionnal message except the error's one)
        return this.error // For typing
    }
}
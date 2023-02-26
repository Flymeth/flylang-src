import CompilerError from "./_error.js"
import UnknowError from "./compiler/UnknowError.js"

export default class RaiseFlyLangCompilerError {
    error: CompilerError
    constructor(error?: CompilerError) {
        this.error = error || new UnknowError()
    }
    
    raise() {
        console.error(this.error.toString())
        
        process.kill(process.pid) // This kill the current process (without any additionnal message except the error's one)
        return null // For typing (when the code above is executed, the process is killed and stop)
    }
}
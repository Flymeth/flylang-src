import chalk from "chalk"
import CompilerError from "./_error.js"
import UnknowError from "./compiler/UnknowError.js"

export let allowErrors = true
export function setAllowErrors(allow: boolean) {
    allowErrors = allow
}
export let killProcessWhenError = true
export function setKillProcessWhenError(kill: boolean) {
    killProcessWhenError = kill
}
export default class RaiseFlyLangCompilerError {
    error: CompilerError
    constructor(error?: CompilerError) {
        this.error = error || new UnknowError()
    }
    
    stringifyError(): string {
        return this.error.toString() + chalk.reset()
    }

    raise() {
        if(!allowErrors) return this.error
        console.error(this.stringifyError())
        
        if(killProcessWhenError) process.kill(process.pid) // This kill the current process (without any additionnal message except the error's one)
        return this.error // For typing
    }
}
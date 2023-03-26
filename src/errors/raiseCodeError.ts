import Positioner from "../utils/positioner.js"
import CompilerError from "./_error.js"
import RaiseFlyLangCompilerError from "./raiseError.js"
import {args} from "../utils/input_infos.js"
import chalk from "chalk"

type lineBlockObject= {
    line: number, content: string
}[]
type fileErrorObject= {
    path: string,
    line: number,
    char: number
}
type parseLineReturn = {
    block: lineBlockObject,
    file: fileErrorObject
}

export default class RaiseCodeError extends RaiseFlyLangCompilerError {
    position: Positioner
    constructor(codePosition: Positioner, error?: CompilerError) {
        super(error)
        this.position= codePosition
    }
    
    private errorCodeDisplay(content: string): string {
        return chalk.bold(chalk.red(chalk.underline(content)))
    }
    private defaultCodeDisplay(content: string): string {
        return chalk.italic(chalk.blue(content))
    }
    private lineTabDisplay(line: number): string {
        return chalk.gray(`${" ".repeat(5 - line.toString().length) + chalk.white(line)}|`)
    }

    private parseLines(): parseLineReturn {
        const {asOriginal} = this.position
        const {start, now, global} = asOriginal
        const errorLines = now.split(/\r?\n/)
        const errorLineFrom= global.slice(0, start).split(/\r?\n/)?.length -1
        const errorLineTo= errorLineFrom + errorLines.length

        const baseIntervalArg = args.getOptionValue('errorLinesInterval')
        const lineInterval = parseInt(typeof baseIntervalArg === "boolean" && baseIntervalArg ? "1" : baseIntervalArg || "1")
        
        const globalLines = global.split(/\r?\n/)
        const realLines = [Math.max(0, errorLineFrom - lineInterval), Math.min(globalLines.length, errorLineTo + lineInterval)]
        const lines = globalLines.slice(...realLines)
        
        const parsed: lineBlockObject = []
        for(const i in lines) {
            const lineIndex = parseInt(i)
            const line = lines[i]
            const realLineIndex = realLines[0] + lineIndex
            let lineContent = ""

            if(errorLineFrom <= realLineIndex && realLineIndex < errorLineTo) {                
                const errorLineContent = errorLines[Math.max(0, lineIndex - lineInterval)]
                const errorLineStart = line.indexOf(errorLineContent)
                const errorLineEnd = errorLineStart + errorLineContent.length

                lineContent = (
                    this.defaultCodeDisplay(line.substring(0, errorLineStart))
                    + this.errorCodeDisplay(line.substring(errorLineStart, errorLineEnd))
                    + this.defaultCodeDisplay(line.substring(errorLineEnd))
                )

            }else lineContent = this.defaultCodeDisplay(line)
            parsed.push({line: realLineIndex +1, content: lineContent})
        }
        return {
            block: parsed,
            file: {
                path: asOriginal.file?.value || "<unknow>",
                line: errorLineFrom,
                char: lines[0].indexOf(errorLines[0])
            }
        }
    }
    private stringifyLines(lines: lineBlockObject, errorFileInfos: fileErrorObject): string {
        let stringified = ""
        for(const {line, content} of lines) {
            if(stringified) stringified+= "\n"
            stringified+= `${this.lineTabDisplay(line)} ${content}`
        }
        stringified+= `\n${chalk.gray(`At ${errorFileInfos.path}:${errorFileInfos.line +1}:${errorFileInfos.char +1}`)}`
        return stringified + chalk.reset()
    }
    
    stringifyError(): string {
        const {block, file} = this.parseLines()
        const stringifiedCode = this.stringifyLines(block, file)

        const errorMSG = `${this.error.toString()}\n${stringifiedCode}`
        return errorMSG
    }
}
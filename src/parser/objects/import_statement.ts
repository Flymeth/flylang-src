import { fastSyntaxError } from "../../errors/code/SyntaxError.js";
import RaiseFlyLangCompilerError from "../../errors/raiseError.js";
import Positioner from "../../utils/positioner.js";
import safeSplit from "../../utils/tools/safeSplit.js";
import { removeUselessPriorities } from "../../utils/tools/symplifier.js";
import Parser, { ParserReturn, ParserClassData } from "../parser.js";
import CompilerObject from "./_object.js";
import String, { StringReturn } from "./string.js";
import Variable, { VariableReturn } from "./variable.js";
import { langRules as rules } from "../../utils/registeries.js";
import { join, parse } from "path";
import { exportableObjects, exportableObjectsName } from "../../utils/registeries.js"
import { StringTools } from "../../utils/tools/stringTools.js";
import chalk from "chalk";

type defaultImportaterReturnData = {
    /**
     * All import informations
     */
    informations: {
        restrictions: string[] | null,
        affectedTo: VariableReturn | null
    }
}
export type ImportaterReturn = {
    type: "import",
    data: defaultImportaterReturnData & ({
        importType: "file",
        imported: ParserReturn
    } | {
        importType: "module",
        name: string
    })
}
export const ImportaterRegExps = {
    fast: new RegExp(`import\\s+(?:(?:(?<str_char>[${rules.string.openner.join('')}]).*\\k<str_char>)|\\w+)(?:\\s+only\\s+(?:[${rules.block.openner.join('')}].*[${rules.block.closer}]|\\*))?(?:\\s+in\\s+[a-zA-Z_]\\w*)?`, "s"),
    detailed: new RegExp(`import\\s+(?<from>(?:(?<str_char>[${rules.string.openner.join('')}]).*\\k<str_char>)|\\w+)(?:\\s+only\\s+(?<deconstruct>[${rules.block.openner.join('')}].*[${rules.block.closer}]|\\*))?(?:\\s+in\\s+(?<variable>[a-zA-Z_]\\w*))?`, "s")
}

export default class Importater extends CompilerObject {
    constructor(data: ParserClassData) {
        super(data, "import", `import my_module <only (data1, data2, ...)> <in variable>`, ImportaterRegExps)

        this.bonus_score+= 1
    }

    private parseDeconstructedProps(regResult: Positioner): string[] | "all" {
        if(regResult.now === "*") return "all"
        const symplified = removeUselessPriorities(regResult.now)
        
        if(symplified) {
            regResult.start+= regResult.now.indexOf(symplified)
            regResult.end = regResult.start + symplified.length
        }        
        const splitted = safeSplit(regResult.split(), [","]).map(e => e.now.trim())
        if(splitted.length === 1 && /\(\s*\)/.test(splitted[0])) throw new RaiseFlyLangCompilerError(fastSyntaxError(regResult, "Invalid properties deconstructor.")).raise()
        return splitted
    }

    private async fetchAndParseImportedFile(importCode: Positioner, filePath: string, only?: string[]): Promise<ParserReturn> {
        const parser = new Parser({
            type: "auto",
            args: this.data.arguments,
            properties: this.data.properties,
            path: {
                in: filePath,
                out: ""
            }
        })

        try {
            parser.requestFile()
            if(typeof parser.data.file.src.content !== "string") throw 0
        } catch (_) {
            throw new RaiseFlyLangCompilerError(fastSyntaxError(importCode, "File not found.")).raise()
        }
        const fileContent = parser.data.file.src.content
        const positioner = new Positioner(fileContent, undefined, {
            parsed: parse(filePath),
            value: filePath
        })

        const parsed = await parser.compile(positioner)
        if(!parsed) throw new RaiseFlyLangCompilerError(fastSyntaxError(positioner, "Invalid syntax. Cannot import module")).raise()
        
        if(only) {
            // Warn message (w = max-width)
            const w = 100
            const messages = StringTools.splitByWith("[Warning]> Deconstructed properties for import statements are not well implemented. Note that using them is not recommended and can cause errors.", w, true).map(t => `|${chalk.italic.red.bold(t)}|`)
            const borders = "-".repeat(w)
            console.warn(chalk.bgWhite.blue(`/${borders}\\\n${messages.join('\n')}\n\\${borders}/`));

            function getObjectName(obj: exportableObjects): string | null {
                return (
                    obj.type === "class_constructor" ? obj.data.name :
                    obj.type === "function_asignation"? obj.data.name:
                    obj.type === "variable_asignation"? (
                        obj.data.variable.type === "variable" ? obj.data.variable.data.name :
                        null
                    ) : null
                )
            }

            const needToBeFound = new Set(only)

            /**
             * Return if an object is required
             * @param deep If true, the object will not be automaticaly deleted from the "needToBeFound" set.
             */
            function required(object: exportableObjects, deep= false): boolean {
                const objectName = getObjectName(object)                
                const isRequired = objectName && (needToBeFound.has(objectName) || parsed?.content.find((tester): boolean => { // The function will return the amount of time the object has been used
                    if(
                        !exportableObjectsName.includes(tester.type)
                        || (
                            tester.type === object.type && getObjectName(tester) === objectName
                        ) // Because it musn't be the same object
                    ) return false
                    
                    const objectCode = tester.map && fileContent.slice(tester.map[0], tester.map[1])
                    if(!objectCode) return false
                    
                    const testerRegexp = new RegExp(`/(?<str>["']).*?&\\(.*${objectName}.*\\).*?\\k<str>/`).test(objectCode)
                    const splitted = safeSplit(new Positioner(objectCode), [objectName], undefined, 1, {
                        block: true,
                        object: true
                    }).length > 1                    

                    return (testerRegexp || splitted) && !!required(tester as exportableObjects /* Tested this above */, true)
                }))
                                    // This part will only work if the function hasn't been executed in recurtion
                return !!isRequired && (!deep && needToBeFound.delete(objectName) || true)
            }

            const filtered = parsed.content.filter((value) => {
                if(!exportableObjectsName.includes(value.type)) return false
                // If the value is a exportableObject named as the required object, or if the value object is used in exported objects
                return required(value as exportableObjects /* Because the above instruction checked that */)
            })
            if(needToBeFound.size) {
                const unfoundItem = Array.from(needToBeFound)[0]
                const deconstructPos = importCode.asParent.childs[1].data

                deconstructPos.start += deconstructPos.now.indexOf(unfoundItem)
                deconstructPos.end = deconstructPos.start + unfoundItem.length                
                throw new RaiseFlyLangCompilerError(fastSyntaxError(deconstructPos, `Object not found in module.`)).raise()
            }

            parsed.content = filtered
        }

        return parsed
    }

    async parse(code: Positioner): Promise<ImportaterReturn | null> {
        const detailed = this.regexps.detailed.exec(code.now)
        if(detailed?.[0] !== code.now|| !detailed.groups) return null
        const   from= detailed.groups.from,
                deconstructed= detailed.groups.deconstruct,
                setInVariable= detailed.groups.variable
        ;
        
        const fromPosition = code.take(from)
        const parsedFrom = await Parser.parse(this.data, fromPosition, [
            new Variable(this.data), new String(this.data)
        ]) as VariableReturn | StringReturn | null
        if(!parsedFrom) throw new RaiseFlyLangCompilerError(fastSyntaxError(fromPosition, "Invalid import file/module."))
        
        const deconstructedPosition = !!deconstructed && code.take(deconstructed)        
        const deconstructedProperties = deconstructedPosition && this.parseDeconstructedProps(deconstructedPosition) || "all"

        const variableSetterClass = new Variable(this.data)
        const variableSetter = setInVariable && variableSetterClass.testScore(setInVariable) && await variableSetterClass.parse(code.take(setInVariable)) || null

        const importInformations: defaultImportaterReturnData = {
            informations: {
                restrictions: !deconstructedProperties || (typeof deconstructedProperties === "string") ? null: deconstructedProperties,
                affectedTo: variableSetter
            }
        }

        if(!code.file) code.file = {
            parsed: parse("./"),
            value: "./"
        }
        if(parsedFrom.type === "string") {
            if( parsedFrom.data.length > 1 
                || parsedFrom.data[0].type !== "text"
            ) throw new RaiseFlyLangCompilerError(fastSyntaxError(fromPosition, "Invalid import syntax")).raise()
            
            const input = parsedFrom.data[0].data
            const filePath = join(code.file.parsed.dir, input) + (input.endsWith(".fly") ? "" : ".fly")
            const parsed = await this.fetchAndParseImportedFile(
                fromPosition,
                filePath,
                deconstructedProperties !== "all" ? deconstructedProperties : undefined // Add this parameter only if needed
            )

            return {
                type: "import",
                data: {
                    ...importInformations,
                    importType: "file",
                    imported: parsed
                }
            }
        }else return {
            type: "import",
            data: {
                ...importInformations,
                importType: "module",
                name: parsedFrom.data.name
            }
        }
    }
}
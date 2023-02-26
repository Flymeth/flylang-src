import { readFileSync } from "fs"
import PathError from "../errors/compiler/PathError.js"
import RaiseFlyLangCompilerError from "../errors/raiseError.js"
import { Arguments, DotProperties } from "../utils/readers.js"
import { ParsedPath, join, parse } from "path"
import { fastSyntaxError } from "../errors/code/SyntaxError.js"
import String, { StringReturn } from "./objects/string.js"
import CompilerObject from "./objects/_object.js"
import Commentary, { CommentaryReturn } from "./objects/comment.js"
import Number, { NumberReturn } from "./objects/number.js"
import VariableAsignation, { VariableAsignationReturn } from "./objects/variable_asignation.js"
import StrictValue, { StrictValueReturn } from "./objects/strict_value.js"
import Variable, { VariableReturn } from "./objects/variable.js"
import FunctionAsignation, { FunctionAsignationReturn } from "./objects/function_asignation.js"
import Operation, { OperationReturn } from "./objects/operations.js"
import ifStatement, { ifStatementReturn } from "./objects/ifStatement.js"
import FunctionCall, { FunctionCallReturn } from "./objects/function.js"
import Stopper, { StopperReturn } from "./objects/stoppers.js"
import Comparaison, { ComparaisonReturn } from "./objects/comparaison.js"
import BooleanTest, { BooleanTestReturn } from "./objects/boolean.js"
import safeSplit from "../utils/tools/safeSplit.js"
import Array, { ArrayReturn } from "./objects/array.js"
import { removeUselessPriorities, codeSimplifier, removeComments } from "../utils/tools/symplifier.js"
import DictObject, { DictObjectReturn } from "./objects/object.js"
import Loops, { LoopsReturn } from "./objects/loops.js"
import Positioner from "../utils/positioner.js"
import AttrAccess, { AttrAccessReturn } from "./objects/attr_access.js"
import ClassConstr, { ClassConstrReturn } from "./objects/class_construct.js"
import ClassInstanciation, { ClassInstanciationReturn } from "./objects/class_instanciation.js"
import Importater, { ImportaterReturn } from "./objects/import_statement.js"
import { langRules } from "../utils/registeries.js"

export type ParserClassData = {
    arguments: Arguments,
    properties: DotProperties,
    objects: CompilerObject[],
    file: {
        src: {
            path?: {
                value: string,
                parsed: ParsedPath
            },
            content?: string
        },
        dist: {
            path?: {
                value: string,
                parsed: ParsedPath
            },
            data?: ParserReturn["content"]
        }
    },
    position?: Positioner
    cache: {
        [key: string]: any,
    }
}
export type ParsableObjectInformations = {
    map?: [number, number]
}
export type  ParsableObjectList= (
    CommentaryReturn | FunctionAsignationReturn | ifStatementReturn
    | NumberReturn | OperationReturn | StrictValueReturn | StringReturn
    | VariableAsignationReturn | VariableReturn | FunctionCallReturn | StopperReturn
    | ComparaisonReturn | BooleanTestReturn | ArrayReturn | DictObjectReturn | LoopsReturn
    | AttrAccessReturn | ClassConstrReturn | ClassInstanciationReturn | ImportaterReturn
);
export type ParsedObject = ParsableObjectList & ParsableObjectInformations

export type ParserReturn = {
    origin: {
        inherit?: ParserReturn,
        /**
         * Path of the file
         */
        file?: string
    },
    content: ParsedObject[]
}

type FlyLangConstrData = {
    type: "manualy",
    data: ParserClassData
} | {
    type: "auto",
    properties: DotProperties,
    args: Arguments,
    path?: {
        in: string,
        out: string
    },
    /**
     * If not specified, it will take the default objects in `CompilableObject` type
     */
    objects?: CompilerObject[]
}
export default class Parser {
    data: ParserClassData

    constructor(data: FlyLangConstrData) {
        if(data.type === "manualy") this.data= data.data
        else {
            const {properties, args, path, objects} = data
            this.data= {
                arguments: args,
                properties,
                objects: [],
                file: {
                    src: {},
                    dist: {}
                },
                cache: {}
            }
            
            if(path) {
                const urlPathIn = path.in?.[1] === ":" ? path.in : join(process.cwd(), path.in || 'main.fly')
                const urlPathOut = path.out?.[1] === ":" ? path.out : join(process.cwd(), path.out || 'main.fly.out')
                this.data.file.src.path= {
                    value: urlPathIn,
                    parsed: parse(urlPathIn)
                }
    
                this.data.file.dist.path= {
                    value: urlPathOut,
                    parsed: parse(urlPathOut)
                }
            }
            this.data.objects= objects || [new String(this.data), new Commentary(this.data), new Number(this.data), new StrictValue(this.data), 
                new VariableAsignation(this.data), new Variable(this.data), new FunctionAsignation(this.data), new Operation(this.data),
                new ifStatement(this.data), new FunctionCall(this.data), new Comparaison(this.data), new BooleanTest(this.data),
                new Stopper(this.data, ["block_pass"]), new Array(this.data), new DictObject(this.data), new Loops(this.data), new AttrAccess(this.data),
                new ClassConstr(this.data), new ClassInstanciation(this.data), new Importater(this.data)
            ]
        }
    }

    requestFile() {
        if(!this.data.file.src.path) return
        const {value, parsed} = this.data.file.src.path
        try {
            this.data.file.src.content = readFileSync(value, {encoding: 'utf-8'})
        } catch (e) {
            new RaiseFlyLangCompilerError(new PathError("Path is not valid!", parsed)).raise()
        }
    }

    static async parse(data: ParserClassData, position: Positioner, parsingObjects?: CompilerObject[]): Promise<ParsableObjectList | null> {
        const {now} = position
        const tester = removeComments(codeSimplifier(now) || "")
        if(!tester) return null
        
        const objects = parsingObjects || data.objects        
        const sorted = objects.sort((a, b) => b.testScore(tester) - a.testScore(tester))
        const obj = sorted[0]        
        
        if(obj.testedScore === -Infinity) return null
        
        const focusedCode = removeComments(removeUselessPriorities(now) || "")
        if(!focusedCode) return null
        return await obj.parse(new Positioner(focusedCode, position, position.file))
    }

    async compile(customCode?: string | Positioner, inherits?: ParserReturn): Promise<ParserReturn | null> {
        if(customCode === undefined) this.requestFile()
        const original = customCode ?? (this.data.file.src.content || "")
        const compiled: ParserReturn["content"] = []
        const position = original instanceof Positioner ? original.split() : new Positioner(original, this.data.position)
        position.file = this.data.file.src.path
        this.data.position= position

        const splitted = safeSplit(position, undefined, true)
        if(!splitted) return null
        
        for await(const content of splitted) {
            if(content.autoTrim().now) {
                const result = await Parser.parse(this.data, content.split())
                
                if(!result) return new RaiseFlyLangCompilerError(fastSyntaxError(content.asOriginal)).raise()
                compiled.push({
                    ...result,
                    map: content.relatives?.global.position || content.indexes
                })
            }
        }
        
        this.data.file.dist.data = compiled
        return {
            origin: {
                inherit: inherits,
                file: this.data.file.src.path?.value
            },
            content: compiled
        }
    }
    
}
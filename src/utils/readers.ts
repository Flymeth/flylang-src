import {readFileSync} from 'node:fs';
import RaiseFlyLangCompilerError from '../errors/raiseError.js';
import Error from "../errors/_error.js";

type DPprop= {key: string, value: string}
export class DotProperties {
    private props: DPprop[]
    constructor(filePath: string) {
        try {
            var txt = readFileSync(filePath, 'utf-8')
        } catch (_) {
            throw new RaiseFlyLangCompilerError(new Error("Internal Error", 3, "An internal error has come. Please try reinstalling the flylang package.")).raise()
        }
        this.props = txt.split(/$/gm).map(txt => {
            const [key, value]= txt.split("=").map(e => e.trim())
            return {key, value}
        }).filter(({key}) => !key.startsWith("#"))
    }

    get getProperties() {
        return this.props
    }

    getValue(accessKey: string) {
        return this.props.find(({key}) => key === accessKey)
    }
    getKey(accessValue: string) {
        return this.props.find(({value}) => value === accessValue)
    }

    filter(predicate: (data: DPprop) => boolean) {
        return this.props.filter(predicate)
    }
}

type Aprop = {name: string, value: boolean | string}
export class Arguments {
    private list: Aprop[]
    private globalArgument: string[]
    constructor(input: string[]) {
        this.list= []
        this.globalArgument = []
        for(const data of input) {
            const parsed = /--?(?<name>\w+)\s*(?:=\s*(?<value>.+))?/.exec(data)?.groups
            if(parsed) {
                const {name, value} = parsed
                this.list.push({
                    name,
                    value: typeof value === "string" ? value: true
                })
            }else this.globalArgument.push(data)
        }
    }

    get options() {
        return this.list
    }
    get arguments() {
        return this.globalArgument
    }

    getOptionValue(optName: string) {
        return this.list.find(({name}) => name === optName)?.value
    }
    getOptionName(optValue: string) {
        return this.list.find(({value}) => value === optValue)?.name
    }

    findOptions(predicate: (data: Aprop, index: number, obj: Aprop[]) => boolean) {
        return this.list.find(predicate)
    }
    filterOptions(predicate: (data: Aprop, index: number, obj: Aprop[]) => boolean) {
        return this.list.filter(predicate)
    }

    getArgument(index: number) {
        return this.globalArgument[index] || ""
    }

    findArguments(predicate: (data: string, index: number, obj: string[]) => boolean) {
        return this.globalArgument.find(predicate)
    }
    filterArguments(predicate: (data: string, index: number, obj: string[]) => boolean) {
        return this.globalArgument.filter(predicate)
    }
}
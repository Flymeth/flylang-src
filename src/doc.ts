import marked from "marked";
import terminalMdParser from "marked-terminal";
import { Arguments, DotProperties } from "./utils/readers.js";
import { readFileSync } from "fs";
import { join } from "path";
import { RegExp_AND } from "./utils/tools/regExpTools.js";
//@ts-ignore - Exported in the same directory scope
import {version} from "../package.json";

marked.setOptions({
    renderer: new terminalMdParser({
        tab: 2
    })
})

const markdowns = {
    main: readFileSync(join(__dirname, "../readme.md"), {encoding: "utf-8"}),
    help: readFileSync(join(__dirname, "../assets/docs/help.md"), {encoding: "utf-8"}),
    syntax: readFileSync(join(__dirname, "../assets/docs/syntax.md"), {encoding: "utf-8"}),
    changelog: readFileSync(join(__dirname, "../changelog.md"), {encoding: "utf-8"}),
}

export function render(md: string, variables: {[key: string]: string} = {}, var_prefix = "<:", var_suffix = ">"): void {
    for(const name in variables) {
        md = md.replaceAll(new RegExp(`${RegExp_AND([var_prefix])}\\s*${name}\\s*${RegExp_AND([var_suffix])}`), variables[name])
    }

    const content = marked.parse(md)
    console.info(content.trim())
}
export default function accessToDoc(args: Arguments, props: DotProperties): void {    
    if(args.getOptionValue('help')) return render(markdowns.help)
    else if(args.getOptionValue('changelog')) return render(markdowns.changelog)
    else if(args.getOptionValue('syntax')) return render(markdowns.syntax)
    else if(args.getOptionValue('info')) return render(markdowns.main)
    else if(args.getOptionValue('props')) return render(props.getProperties.map(({key, value}, index) => `[${index + 1}]> *${key}* = **${value}**`).join('\r\n'))
    else if(args.getOptionValue('version')) return render(`*${version}*`)
    else console.error("ERROR => Invalid argument.");
}
import ExitError from "../errors/interpreter/exitError";
import RaiseFlyLangCompilerError from "../errors/raiseError";
import { createInterface } from "node:readline/promises";

function forceStop() {
    FlylangConsole.writeLine()
    new RaiseFlyLangCompilerError(new ExitError("Process has been manually stopped.")).raise()
    process.exit(0)
}

export default class FlylangConsole {
    static prompts: string[]= []
    static async getPrompter() {
        const rl= createInterface(process.stdin, process.stdout)
        rl.on("SIGINT", () => {
            rl.close()
            forceStop()
        })
        return rl
    }

    static async input(query: string): Promise<string> {
        const prompt = await FlylangConsole.getPrompter()
        const answer = await prompt.question(query)
        FlylangConsole.prompts.push(answer)
        prompt.close()
        return answer
    }
    static write(text: string) {
        process.stdout.write(text)
    }
    static writeLine(text?: string) {
        FlylangConsole.write(`${text || ""}\n`)
    }
}
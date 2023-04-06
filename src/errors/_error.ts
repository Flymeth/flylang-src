import chalk from "chalk"

export default class Error {
    data: {
        name: string,
        type: number,
        customMessage?: string
    }
    constructor(name: string, type: number, customMessage?: string) {
        this.data = {name, type, customMessage}
    }
    
    toString() {
        const customMessages = this.data.customMessage?.split('\n').filter(m => m.trim()).map(msg => `> ${msg}`).join('\n') || ""
        return `${chalk.gray(`[${this.data.type}]>`)} ${chalk.underline(chalk.bold(chalk.red(this.data.name))) + (customMessages ? `\n${chalk.italic(customMessages)}` : "")}`
    }
}
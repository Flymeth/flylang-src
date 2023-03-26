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
        return `${chalk.gray(`[${this.data.type}]>`)} ${chalk.underline(chalk.bold(chalk.red(this.data.name)))}\n${chalk.italic(this.data.customMessage?.split('\n').map(msg => `> ${msg}`).join('\n') || "")}`
    }
}
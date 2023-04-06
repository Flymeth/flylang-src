import { dirname, join } from "path"
import { Arguments, DotProperties } from "./readers.js"

const binMode = "pkg" in process
const [nodePath, thisPath, ...inputArgs] = process.argv

export const args = new Arguments(inputArgs)
export const properties = new DotProperties(join(binMode ? dirname(process.execPath) : __dirname + "../..", "../assets/flylang.properties"))

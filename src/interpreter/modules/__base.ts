import { cacheInterface } from "../defaultCache.js"
import Interpreter from "../interpreter.js"

export default async function modl(intrp : Interpreter): Promise<cacheInterface["builtin"]> {
    const module: cacheInterface["builtin"] = {
        variables: {},
        functions: {},
        objects: {}
    }

    return module
}
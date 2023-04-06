import BigNumber from "bignumber.js"
import { cacheInterface } from "../defaultCache.js"
import Interpreter from "../interpreter.js"
import RaiseCodeError from "../../errors/raiseCodeError.js"
import { NumberReturn } from "../../parser/objects/number.js"
import FunctionError from "../../errors/interpreter/functionError.js"

function randomGenerator() {
    return Math.random()
}

export default async function modl(intrp : Interpreter): Promise<cacheInterface["builtin"]> {
    const module: cacheInterface["builtin"] = {
        variables: {
            async now() {
                const generated = randomGenerator()
                return {type: "number", data: {negative: false, type: "float", number: new BigNumber(generated)}}
            }
        },
        functions: {
            async ranged(n1, n2) {
                if(!(
                    n1 && n1.type === "number"
                    && n2 && n2.type === "number"
                    && n1.data.number.isLessThanOrEqualTo(n2.data.number)
                )) throw new RaiseCodeError(intrp.currentPosition, new FunctionError(`Function requires 2 numbers as arguments (first one must be lower than the second).`)).raise()
                const [min, max] = [n1.data.number, n2.data.number]
                const generated = new BigNumber(randomGenerator()).multipliedBy(max.minus(min)).plus(min)
                return {type: "number", data: {negative: generated.isLessThan(0), type: generated.isInteger() ? "integer" : "float", number: generated}}
            },
            async rangedInt(n1, n2) {
                const {data: {negative, number}} = await module.functions.ranged(n1, n2) as NumberReturn
                return {type: "number", data: {type: "integer", negative, number: number.integerValue()}}
            }
        },
        objects: {}
    }

    return module
}
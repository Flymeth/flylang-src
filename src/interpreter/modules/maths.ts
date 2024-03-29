import { cacheInterface } from "../defaultCache.js";
import { BigNumber } from "bignumber.js";
import Interpreter, { UNDEFINED_TYPE } from "../interpreter.js";
import OperationError from "../../errors/interpreter/operationError.js";
import { NumberReturn } from "../../parser/objects/number.js";
import RaiseCodeError from "../../errors/raiseCodeError.js";

const pi = new BigNumber("3.1415926535897932384626433832795028841971693993751")
const e  = new BigNumber("2.7182818284590452353602874713526624977572470936999")
const [halfPI, twoPI] = [pi.dividedBy(2), pi.multipliedBy(2)]
const nToFactorialOf2n = new Array(30).fill(null).map((_, n) => {
    const twoN = new BigNumber(2 * (n + 1)) // (n + 1) because we start at 2 (and not 0)
    const fact = factorial(twoN)
    return {twoN, fact}
})
const knownCosValues: Map<string, BigNumber> = new Map()
knownCosValues.set("0", new BigNumber(1))
knownCosValues.set(halfPI.toFixed(), new BigNumber(0))
knownCosValues.set(pi.toFixed(), new BigNumber(-1))
knownCosValues.set(halfPI.multipliedBy(3).toFixed(), new BigNumber(0))

function factorial(x: BigNumber): BigNumber {
    let res = new BigNumber(1)
    for(let i = x; i.isGreaterThan(1); i= i.minus(1)) res= res.multipliedBy(i)
    return res
}
/**
* Calculate cos with the Bhaskara Formula
* @link https://en.wikipedia.org/wiki/Taylor_series
* @link https://www.quora.com/How-can-CosX-be-calculated-by-hand
*/
export function TaylorCosCalculation(x: BigNumber): BigNumber {
    x= x.modulo(twoPI)
    if(x.isLessThan(0)) x= x.plus(twoPI)
    let res = knownCosValues.get(x.toFixed())

    if(!res) {
        res = new BigNumber(1)
        let sign = -1
        for(const {twoN, fact} of nToFactorialOf2n) {
            res = res.plus(
                x.pow(twoN).dividedBy(fact).multipliedBy(sign)
            )
            sign*= -1
        }
    }

    knownCosValues.set(x.toFixed(), res)
    return res
}

export function naturalLogCalculation(x: BigNumber) {
    if(x.isLessThanOrEqualTo(0)) return
    // Yes I'm cheating, what you gonna do ?
    return new BigNumber(Math.log(x.toNumber()))
}

export function bigNumbersPow(nb: BigNumber, power: BigNumber) {
    if(!power.isInteger()) return null
    return nb.pow(power)
}

export default function modl(intrp : Interpreter): cacheInterface["builtin"] {
    const module: cacheInterface["builtin"] = {
        variables: {
            pi: async () => (
                {type: "number", data: {negative: false, type: "float", number: pi}}
            ),
            e: async () => (
                {type: "number", data: {negative: false, type: "float", number: e}}
            )
        },
        functions: {
            async cos(nb, ..._) {
                nb = await intrp.eval(nb)
                if(nb.type !== "number" || nb.data.number.isNaN()) throw new RaiseCodeError(intrp.currentPosition, new OperationError("Cannot perform a cosine with a non-number value.")).raise()
                
                const res =  TaylorCosCalculation(nb.data.number)
                return {type: "number", data: {number: res, negative: res.isNegative(), type: res.isInteger() ? "integer" : "float"}}
            },
            async sin(nb, ..._) {
                nb = await intrp.eval(nb)
                if(nb.type !== "number" || nb.data.number.isNaN()) throw new RaiseCodeError(intrp.currentPosition, new OperationError("Cannot perform a sine with a non-number value.")).raise()
                
                let x = nb.data.number
                while(x.isGreaterThan(pi)) x = x.minus(twoPI)
                while(x.isLessThan(0)) x = x.plus(twoPI)
                
                const cos = TaylorCosCalculation(x)
                
                const res = new BigNumber(1).minus(cos.pow(2)).sqrt().multipliedBy(x.isGreaterThan(pi) ? -1 : 1)
                return {type: "number", data: {number: res, negative: res.isNegative(), type: res.isInteger() ? "integer" : "float"}}
            },
            async tan(nb, ..._) {
                const cos = await module.functions.cos(nb) as NumberReturn
                const sin = await module.functions.sin(nb) as NumberReturn

                const res = cos.data.number.dividedBy(sin.data.number)
                return {type: "number", data: {number: res, negative: res.isNegative(), type: res.isInteger() ? "integer" : "float"}}
            },
            async factorial(nb, ..._) {
                nb = await intrp.eval(nb)
                if(nb.type !== "number" || nb.data.number.isNaN()) throw new RaiseCodeError(intrp.currentPosition, new OperationError("Cannot perform a factorial with a non-number value.")).raise()
                let res = factorial(nb.data.number)
                return {type: "number", data: {negative: res.isNegative(), number: res, type: res.isInteger() ? "integer" : "float"}}
            },
            async sqrt(nb, ..._) {
                nb = await intrp.eval(nb)
                if(nb.type !== "number" || nb.data.number.isNaN() || nb.data.number.isLessThan(0)) throw new RaiseCodeError(intrp.currentPosition, new OperationError("Square root can only be calculated with a positive number.")).raise()
                const res = nb.data.number.sqrt()
                return {type: "number", data: {negative: false, number: res, type: res.isInteger() ? "integer" : "float"}}
            },
            async pow(pow, by, ..._) {
                pow = await intrp.eval(pow)
                by = await intrp.eval(by)
                if (
                    pow.type !== "number" || pow.data.number.isNaN()
                    || by.type !== "number" || by.data.number.isNaN()
                ) throw new RaiseCodeError(intrp.currentPosition, new OperationError("Pow can only be calculated with a number, by a number.")).raise()
                const res = bigNumbersPow(pow.data.number, by.data.number)
                if(!res) throw new RaiseCodeError(intrp.currentPosition, new OperationError("Can only calculate power with integer powers.")).raise()
                return {type: "number", data: {negative: res.isNegative(), number: res, type: res.isInteger() ? "integer" : "float"}}
            },
            async exp(x, ..._) {
                return module.functions.pow(await module.variables.e(), x)
            },
            async ln(x, ..._) {
                x= await intrp.eval(x)
                if(x.type !== "number" || x.data.number.isLessThanOrEqualTo(0)) throw new RaiseCodeError(intrp.currentPosition, new OperationError("The argument must be a number strictly positive.")).raise()
                const res= naturalLogCalculation(x.data.number)
                if(!res) throw new RaiseCodeError(intrp.currentPosition, new OperationError("Invalid number given for this function.")).raise()
                return {type: "number", data: {type: res.isInteger() ? "integer" : "float", negative: res.isNegative(), number: res}}
            }
        },
        objects: {}
    }

    return module
}
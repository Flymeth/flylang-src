import { cacheInterface } from "../defaultCache";
import {BigNumber} from "bignumber.js";
import Interpreter from "../interpreter";
import RaiseFlyLangCompilerError from "../../errors/raiseError";
import OperationError from "../../errors/interpreter/operationError";
import { NumberReturn } from "../../parser/objects/number";

const pi = new BigNumber("3.1415926535897932384626433832795028841971693993751")
const [halfPI, twoPI, powedPI] = [pi.dividedBy(2), pi.multipliedBy(2), pi.pow(2)]
/**
 * Calculate cos with the Bhaskara Formula
 * @link https://en.wikipedia.org/wiki/Bhaskara_I%27s_sine_approximation_formula
 */
 function BhaskaraCosCalculation(x: BigNumber): BigNumber {
    while(x.isGreaterThan(halfPI)) x = x.minus(twoPI)
    while(x.isLessThan(halfPI.multipliedBy(-1))) x = x.plus(twoPI)

    if(x.isGreaterThan(pi)) return BhaskaraCosCalculation(x.minus(halfPI)).multipliedBy(-1)

    const powedX = x.pow(2)
    return powedPI.minus(powedX.multipliedBy(4)).dividedBy(powedPI.plus(powedX))
}

export default function modl(intrp : Interpreter): cacheInterface["builtin"] {
    const module: cacheInterface["builtin"] = {
        variables: {
            pi: async () => (
                {type: "number", data: {negative: false, type: "float", number: pi}}
            )
        },
        functions: {
            async cos(nb, ..._) {
                nb = await intrp.eval(nb)
                if(nb.type !== "number" || nb.data.number.isNaN()) throw new RaiseFlyLangCompilerError(new OperationError(intrp.currentPosition, "Cannot perform a cosine with a non-number value.")).raise()
                
                const res =  BhaskaraCosCalculation(nb.data.number)
                return {type: "number", data: {number: res, negative: res.isNegative(), type: res.isInteger() ? "integer" : "float"}}
            },
            async sin(nb, ..._) {
                nb = await intrp.eval(nb)
                if(nb.type !== "number" || nb.data.number.isNaN()) throw new RaiseFlyLangCompilerError(new OperationError(intrp.currentPosition, "Cannot perform a sine with a non-number value.")).raise()
                
                let x = nb.data.number
                while(x.isGreaterThan(pi)) x = x.minus(twoPI)
                while(x.isLessThan(0)) x = x.plus(twoPI)
                
                const cos = BhaskaraCosCalculation(x)
                
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
                if(nb.type !== "number" || nb.data.number.isNaN()) throw new RaiseFlyLangCompilerError(new OperationError(intrp.currentPosition, "Cannot perform a factorial with a non-number value.")).raise()
                
                let res = new BigNumber(1)
                for(let i = nb.data.number; i.isGreaterThan(1); i= i.minus(1)) res= res.multipliedBy(i)
                return {type: "number", data: {negative: res.isNegative(), number: res, type: res.isInteger() ? "integer" : "float"}}
            },
            async sqrt(nb, ..._) {
                nb = await intrp.eval(nb)
                if(nb.type !== "number" || nb.data.number.isNaN() || nb.data.number.isLessThan(0)) throw new RaiseFlyLangCompilerError(new OperationError(intrp.currentPosition, "Square root can only be calculated with a positive number.")).raise()
                const res = nb.data.number.sqrt()
                return {type: "number", data: {negative: false, number: res, type: res.isInteger() ? "integer" : "float"}}
            }
        },
        objects: {}
    }

    return module
}
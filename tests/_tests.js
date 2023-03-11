const {BigNumber} = require('bignumber.js')

const angle = Math.PI / 2 + .25
const n = new BigNumber(angle)


const pi = new BigNumber("3.1415926535897932384626433832795028841971693993751")
/**
 * Calculate cos with the Bhaskara Formula
 * @link https://en.wikipedia.org/wiki/Bhaskara_I%27s_sine_approximation_formula
 */
function BhaskaraCosCalculation(x) {
    const [halfPI, twoPI, powedPI] = [pi.dividedBy(2), pi.multipliedBy(2), pi.pow(2)]
    while(x.isGreaterThan(halfPI)) x = x.minus(twoPI)
    while(x.isLessThan(halfPI.multipliedBy(-1))) x = x.plus(twoPI)

    if(x.isGreaterThan(halfPI)) return BhaskaraCosCalculation(x.minus(halfPI)).multipliedBy(-1)
    const powedX = x.pow(2)
    return powedPI.minus(twoPI.multipliedBy(2)).dividedBy(powedPI.plus(powedX))
}

console.log(BhaskaraCosCalculation(n).toFixed(), Math.cos(angle));
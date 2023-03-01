/******************************************************************
 * Converts e-Notation Numbers to Plain Numbers
 ******************************************************************
 * @function eToNumber(number)
 * @version  1.00
 * @param   {number} num valid Number in exponent format.
 *          pass number as a string for very large 'e' numbers or with large fractions
 *          (none 'e' number returned as is).
 * @return  {string}  a decimal number string.
 * @author  Mohsen Alyafei
 *          https://stackoverflow.com/questions/1685680/how-to-avoid-scientific-notation-for-large-numbers-in-javascript
 * @date    17 Jan 2020
 *
 *****************************************************************/
export default function eToNumber(num: string): string {
    if(num === "NaN") return num
    let sign = "";
    (num += "").charAt(0) == "-" && (num = num.substring(1), sign = "-");
    let arr = num.split(/[e]/ig);
    if (arr.length < 2) return sign + num;
    let dot = '.', 
        n = arr[0], exp = +arr[1],
        w = (n = n.replace(/^0+/, '')).replace(dot, ''),
      pos = n.split(dot)[1] ? n.indexOf(dot) + exp : w.length + exp,
      E   = pos - w.length, s = "" + BigInt(w);
      w   = exp >= 0 ? (E >= 0 ? s + "0".repeat(E) : r()) : (pos <= 0 ? "0" + dot + "0".repeat(Math.abs(pos)) + s : r());
    
    let L= w.split(dot); if (L[0]=="0" && L[1]=="0" || (+w==0 && +s==0) ) w = "0"; //** added 9/10/2021
    return sign + w;
    function r() {return w.replace(new RegExp(`^(.{${pos}})(.)`), `$1${dot}$2`)}
}
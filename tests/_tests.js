const m = require('markdown-js')

const md = "#hello\n> That's a paragraph"

console.log(m.makeHtml(md))
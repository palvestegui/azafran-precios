const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
const pStart = code.indexOf('function ProductsView(');
const pEnd = code.indexOf('// REGULAR PAYMENTS VIEW');

const newView = fs.readFileSync('ProductsView.txt', 'utf-8');

code = code.substring(0, pStart) + newView + '\n\n' + code.substring(pEnd);
fs.writeFileSync('src/App.tsx', code);
console.log("Successfully replaced ProductsView");

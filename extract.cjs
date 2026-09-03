const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf-8');
const pStart = code.indexOf('function ProductsView(');
let pEnd = code.indexOf('// REGULAR PAYMENTS VIEW');
// Backtrack to the end of ProductsView
const pView = code.substring(pStart, pEnd);
fs.writeFileSync('ProductsView.txt', pView);
console.log("Extracted!");

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /function ProductsView\(\{[\s\S]*?export default function App/;
let match = regex.exec(code);
if (match) {
  fs.writeFileSync('products_view_tmp.txt', match[0]);
  console.log("Extracted");
}

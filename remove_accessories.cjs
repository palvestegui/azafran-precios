const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /\s*\{\/\* ACCESSORIES SECTION \*\/\}\s*<div className="space-y-6">[\s\S]*?(?=<\/div>\n    <\/div>\n  \);\n\}\n\n\/\/ ----------------------------------------------------------------------------\n\/\/ PRODUCTS VIEW)/;

const newCode = code.replace(regex, '');

if (newCode !== code) {
  fs.writeFileSync('src/App.tsx', newCode);
  console.log("Accessories removed from MaterialsView");
} else {
  console.log("Regex didn't match.");
}

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regexToRemove = /    <\/div>\n  \);\n\}\n\n\/\/ ----------------------------------------------------------------------------\n\n      \)\}/;

code = code.replace(regexToRemove, `      )}`);

fs.writeFileSync('src/App.tsx', code);
console.log("Syntax fixed part 1");

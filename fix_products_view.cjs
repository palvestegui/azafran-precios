const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /\{\/\* OTHER INGREDIENTS SECTION \*\/\}[\s\S]*?(?=\{\/\* TABLA COMPARATIVA DE TELAS \*\/\} )/g;
let matches = [...code.matchAll(/\{\/\* OTHER INGREDIENTS SECTION \*\/\}[\s\S]*?(?=\{\/\* TABLA COMPARATIVA DE TELAS \*\/\} )/g)];
// It might not have a space before the comment closing brace, let's use a simpler regex

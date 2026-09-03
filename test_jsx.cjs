const fs = require('fs');
const babel = require('@babel/parser');

const code = fs.readFileSync('src/App.tsx', 'utf-8');
try {
  babel.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript']
  });
  console.log("Parse success");
} catch (e) {
  console.log("Parse error:", e.message, "at line", e.loc.line, "col", e.loc.column);
}

const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Replace the OTHER INGREDIENTS SECTION in MaterialsView
const otherIngredientsMaterialsRegex = /\{\/\* OTHER INGREDIENTS SECTION \*\/\}[\s\S]*?(?=\{\/\* \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- \*\/\}[\s\S]*?\/\/ PRODUCTS VIEW)/;
// Wait, the end of MaterialsView is followed by `// PRODUCTS VIEW`.

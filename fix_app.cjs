const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /      \)\}\n    <\/div>\n    <\/div>\n    <\/div>\n  \);\n\}/g;

code = code.replace(regex, `      )}\n    </div>\n    </div>\n    </div>\n    </div>\n  );\n}`);

fs.writeFileSync('src/App.tsx', code);

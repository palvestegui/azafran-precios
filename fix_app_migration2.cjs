const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /const migratedMaterials = \([\s\S]*?return m;\n          \}\);/;

const replacement = `          const migratedMaterials = (c.materials || DEFAULT_CONFIG.materials).map(m => {
            const cat = m.category || 'other';
            if (cat === 'other') {
              const nameLower = m.name.toLowerCase();
              const isExcluded = nameLower.includes('hilo') || nameLower.includes('broches') || nameLower.includes('hebillas plástico (s)');
              if (!isExcluded) {
                return { ...m, category: 'accessory' };
              } else {
                return { ...m, category: 'other' };
              }
            }
            return m;
          });`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Fixed migration");
} else {
  console.log("Could not find regex");
}

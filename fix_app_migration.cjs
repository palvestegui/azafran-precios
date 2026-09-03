const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /setConfig\(\{[\s\S]*?\.\.\.DEFAULT_CONFIG,[\s\S]*?\.\.\.c,[\s\S]*?materials: c\.materials \|\| DEFAULT_CONFIG\.materials,/;

const replacement = `
          // Migrate materials: move everything in 'other' to 'accessory' EXCEPT specific ones
          const migratedMaterials = (c.materials || DEFAULT_CONFIG.materials).map(m => {
            if (m.category === 'other') {
              const nameLower = m.name.toLowerCase();
              const isExcluded = nameLower.includes('hilo') || nameLower.includes('broches') || nameLower.includes('hebillas plástico (s)');
              if (!isExcluded) {
                return { ...m, category: 'accessory' };
              }
            }
            return m;
          });

          setConfig({
            ...DEFAULT_CONFIG,
            ...c,
            materials: migratedMaterials,`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);

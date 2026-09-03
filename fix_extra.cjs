const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(`  const removeMaterial = (id: string) => {
    onChange({
      ...config,
      materials: config.materials.filter((m) => m.id !== id),
    });
  };
  };`, `  const removeMaterial = (id: string) => {
    onChange({
      ...config,
      materials: config.materials.filter((m) => m.id !== id),
    });
  };`);

fs.writeFileSync('src/App.tsx', code);
console.log("Fixed extra bracket");

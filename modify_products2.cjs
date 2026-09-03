const fs = require('fs');
let view = fs.readFileSync('ProductsView.txt', 'utf-8');

const mappingRegex = /(<div className="space-y-6">\n\s*\{config\.products\.map\(\(prod\) => \{)[\s\S]*/;

const mappingMatch = view.match(mappingRegex);

if (mappingMatch) {
  let innerProducts = mappingMatch[0];
  // Since we take everything to the end, let's replace the outer return carefully
  
  // Replace the old card wrapper with the collapsible one
  const oldCardStart = /<div\n\s*key=\{prod\.id\}\n\s*className="bg-stone-900 border border-stone-800 rounded-3xl p-6 relative group overflow-hidden"\n\s*>\n\s*<div className="absolute top-0 right-0 w-32 h-32 bg-orange-500\/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" \/>\n\s*<div className="relative z-10">\n\s*<div className="flex justify-between items-start mb-6">\n\s*<div className="flex-1">\n\s*<input\n\s*value=\{prod\.name\}\n\s*onChange=\{\(e\) =>\n\s*updateProduct\(prod\.id, \{ name: e\.target\.value \}\)\n\s*\}\n\s*className="bg-transparent text-white font-black italic text-3xl border-b-2 border-transparent hover:border-stone-700 focus:border-orange-500 focus:outline-none w-full max-w-md"\n\s*placeholder="Nombre del Producto"\n\s*\/>\n\s*<\/div>\n\s*<button\n\s*onClick=\{\(\) => removeProduct\(prod\.id\)\}\n\s*className="text-stone-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"\n\s*title="Eliminar producto"\n\s*>\n\s*<Trash2 className="w-5 h-5" \/>\n\s*<\/button>\n\s*<\/div>/g;

  innerProducts = innerProducts.replace(oldCardStart, (match) => {
    return `<div
              key={prod.id}
              className="bg-stone-900 border border-stone-800 rounded-3xl relative group overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />

              <div className="relative z-10">
                {/* Collapsible Header */}
                <div 
                  className="flex justify-between items-center p-6 cursor-pointer hover:bg-stone-800/30 transition-colors"
                  onClick={() => toggleProduct(prod.id)}
                >
                  <div className="flex-1" onClick={(e) => e.stopPropagation()}>
                    <input
                      value={prod.name}
                      onChange={(e) => updateProduct(prod.id, { name: e.target.value })}
                      className="bg-transparent text-white font-black italic text-3xl border-b-2 border-transparent hover:border-stone-700 focus:border-orange-500 focus:outline-none w-full max-w-md"
                      placeholder="Nombre del Producto"
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeProduct(prod.id); }}
                      className="text-stone-600 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Eliminar producto"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button className="text-stone-500">
                      {expandedProducts[prod.id] ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                    </button>
                  </div>
                </div>
                
                <AnimatePresence>
                  {expandedProducts[prod.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 pt-0 space-y-8">`;
  });
  
  const mapEndRegex = /<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\);\n\s*\}\)/g;
  innerProducts = innerProducts.replace(mapEndRegex, `                      </div>\n                    </motion.div>\n                  )}\n                </AnimatePresence>\n              </div>\n            </div>\n          );\n        })`);

  innerProducts = `{activeTab === 'products' && (
        ${innerProducts.replace(/\}$/, '')}
      )}
      
      {activeTab === 'accessories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-300">
          {config.materials
            .filter((m) => m.category === "accessory")
            .map((mat) => (
              <div
                key={mat.id}
                className="bg-stone-900 border border-stone-800 p-4 rounded-2xl flex flex-col gap-3 group relative"
              >
                <button
                  onClick={() => removeMaterial(mat.id)}
                  className="absolute top-4 right-4 text-stone-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <input
                  value={mat.name}
                  onChange={(e) =>
                    updateMaterial(mat.id, { name: e.target.value })
                  }
                  className="bg-transparent text-white font-bold text-lg border-b border-transparent hover:border-stone-700 focus:border-orange-500 focus:outline-none w-[90%]"
                />
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
                      Unidad
                    </label>
                    <select
                      value={mat.unit}
                      onChange={(e) =>
                        updateMaterial(mat.id, { unit: e.target.value as Unit })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-sm text-white focus:outline-none"
                    >
                      <option value="unit">Unidad</option>
                      <option value="100pack">Ciento</option>
                      <option value="dozen">Docena</option>
                      <option value="m">Metros</option>
                      <option value="spool">Cono</option>
                      <option value="service">Servicio</option>
                    </select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
                      Costo Unit. (Bs)
                    </label>
                    <input
                      type="number"
                      value={mat.pricePerUnit}
                      onChange={(e) =>
                        updateMaterial(mat.id, {
                          pricePerUnit: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-sm font-mono text-orange-400 focus:outline-none text-right"
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}`;
      
  view = view.replace(mappingRegex, innerProducts);
} else {
  console.log("MAPPING NOT FOUND 2");
}

fs.writeFileSync('ProductsView.txt', view);
console.log("Modified ProductsView 2!");

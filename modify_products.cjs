const fs = require('fs');
let view = fs.readFileSync('ProductsView.txt', 'utf-8');

view = view.replace(/function ProductsView\(\{[\s\S]*?\}\) \{/, 
`function ProductsView({
  config,
  onChange,
}: {
  config: GlobalConfig;
  onChange: (c: GlobalConfig) => void;
}) {
  const [activeTab, setActiveTab] = useState<'products' | 'accessories'>('products');
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});
`);

view = view.replace(/const removeProduct = \(id: string\) => \{[\s\S]*?\}\);/,
`const removeProduct = (id: string) => {
    onChange({
      ...config,
      products: config.products.filter((p) => p.id !== id),
    });
  };

  const toggleProduct = (id: string) => {
    setExpandedProducts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const addMaterial = (category: "fabric" | "other" | "accessory") => {
    onChange({
      ...config,
      materials: [
        {
          id: generateDefaultId(),
          name: "Nuevo",
          category,
          unit: "m",
          pricePerUnit: 0,
        },
        ...config.materials,
      ],
    });
  };

  const updateMaterial = (id: string, updates: Partial<Material>) => {
    onChange({
      ...config,
      materials: config.materials.map((m) =>
        m.id === id ? { ...m, ...updates } : m,
      ),
    });
  };

  const removeMaterial = (id: string) => {
    onChange({
      ...config,
      materials: config.materials.filter((m) => m.id !== id),
    });
  };`);

// Update Header
const headerRegex = /<div className="flex justify-between items-end border-b border-stone-800 pb-4">[\s\S]*?<\/button>\n\s*<\/div>/;
const newHeader = `<div className="flex flex-col space-y-4 border-b border-stone-800 pb-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black italic text-white">
              Catálogo de Productos
            </h2>
            <p className="text-stone-400 mt-2 max-w-2xl text-sm">
              Diseña tus recetas de confección y administra accesorios.
            </p>
          </div>
          {activeTab === 'products' ? (
            <button
              onClick={addProduct}
              className="bg-orange-500 text-black px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-orange-400 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Nuevo Producto
            </button>
          ) : (
            <button
              onClick={() => addMaterial('accessory')}
              className="bg-orange-500 text-black px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-orange-400 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Agregar Accesorio
            </button>
          )}
        </div>
        
        <div className="flex gap-6 mt-4">
          <button 
            onClick={() => setActiveTab('products')}
            className={\`px-2 py-2 font-bold uppercase text-sm tracking-widest border-b-2 transition-colors \${activeTab === 'products' ? 'border-orange-500 text-orange-500' : 'border-transparent text-stone-500 hover:text-stone-300'}\`}
          >
            Productos
          </button>
          <button 
            onClick={() => setActiveTab('accessories')}
            className={\`px-2 py-2 font-bold uppercase text-sm tracking-widest border-b-2 transition-colors \${activeTab === 'accessories' ? 'border-orange-500 text-orange-500' : 'border-transparent text-stone-500 hover:text-stone-300'}\`}
          >
            Accesorios
          </button>
        </div>
      </div>`;
view = view.replace(headerRegex, newHeader);

// Now wrap the Product List mapping
const mappingRegex = /(<div className="space-y-6">\n\s*\{config\.products\.map\(\(prod\) => \{)[\s\S]*?(?=\}\n\s*\}\)\}\n\s*<\/div>\n\s*<\/div>\n\s*\}$)/;

const mappingMatch = view.match(mappingRegex);

if (mappingMatch) {
  let innerProducts = mappingMatch[0];
  
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
  
  // Close the AnimatePresence at the end of each product loop
  // Notice that the product map ends with:
  //               </div>
  //             </div>
  //           </div>
  //         );
  //       })}
  const mapEndRegex = /<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*\);\n\s*\}\)/g;
  innerProducts = innerProducts.replace(mapEndRegex, `                      </div>\n                    </motion.div>\n                  )}\n                </AnimatePresence>\n              </div>\n            </div>\n          );\n        })`);

  innerProducts = `{activeTab === 'products' && (
        ${innerProducts}
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
      )}`;
      
  view = view.replace(mappingRegex, innerProducts);
} else {
  console.log("MAPPING NOT FOUND");
}

fs.writeFileSync('ProductsView.txt', view);
console.log("Modified ProductsView!");

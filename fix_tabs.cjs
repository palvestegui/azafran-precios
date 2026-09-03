const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Remove Accessories from MaterialsView
const materialsAccRegex = /      \{\/\* ACCESSORIES SECTION \*\/\}[\s\S]*?<\/div>\n    <\/div>\n  \);\n\}/;
const materialsAccMatch = code.match(materialsAccRegex);

if (materialsAccMatch) {
  code = code.replace(materialsAccRegex, `    </div>\n  );\n}`);
} else {
  console.log("Could not find accessories in MaterialsView");
}

// 2. Modify ProductsView to include the sub-tabs and render either Products or Accessories
const prodStartRegex = /function ProductsView\(\{[\s\S]*?\}\) \{/;
code = code.replace(prodStartRegex, (match) => {
  return match + `\n  const [activeTab, setActiveTab] = useState<'products' | 'accessories'>('products');
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  const toggleProduct = (id: string) => {
    setExpandedProducts(prev => ({...prev, [id]: !prev[id]}));
  };

  const addMaterial = (category: 'fabric' | 'other' | 'accessory') => {
    onChange({
      ...config,
      materials: [
        {
          id: generateDefaultId(),
          name: 'Nuevo',
          category,
          unit: 'm',
          pricePerUnit: 0,
        },
        ...config.materials,
      ]
    });
  };

  const updateMaterial = (id: string, updates: Partial<Material>) => {
    onChange({
      ...config,
      materials: config.materials.map(m => m.id === id ? { ...m, ...updates } : m)
    });
  };

  const removeMaterial = (id: string) => {
    onChange({
      ...config,
      materials: config.materials.filter(m => m.id !== id)
    });
  };`;
});

// Update the Catálogo de Productos header to include sub-tabs
const prodHeaderRegex = /<div className="flex justify-between items-end border-b border-stone-800 pb-4">[\s\S]*?<\/button>\n      <\/div>/;

const newProdHeader = `<div className="flex flex-col space-y-4 border-b border-stone-800 pb-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-3xl font-black italic text-white">
              Catálogo de Productos
            </h2>
            <p className="text-stone-400 mt-2 max-w-2xl text-sm">
              Diseña tus recetas de confección y administra los accesorios.
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
        
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('products')}
            className={\`px-4 py-2 font-bold uppercase text-sm tracking-widest border-b-2 transition-colors \${activeTab === 'products' ? 'border-orange-500 text-orange-500' : 'border-transparent text-stone-500 hover:text-stone-300'}\`}
          >
            Productos
          </button>
          <button 
            onClick={() => setActiveTab('accessories')}
            className={\`px-4 py-2 font-bold uppercase text-sm tracking-widest border-b-2 transition-colors \${activeTab === 'accessories' ? 'border-orange-500 text-orange-500' : 'border-transparent text-stone-500 hover:text-stone-300'}\`}
          >
            Accesorios
          </button>
        </div>
      </div>`;

code = code.replace(prodHeaderRegex, newProdHeader);

// Wrap the product list in activeTab === 'products'
const productListRegex = /<div className="space-y-6">\n\s*\{config\.products\.map\(\(prod\) => \{([\s\S]*?)\n\s*\}\)\}\n\s*<\/div>/;

let productListMatch = code.match(productListRegex);
if(productListMatch) {
  let productListCode = productListMatch[0];
  
  // Make product cards collapsible
  // Add a clickable header to the product card
  const prodCardStartRegex = /<div\n\s*key=\{prod\.id\}\n\s*className="bg-stone-900 border border-stone-800 rounded-3xl p-6 relative group overflow-hidden"\n\s*>/;
  const prodCardInnerStart = `
              <div 
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
                        <div className="p-6 pt-0 space-y-8">
`;
  
  productListCode = productListCode.replace(prodCardStartRegex, prodCardInnerStart);
  
  // Remove the old header:
  const oldHeaderRegex = /<div className="absolute top-0 right-0 w-32 h-32 bg-orange-500\/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" \/>[\s\S]*?<div className="relative z-10">[\s\S]*?<div className="flex justify-between items-start mb-6">[\s\S]*?<div className="flex-1">[\s\S]*?<input[\s\S]*?Nombre del Producto"[\s\S]*?\/>[\s\S]*?<\/div>[\s\S]*?<button[\s\S]*?Eliminar producto"[\s\S]*?>[\s\S]*?<Trash2 className="w-5 h-5" \/>[\s\S]*?<\/button>[\s\S]*?<\/div>/;
  productListCode = productListCode.replace(oldHeaderRegex, ""); // Wait, I already replaced the start, but I need to remove the old header inner parts.
  
  // Actually, let's use a simpler replace strategy for the card inner contents
}


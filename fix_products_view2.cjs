const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /\{\/\* OTHER INGREDIENTS SECTION \*\/\}[\s\S]*?(?=\{\/\* TABLA COMPARATIVA DE TELAS \*\/\} )/;
// wait, the regex above had a space after closing brace in the lookahead. In the file, it's:
// `                </div>\n                {/* TABLA COMPARATIVA DE TELAS */}`
const regex2 = /\{\/\* OTHER INGREDIENTS SECTION \*\/\}[\s\S]*?(?=\{\/\* TABLA COMPARATIVA DE TELAS \*\/\})/g;

let matches = [...code.matchAll(regex2)];
if (matches.length > 0) {
  const newSection = `{/* OTHER INGREDIENTS SECTION */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                    <h4 className="font-bold text-orange-500 text-sm">Insumos</h4>
                    <button
                      onClick={() => addIngredient(prod.id, "other")}
                      className="text-orange-500 hover:text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      + Añadir Insumo
                    </button>
                  </div>
                  {prod.ingredients.filter((ing) => {
                    const m = config.materials.find((mat) => mat.id === ing.materialId);
                    return m?.category === "other";
                  }).length === 0 && (
                    <p className="text-stone-500 text-sm text-center py-2 italic">Sin insumos registrados.</p>
                  )}
                  <div className="space-y-2">
                    {prod.ingredients.map((ing, i) => {
                      const m = config.materials.find((mat) => mat.id === ing.materialId);
                      if (m?.category !== "other") return null;
                      const availableMaterials = config.materials.filter((mat) => mat.category === "other");
                      const mat = config.materials.find((m) => m.id === ing.materialId);
                      const cost = getMaterialCost(mat, ing.quantity);
                      let qtyLabel = "Cantidad";
                      if (mat) {
                        if (mat.unit === "dozen" || mat.unit === "100pack" || mat.unit === "unit") qtyLabel = "Unidades";
                        else if (mat.unit === "m") qtyLabel = "Metros";
                        else if (mat.unit === "spool") qtyLabel = "Conos";
                        else if (mat.unit === "service") qtyLabel = "Cant.";
                      }
                      return (
                        <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-stone-950 p-2 pl-4 rounded-xl border border-stone-800">
                          <div className="flex-1 min-w-[180px]">
                            <select
                              value={ing.materialId}
                              onChange={(e) => updateIngredient(prod.id, i, { materialId: e.target.value })}
                              className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm text-white focus:outline-none"
                            >
                              {availableMaterials.map((m) => (
                                <option key={m.id} value={m.id}>{m.name} (Bs {m.pricePerUnit} / {m.unit})</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24 shrink-0">
                            <label className="text-[11px] uppercase font-bold text-stone-500 block mb-0.5">{qtyLabel}</label>
                            <input
                              type="number"
                              value={ing.quantity}
                              onChange={(e) => updateIngredient(prod.id, i, { quantity: Number(e.target.value) })}
                              className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm font-mono text-orange-400 focus:outline-none text-right"
                            />
                          </div>
                          <div className="w-24 shrink-0 text-right pr-2">
                            <div className="text-[11px] uppercase font-bold text-stone-500 mb-0.5">Suma al costo</div>
                            <div className="font-mono text-sm text-amber-400 font-bold">Bs {cost.toFixed(2)}</div>
                          </div>
                          <button onClick={() => removeIngredient(prod.id, i)} className="text-stone-600 hover:text-red-500 p-2">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ACCESSORIES SECTION */}
                <div className="space-y-4 mt-8">
                  <div className="flex justify-between items-center border-b border-stone-800 pb-2">
                    <h4 className="font-bold text-orange-500 text-sm">Accesorios Adicionales</h4>
                    <button
                      onClick={() => addIngredient(prod.id, "accessory")}
                      className="text-orange-500 hover:text-orange-400 bg-orange-500/10 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    >
                      + Añadir Accesorio
                    </button>
                  </div>
                  {prod.ingredients.filter((ing) => {
                    const m = config.materials.find((mat) => mat.id === ing.materialId);
                    return m?.category === "accessory";
                  }).length === 0 && (
                    <p className="text-stone-500 text-sm text-center py-2 italic">Sin accesorios registrados.</p>
                  )}
                  <div className="space-y-2">
                    {prod.ingredients.map((ing, i) => {
                      const m = config.materials.find((mat) => mat.id === ing.materialId);
                      if (m?.category !== "accessory") return null;
                      const availableMaterials = config.materials.filter((mat) => mat.category === "accessory");
                      const mat = config.materials.find((m) => m.id === ing.materialId);
                      const cost = getMaterialCost(mat, ing.quantity);
                      let qtyLabel = "Cantidad";
                      if (mat) {
                        if (mat.unit === "dozen" || mat.unit === "100pack" || mat.unit === "unit") qtyLabel = "Unidades";
                        else if (mat.unit === "m") qtyLabel = "Metros";
                        else if (mat.unit === "spool") qtyLabel = "Conos";
                        else if (mat.unit === "service") qtyLabel = "Cant.";
                      }
                      return (
                        <div key={i} className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-stone-950 p-2 pl-4 rounded-xl border border-stone-800">
                          <div className="flex-1 min-w-[180px]">
                            <select
                              value={ing.materialId}
                              onChange={(e) => updateIngredient(prod.id, i, { materialId: e.target.value })}
                              className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm text-white focus:outline-none"
                            >
                              {availableMaterials.map((m) => (
                                <option key={m.id} value={m.id}>{m.name} (Bs {m.pricePerUnit} / {m.unit})</option>
                              ))}
                            </select>
                          </div>
                          <div className="w-24 shrink-0">
                            <label className="text-[11px] uppercase font-bold text-stone-500 block mb-0.5">{qtyLabel}</label>
                            <input
                              type="number"
                              value={ing.quantity}
                              onChange={(e) => updateIngredient(prod.id, i, { quantity: Number(e.target.value) })}
                              className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-sm font-mono text-orange-400 focus:outline-none text-right"
                            />
                          </div>
                          <div className="w-24 shrink-0 text-right pr-2">
                            <div className="text-[11px] uppercase font-bold text-stone-500 mb-0.5">Suma al costo</div>
                            <div className="font-mono text-sm text-amber-400 font-bold">Bs {cost.toFixed(2)}</div>
                          </div>
                          <button onClick={() => removeIngredient(prod.id, i)} className="text-stone-600 hover:text-red-500 p-2">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
                `;

  code = code.replace(regex2, newSection + '\n                ');
  fs.writeFileSync('src/App.tsx', code);
  console.log("Replaced");
} else {
  console.log("Not found");
}

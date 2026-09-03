const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /\{\/\* OTHER INGREDIENTS SECTION \*\/\}[\s\S]*?(?=<\/div>\s*\}\s*\/\/ \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\s*\/\/ PRODUCTS VIEW)/;

const newSection = `{/* OTHER INGREDIENTS SECTION */}
      <div className="space-y-6">
        <div className="flex justify-between items-end border-b border-stone-800 pb-4">
          <div>
            <h2 className="text-2xl font-black italic">Insumos</h2>
            <p className="text-stone-400 text-sm mt-1">
              Registra hilos, broches, hebillas de plástico (s).
            </p>
          </div>
          <button
            onClick={() => addMaterial("other")}
            className="bg-orange-500/10 text-orange-500 border border-orange-500/30 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-orange-500/20 font-mono text-xs uppercase tracking-widest font-bold"
          >
            <Plus className="w-3 h-3" /> Agregar Insumo
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {config.materials
            .filter((m) => m.category === "other")
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
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-orange-400 focus:outline-none"
                    >
                      <option value="m">Metro</option>
                      <option value="100pack">Ciento</option>
                      <option value="dozen">Docena</option>
                      <option value="unit">Unidad</option>
                      <option value="spool">Cono</option>
                      <option value="service">Servicio</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
                      Costo (Bs)
                    </label>
                    <input
                      type="number"
                      value={mat.pricePerUnit}
                      onChange={(e) =>
                        updateMaterial(mat.id, {
                          pricePerUnit: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="text-[11px] uppercase font-bold tracking-widest text-stone-500"
                      title="Porcentaje de merma"
                    >
                      Merma (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={mat.wastagePercentage || 0}
                      onChange={(e) =>
                        updateMaterial(mat.id, {
                          wastagePercentage: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-red-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* ACCESSORIES SECTION */}
      <div className="space-y-6">
        <div className="flex justify-between items-end border-b border-stone-800 pb-4">
          <div>
            <h2 className="text-2xl font-black italic">Accesorios adicionales</h2>
            <p className="text-stone-400 text-sm mt-1">
              Registra botones, cierres, ojalillos y otros accesorios.
            </p>
          </div>
          <button
            onClick={() => addMaterial("accessory")}
            className="bg-orange-500/10 text-orange-500 border border-orange-500/30 px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-orange-500/20 font-mono text-xs uppercase tracking-widest font-bold"
          >
            <Plus className="w-3 h-3" /> Agregar Accesorio
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-orange-400 focus:outline-none"
                    >
                      <option value="m">Metro</option>
                      <option value="100pack">Ciento</option>
                      <option value="dozen">Docena</option>
                      <option value="unit">Unidad</option>
                      <option value="spool">Cono</option>
                      <option value="service">Servicio</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold tracking-widest text-stone-500">
                      Costo (Bs)
                    </label>
                    <input
                      type="number"
                      value={mat.pricePerUnit}
                      onChange={(e) =>
                        updateMaterial(mat.id, {
                          pricePerUnit: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-amber-400 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label
                      className="text-[11px] uppercase font-bold tracking-widest text-stone-500"
                      title="Porcentaje de merma"
                    >
                      Merma (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={mat.wastagePercentage || 0}
                      onChange={(e) =>
                        updateMaterial(mat.id, {
                          wastagePercentage: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs font-mono text-red-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
`;

if (code.match(regex)) {
  code = code.replace(regex, newSection);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Replaced!");
} else {
  console.log("Could not find regex");
}

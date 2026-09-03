const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-white font-bold focus:outline-none focus:border-orange-500"\s*>\s*<\/div>/;

const replacement = `className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-white font-bold focus:outline-none focus:border-orange-500"
            >
              {config.products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs uppercase font-bold text-emerald-500 tracking-widest block mb-2">Simular con Tela:</label>
            <select 
              value={selectedFabricId}
              onChange={e => setSelectedFabricId(e.target.value)}
              className="w-full bg-stone-950 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500"
            >
              <option value="">(Sin tela principal)</option>
              {config.materials.filter(m => m.category === 'fabric').map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="h-px bg-stone-800 w-full mb-8" />`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/App.tsx', code);

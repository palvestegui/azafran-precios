const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /function DashboardView.*?\{[\s\S]*?export default function App/m;

const correctDashboard = `function DashboardView({ config }: { config: GlobalConfig }) {
  const [selectedProductId, setSelectedProductId] = useState<string>(config.products[0]?.id || '');
  const product = config.products.find(p => p.id === selectedProductId);
  const [selectedFabricId, setSelectedFabricId] = useState<string>('');

  useEffect(() => {
    if (product && product.defaultFabricId) {
      setSelectedFabricId(product.defaultFabricId);
    }
  }, [selectedProductId, product]);

  const data = useMemo(() => {
    if (!product) return [];
    const analysis = calculateProductAnalysis(product, config, selectedFabricId);
    return [
      { name: 'Materiales', value: analysis.materialCost, color: '#fbbf24' },
      { name: 'Mano de Obra', value: analysis.laborAllocation, color: '#f97316' },
      { name: 'Gastos Fijos', value: analysis.overheadAllocation, color: '#f43f5e' },
      { name: 'Ganancia (Menor)', value: analysis.profitPerUnit, color: '#3b82f6' }
    ];
  }, [product, config, selectedFabricId]);

  if (config.products.length === 0) {
    return <div className="text-center text-stone-500 mt-10">Aún no hay productos creados. Ve a la pestaña 'Productos' para crear uno.</div>;
  }

  const analysis = product ? calculateProductAnalysis(product, config, selectedFabricId) : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black italic">Resumen Master</h2>
          <p className="text-stone-400 text-sm mt-1">Simula tu precio de venta final cambiando la tela.</p>
        </div>
      </div>

      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <label className="text-xs uppercase font-bold text-stone-500 tracking-widest block mb-2">Seleccionar Producto</label>
            <select 
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-white font-bold focus:outline-none focus:border-orange-500"
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
        
        <div className="h-px bg-stone-800 w-full mb-8" />

        {product && analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 bg-stone-900 border border-stone-800 rounded-3xl p-6">
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={140}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => \`\${name} \${(percent * 100).toFixed(0)}%\`}
                    labelLine={true}
                  >
                    {data.map((entry, index) => (
                      <Cell key={\`cell-\${index}\`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => \`Bs \${value.toFixed(2)}\`}
                    contentStyle={{ backgroundColor: '#0c0a09', borderColor: '#292524', borderRadius: '8px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-col justify-center space-y-6">
               <div className="text-center w-full">
                 <div className="text-xs uppercase font-bold text-stone-500 tracking-widest mb-1">Precio de Venta (Menor)</div>
                 <div className="text-4xl font-mono text-white font-black">Bs {analysis.recommendedPrice.toFixed(2)}</div>
                 <div className="text-sm mt-2 font-mono text-orange-400">Margen: {analysis.appliedMargin}%</div>
               </div>
               
               <div className="text-center w-full mt-4">
                 <div className="text-xs uppercase font-bold text-stone-500 tracking-widest mb-1">Precio de Venta (Mayor)</div>
                 <div className="text-3xl font-mono text-stone-300 font-bold">Bs {analysis.recommendedWholesalePrice.toFixed(2)}</div>
                 <div className="text-sm mt-2 font-mono text-emerald-400">Margen: {analysis.appliedWholesaleMargin}%</div>
               </div>
               
               <div className="space-y-4 max-w-sm mx-auto w-full">
                 {data.map((item, i) => (
                   <div key={i} className="flex justify-between items-center bg-stone-950 p-4 rounded-xl border border-stone-800">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="font-bold text-sm text-stone-300">{item.name}</span>
                      </div>
                      <span className="font-mono text-white font-bold">Bs {item.value.toFixed(2)}</span>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App`;

code = code.replace(regex, correctDashboard);
fs.writeFileSync('src/App.tsx', code);

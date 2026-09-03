const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /function DashboardView\(\{ config \}: \{ config: GlobalConfig \}\) \{([\s\S]*?)export default function App\(\)/;
const match = code.match(regex);
if (match) {
  let dashboardBody = match[1];

  // We need to add state for custom prices
  const stateHooks = `  const [customRetailPrice, setCustomRetailPrice] = useState<string>("");
  const [customWholesalePrice, setCustomWholesalePrice] = useState<string>("");

  useEffect(() => {
    // Reset custom prices when product or fabric changes
    setCustomRetailPrice("");
    setCustomWholesalePrice("");
  }, [selectedProductId, selectedFabricId]);`;

  dashboardBody = dashboardBody.replace(
    /useEffect\(\(\) => \{\n    if \(product && product.defaultFabricId\) \{\n      setSelectedFabricId\(product.defaultFabricId\);\n    \}\n  \}, \[selectedProductId, product\]\);/,
    `useEffect(() => {
    if (product && product.defaultFabricId) {
      setSelectedFabricId(product.defaultFabricId);
    }
  }, [selectedProductId, product]);\n\n${stateHooks}`
  );

  // Now replace the pricing blocks
  const pricesRegex = /<div className="flex flex-col justify-center space-y-6">[\s\S]*?<\/div>\n          <\/div>\n        \)\}\n      <\/div>/;

  const pricesReplacement = `<div className="flex flex-col justify-center space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* D2C Card */}
                <div className="bg-white border border-stone-200 rounded-xl p-4 text-center shadow-sm flex flex-col items-center">
                  <div className="text-stone-800 font-bold text-sm mb-4">D2C (Retail)</div>
                  
                  <div className="w-full mb-4">
                    <div className="text-stone-500 text-xs mb-1">Sale Price</div>
                    <input 
                      type="number"
                      value={customRetailPrice !== "" ? customRetailPrice : analysis.recommendedPrice.toFixed(2)}
                      onChange={(e) => setCustomRetailPrice(e.target.value)}
                      className="w-full text-center text-2xl font-bold text-slate-800 focus:outline-none focus:border-b-2 focus:border-emerald-500 bg-transparent"
                    />
                  </div>

                  {(() => {
                    const price = customRetailPrice !== "" ? parseFloat(customRetailPrice) : analysis.recommendedPrice;
                    const grossProfit = price - analysis.costFloor;
                    const profitMargin = price > 0 ? (grossProfit / price) * 100 : 0;
                    const isLoss = grossProfit < 0;

                    return (
                      <>
                        <div className="w-full mb-4 relative">
                          {isLoss && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap z-10">
                              SELLING AT A LOSS
                            </div>
                          )}
                          <div className="text-stone-500 text-xs mb-1">Gross Profit</div>
                          <div className={\`text-2xl font-bold \${isLoss ? 'text-red-400' : 'text-slate-600'}\`}>
                            {grossProfit.toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="w-full pt-4 border-t border-stone-100">
                          <div className="text-stone-500 text-xs mb-1">Profit Margin</div>
                          <div className={\`text-lg font-bold \${isLoss ? 'text-red-400' : 'text-teal-600'}\`}>
                            {profitMargin.toFixed(1)}%
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>

                {/* B2B Card */}
                <div className="bg-[#eef2ec] border border-[#d3e0ce] rounded-xl p-4 text-center shadow-sm flex flex-col items-center">
                  <div className="text-[#115e59] font-bold text-sm mb-4">B2B (Wholesale)</div>
                  
                  <div className="w-full mb-4">
                    <div className="text-stone-500 text-xs mb-1">Sale Price</div>
                    <input 
                      type="number"
                      value={customWholesalePrice !== "" ? customWholesalePrice : analysis.recommendedWholesalePrice.toFixed(2)}
                      onChange={(e) => setCustomWholesalePrice(e.target.value)}
                      className="w-full text-center text-2xl font-bold text-slate-800 focus:outline-none focus:border-b-2 focus:border-emerald-500 bg-transparent"
                    />
                  </div>

                  {(() => {
                    const price = customWholesalePrice !== "" ? parseFloat(customWholesalePrice) : analysis.recommendedWholesalePrice;
                    const grossProfit = price - analysis.costFloor;
                    const profitMargin = price > 0 ? (grossProfit / price) * 100 : 0;
                    const isLoss = grossProfit < 0;

                    return (
                      <>
                        <div className="w-full mb-4 relative">
                          {isLoss && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ff3b3b] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg whitespace-nowrap z-10">
                              SELLING AT A LOSS
                            </div>
                          )}
                          <div className="text-stone-500 text-xs mb-1">Gross Profit</div>
                          <div className={\`text-2xl font-bold \${isLoss ? 'text-[#ff8f8f]' : 'text-slate-600'}\`}>
                            {grossProfit.toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="w-full pt-4 border-t border-[#d3e0ce]">
                          <div className="text-stone-500 text-xs mb-1">Profit Margin</div>
                          <div className={\`text-lg font-bold \${isLoss ? 'text-[#ff8f8f]' : 'text-[#115e59]'}\`}>
                            {profitMargin.toFixed(1)}%
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              <div className="space-y-4 max-w-sm mx-auto w-full mt-4">
                {data.map((item, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center bg-stone-950 p-3 rounded-xl border border-stone-800"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="font-bold text-sm text-stone-300">
                        {item.name}
                      </span>
                    </div>
                    <span className="font-mono text-white font-bold">
                      Bs {item.value.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>`;

  dashboardBody = dashboardBody.replace(pricesRegex, pricesReplacement);

  code = code.replace(match[1], dashboardBody);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Updated DashboardView");
} else {
  console.log("Failed to match DashboardView");
}

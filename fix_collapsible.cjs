const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /\{\/\* TABLA COMPARATIVA DE TELAS \*\/\}[\s\S]*?<div className="space-y-4 mt-8 bg-stone-950 p-6 rounded-2xl border border-stone-800">[\s\S]*?<div className="flex justify-between items-center border-b border-stone-800 pb-2">[\s\S]*?<h4 className="font-bold text-emerald-500 text-sm uppercase tracking-widest">[\s\S]*?Precios Finales por Tela[\s\S]*?<\/h4>[\s\S]*?<\/div>[\s\S]*?<div className="overflow-x-auto">/g;

const match = regex.exec(code);
if (match) {
  const replacement = `{/* TABLA COMPARATIVA DE TELAS */}
                <div className="mt-8 bg-stone-950 rounded-2xl border border-stone-800 overflow-hidden">
                  <button
                    onClick={() => toggleTable(prod.id)}
                    className="w-full flex justify-between items-center p-4 px-6 hover:bg-stone-800/50 transition-colors"
                  >
                    <h4 className="font-bold text-emerald-500 text-sm uppercase tracking-widest">
                      Precios Finales por Tela
                    </h4>
                    {expandedTable[prod.id] ? (
                      <ChevronUp className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-emerald-500" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedTable[prod.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 pt-2 border-t border-stone-800/50">
                          <div className="overflow-x-auto">`;
  
  code = code.replace(regex, replacement);
  
  // Now add closing tags
  const regexEnd = /<\/table>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/;
  
  // Wait, let's just find the end properly.
  // Original end:
  //                    </table>
  //                  </div>
  //                </div>
  //              </div>
  //            </div>
  
  const endReplacement = `                    </table>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>`;
            
  code = code.replace(/<\/table>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?<\/div>/, endReplacement);
  console.log("Success replacing.");
  fs.writeFileSync('src/App.tsx', code);
} else {
  console.log("Not found.");
}

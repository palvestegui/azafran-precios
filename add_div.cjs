const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
`                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                                    </div>
                    </motion.div>`,
`                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Added missing div");

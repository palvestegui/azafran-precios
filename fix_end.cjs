const fs = require('fs');
let lines = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');

// 1569 is 1568 in 0-indexed array.
// I will just replace lines 1569 (index 1568) to 1588 (index 1587) with the correct sequence.
// Let's actually locate it safely.
let code = fs.readFileSync('src/App.tsx', 'utf-8');
const badEnd = `                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
      )}`;

const goodEnd = `                                  })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
      )}`;

code = code.replace(badEnd, goodEnd);
fs.writeFileSync('src/App.tsx', code);
console.log("Fixed end");

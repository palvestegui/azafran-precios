const fs = require('fs');
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
console.log("Fixed final");

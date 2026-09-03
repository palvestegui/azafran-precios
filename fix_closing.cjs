const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const oldStr = `              </div>
            ))}
        </div>
      </div></div>
    </div>
  );
}`;
const newStr = `              </div>
            ))}
        </div>
      </div>
    </div>
  );
}`;
code = code.replace(oldStr, newStr);
fs.writeFileSync('src/App.tsx', code);

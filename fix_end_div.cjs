const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /              <\/div>\n            <\/div>\n          \);\n        \}\)}\n      <\/div>\n    <\/div>\n  \);\n\}/;

const replacement = `              </div>
            </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Fixed missing div");
} else {
  console.log("Could not find regex");
}

const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/DjClientApp.jsx', 'utf8');
code = code.replace(/          \]\);\n\n          if \(\!contractsRes\.ok\) throw new Error\(\`HTTP Error \$\{contractsRes\.status\}\`\);\n          \]\);/g, "          ]);\n\n          if (!contractsRes.ok) throw new Error(`HTTP Error ${contractsRes.status}`);");
fs.writeFileSync('frontend/src/components/DjClientApp.jsx', code);

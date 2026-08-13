const m = require('./node_modules/vite-plugin-obfuscator/dist/index.js');
console.log('type:', typeof m);
console.log('default type:', typeof m.default);
if (m.default) console.log('default keys:', Object.keys(m.default));

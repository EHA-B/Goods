const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src', 'controllers');
const outputFile = path.join(__dirname, 'dist-electron', 'apis', 'Apis.js');

const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('Controller.js'));

let apisCode = `const { ipcMain } = require('electron');
const path = require('path');

function success(data) {
  return { success: true, data };
}
function failure(code, message, details) {
  return { success: false, error: { code, message, details } };
}

`;

// Import all controllers
files.forEach(file => {
  const controllerName = file.replace('.js', '');
  apisCode += `const ${controllerName} = require(path.join(__dirname, '../../src/controllers', '${file}'));\n`;
});

apisCode += '\n';

// Parse each controller and generate endpoints
files.forEach(file => {
  const filePath = path.join(controllersDir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  
  const controllerName = file.replace('Controller.js', '');
  const controllerVar = file.replace('.js', '');

  // Simple regex to match method definitions in a class
  // Looks for lines like: "  async methodName(arg1, arg2) {" or "  methodName(arg) {"
  const methodRegex = /^\s*(?:async\s+)?([a-zA-Z0-9_]+)\s*\(([^)]*)\)\s*\{/gm;
  
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    const methodName = match[1];
    const argsStr = match[2];
    
    // Skip constructor or internal methods
    if (methodName === 'constructor' || methodName.startsWith('_')) continue;
    
    // Parse arguments to pass them
    const args = argsStr.split(',').map(a => a.trim()).filter(a => a !== '' && !a.startsWith('='));
    
    // e.g. api:customer:createCustomer
    const eventName = 'api:' + controllerName + ':' + methodName;
    
    const handlerArgs = ['_event', ...args].join(', ');
    const callArgs = args.join(', ');
    
    apisCode += `// Handles ${methodName} for ${controllerName}
ipcMain.handle('${eventName}', async (${handlerArgs}) => {
  try {
    const result = await ${controllerVar}.${methodName}(${callArgs});
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});\n\n`;
  }
});

fs.writeFileSync(outputFile, apisCode);
console.log('Apis.js generated successfully.');

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = [
  path.join(root, 'server.js'),
  path.join(root, 'public', 'js')
];

function collectJavaScriptFiles(targetPath) {
  const stat = fs.statSync(targetPath);

  if (stat.isFile()) {
    return targetPath.endsWith('.js') ? [targetPath] : [];
  }

  return fs.readdirSync(targetPath, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) {
      return collectJavaScriptFiles(fullPath);
    }
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

const files = targets.flatMap(collectJavaScriptFiles).sort();
let failed = false;

for (const file of files) {
  const relative = path.relative(root, file);
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    failed = true;
    console.error(`Syntax check failed: ${relative}`);
    if (result.stderr) {
      console.error(result.stderr.trim());
    }
  } else {
    console.log(`OK ${relative}`);
  }
}

if (failed) {
  process.exit(1);
}

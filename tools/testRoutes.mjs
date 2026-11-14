import fs from 'node:fs';

const content = fs.readFileSync('out-admin/_worker.js', 'utf-8');
const rMatch = content.match(/routePath:\s*"[^"]+"/g);
console.log('Total routes in _worker.js:', rMatch ? rMatch.length : 0);
if (rMatch) {
  const uniqueRoutes = [...new Set(rMatch)];
  console.log(uniqueRoutes.join('\n'));
}

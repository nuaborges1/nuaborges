import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

export function patchXmlBuilder() {
  const targetPath = path.join(
    rootDir,
    'node_modules',
    '@aws-sdk',
    'xml-builder',
    'dist-es',
    'xml-parser.browser.js'
  );

  if (!fs.existsSync(targetPath)) {
    console.warn('⚠️ [patchXmlBuilder] Target not found:', targetPath);
    return false;
  }

  const current = fs.readFileSync(targetPath, 'utf8');
  if (current.includes('export { parseXML } from "./xml-parser.js";')) {
    console.log('✅ [patchXmlBuilder] @aws-sdk/xml-builder already patched to use pure JS parser.');
    return true;
  }

  const patchContent = `// Patched for Cloudflare Workers / Pages Functions (pure JS XML parser without DOMParser)
export { parseXML } from "./xml-parser.js";
`;

  fs.writeFileSync(targetPath, patchContent, 'utf8');
  console.log('✅ [patchXmlBuilder] Successfully patched @aws-sdk/xml-builder/dist-es/xml-parser.browser.js to use pure JS parser.');
  return true;
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('patchXmlBuilder.mjs')) {
  patchXmlBuilder();
}

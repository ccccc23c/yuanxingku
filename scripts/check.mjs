import {readdir} from 'node:fs/promises';
import {readCatalog, site, validateCatalog} from './catalog.mjs';

const catalog = await readCatalog();
await validateCatalog(catalog);
const entries = await readdir(new URL('prototypes/', site), {withFileTypes: true});
const ids = new Set(catalog.prototypes.map(item => item.id));
for (const entry of entries) {
  if (!entry.isDirectory() || !ids.has(entry.name)) {
    throw new Error(`发布目录包含未登记的原型或文件 ${entry.name}。请将草稿放在 drafts/。`);
  }
}
console.log(`检查通过，共 ${catalog.prototypes.length} 个原型、${catalog.categories.length} 个分类。`);

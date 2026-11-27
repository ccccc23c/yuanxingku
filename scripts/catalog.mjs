import {readFile, stat} from 'node:fs/promises';

export const site = new URL('../site/', import.meta.url);
export const catalogFile = new URL('catalog.json', site);
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function readCatalog() {
  return JSON.parse(await readFile(catalogFile, 'utf8'));
}

function ensure(valid, message) {
  if (!valid) throw new Error(message);
}

export async function validateCatalog(catalog) {
  ensure(Array.isArray(catalog?.categories) && Array.isArray(catalog?.prototypes), '原型列表格式无效。');
  const categoryIds = new Set();
  const categoryNames = new Set();
  for (const category of catalog.categories) {
    ensure(typeof category?.id === 'string' && slug.test(category.id) && category.id !== 'uncategorized', '分类标识无效。');
    ensure(typeof category.name === 'string' && category.name.trim() && category.name.length <= 40, '分类名称需为 1 至 40 个字符。');
    const name = category.name.trim().toLowerCase();
    ensure(!categoryIds.has(category.id) && !categoryNames.has(name), '分类名称和标识不能重复。');
    categoryIds.add(category.id);
    categoryNames.add(name);
  }
  const prototypeIds = new Set();
  for (const item of catalog.prototypes) {
    ensure(typeof item?.id === 'string' && slug.test(item.id) && !prototypeIds.has(item.id), '原型标识无效或重复。');
    prototypeIds.add(item.id);
    ensure(typeof item.title === 'string' && item.title.trim() && item.title.length <= 80, `原型 ${item.id} 的菜单名称需为 1 至 80 个字符。`);
    ensure(item.categoryId === null || categoryIds.has(item.categoryId), `原型 ${item.title} 的分类不存在。`);
    ensure(item.description === undefined || typeof item.description === 'string', `原型 ${item.title} 的简介格式无效。`);
    const entry = await stat(new URL(`prototypes/${item.id}/index.html`, site)).catch(() => null);
    ensure(entry?.isFile(), `原型 ${item.title} 缺少 index.html。`);
  }
}

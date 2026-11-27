import {publishCatalog, readPublishedCatalog} from './github-catalog.js';

const form = document.querySelector('#editor');
const rows = document.querySelector('#categories');
const assignments = document.querySelector('#assignments');
const status = document.querySelector('#status');
const tokenInput = document.querySelector('#token');
const local = location.hostname === '127.0.0.1';
let catalog;
let revision;
const embedded = window.parent !== window;
document.body.classList.toggle('embedded', embedded);
if (!local) {
  document.querySelector('#authorization').hidden = false;
  tokenInput.required = true;
  form.querySelector('.save').textContent = '发布修改';
  document.querySelector('#editor-intro').textContent = '新增、改名或删除分类。删除分类后，原型会移到「未分类」。发布后，访客刷新可看到新版。';
}

function categoryOptions(select, selectedId) {
  select.replaceChildren(new Option('未分类', ''));
  for (const category of catalog.categories) select.add(new Option(category.name || '未命名分类', category.id));
  select.value = selectedId ?? '';
}

function refreshCategoryOptions() {
  for (const [index, select] of [...assignments.querySelectorAll('select')].entries()) {
    categoryOptions(select, catalog.prototypes[index].categoryId);
  }
}

function renderAssignments() {
  assignments.replaceChildren(...catalog.prototypes.map(item => {
    const row = document.createElement('div');
    row.className = 'edit-row prototype-row';
    const titleLabel = document.createElement('label');
    const title = document.createElement('input');
    title.required = true;
    title.maxLength = 80;
    title.value = item.title;
    title.addEventListener('input', () => { item.title = title.value; });
    titleLabel.append('菜单名称', title);
    const categoryLabel = document.createElement('label');
    const select = document.createElement('select');
    categoryOptions(select, item.categoryId);
    select.addEventListener('change', () => { item.categoryId = select.value || null; });
    categoryLabel.append('所属分类', select);
    row.append(titleLabel, categoryLabel);
    return row;
  }));
}

function addRow(category) {
  const row = document.createElement('div');
  row.className = 'edit-row';
  const input = document.createElement('input');
  input.required = true;
  input.maxLength = 40;
  input.placeholder = '输入分类名称';
  input.setAttribute('aria-label', '分类名称');
  input.value = category.name;
  input.addEventListener('input', () => {
    category.name = input.value;
    refreshCategoryOptions();
  });
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = '删除分类';
  remove.addEventListener('click', () => {
    catalog.categories = catalog.categories.filter(item => item !== category);
    for (const item of catalog.prototypes) if (item.categoryId === category.id) item.categoryId = null;
    row.remove();
    refreshCategoryOptions();
  });
  row.append(input, remove);
  rows.append(row);
  return input;
}

document.querySelector('#add').addEventListener('click', () => {
  const category = {id: `category-${crypto.randomUUID()}`, name: ''};
  catalog.categories.push(category);
  addRow(category).focus();
  refreshCategoryOptions();
});

function prepareCatalog() {
  const categories = catalog.categories.map(item => ({...item, name: item.name.trim()}));
  const names = categories.map(item => item.name.toLowerCase());
  if (names.some(name => !name)) throw new Error('请填写分类名称。');
  if (new Set(names).size !== names.length) throw new Error('分类名称不能重复。');
  const prototypes = catalog.prototypes.map(item => ({...item, title: item.title.trim()}));
  if (prototypes.some(item => !item.title)) throw new Error('请填写每个原型的菜单名称。');
  return {...catalog, categories, prototypes};
}

async function saveLocalDraft(next) {
  const response = await fetch('./catalog', {
    method: 'PUT',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      revision,
      categories: next.categories,
      prototypes: Object.fromEntries(next.prototypes.map(({id, title, categoryId}) => [id, {title, categoryId}]))
    })
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error);
  revision = payload.revision;
  status.textContent = '本地草稿已保存。关闭管理窗口后可查看修改。';
  if (embedded) window.parent.postMessage('prototype-gallery-saved', location.origin);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const fields = [...form.elements];
  fields.forEach(field => { field.disabled = true; });
  status.textContent = local ? '正在保存…' : '正在提交到 GitHub…';
  try {
    const next = prepareCatalog();
    if (local) {
      await saveLocalDraft(next);
    } else {
      const token = tokenInput.value.trim();
      tokenInput.value = '';
      if (!token.startsWith('github_pat_')) throw new Error('请输入 GitHub 细粒度令牌。');
      revision = await publishCatalog({catalog: next, revision, token});
      status.textContent = '修改已提交。GitHub Pages 部署完成后，访客刷新即可看到。';
      if (embedded) window.parent.postMessage({type: 'prototype-gallery-published', catalog: next}, location.origin);
    }
  } catch (error) {
    status.textContent = `保存失败。 ${error.message}`;
  } finally {
    fields.forEach(field => { field.disabled = false; });
  }
});

try {
  if (local) {
    const response = await fetch('./catalog');
    if (!response.ok) throw new Error('无法读取本地分类。');
    ({catalog, revision} = await response.json());
  } else {
    ({catalog, revision} = await readPublishedCatalog());
  }
  catalog.categories.forEach(addRow);
  renderAssignments();
  form.hidden = false;
} catch (error) {
  status.textContent = error.message;
}

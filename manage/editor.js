const form = document.querySelector('#editor');
const rows = document.querySelector('#categories');
const assignments = document.querySelector('#assignments');
const status = document.querySelector('#status');
let catalog;
let revision;
const embedded = window.parent !== window;
document.body.classList.toggle('embedded', embedded);

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
  remove.textContent = '移除';
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

form.addEventListener('submit', async event => {
  event.preventDefault();
  const fields = [...form.elements];
  fields.forEach(field => { field.disabled = true; });
  status.textContent = '正在保存…';
  try {
    const response = await fetch('./catalog', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        revision,
        categories: catalog.categories.map(item => ({...item, name: item.name.trim()})),
        prototypes: Object.fromEntries(catalog.prototypes.map(({id, title, categoryId}) => [id, {title: title.trim(), categoryId}]))
      })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    revision = payload.revision;
    status.textContent = '本地草稿已保存。查看展示站预览可看到本次修改。';
    if (embedded) window.parent.postMessage('prototype-gallery-saved', location.origin);
  } catch (error) {
    status.textContent = `保存失败。 ${error.message}`;
  } finally {
    fields.forEach(field => { field.disabled = false; });
  }
});

try {
  const response = await fetch('./catalog');
  if (!response.ok) throw new Error('无法读取分类。');
  ({catalog, revision} = await response.json());
  catalog.categories.forEach(addRow);
  renderAssignments();
  form.hidden = false;
} catch (error) {
  status.textContent = error.message;
}

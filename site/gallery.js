const content = document.querySelector('#content');
const menu = document.querySelector('#menu');
const activeId = new URL(location.href).searchParams.get('prototype');

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function link(text, href) {
  const node = element('a', text);
  node.href = href;
  return node;
}

function prototypeLink(id) {
  return `./?prototype=${encodeURIComponent(id)}`;
}

function renderMenu(prototypes) {
  const items = [link('全部原型', './'), ...prototypes.map(item => link(item.title, prototypeLink(item.id)))];
  const activeIndex = activeId === null ? 0 : prototypes.findIndex(item => item.id === activeId) + 1;
  if (activeIndex > 0 || activeId === null) items[activeIndex].setAttribute('aria-current', 'page');
  menu.replaceChildren(...items);
  menu.querySelector('[aria-current]')?.scrollIntoView({block: 'nearest', inline: 'nearest'});
}

function renderLibrary({categories, prototypes}) {
  const section = element('section', '', 'library');
  const filters = element('div', '', 'filters');
  const cards = element('div', '', 'cards');
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', '按分类筛选');
  const categoryNames = new Map(categories.map(category => [category.id, category.name]));
  const options = [{id: '', name: '全部分类'}, ...categories];
  if (prototypes.some(item => item.categoryId === null)) options.push({id: 'uncategorized', name: '未分类'});
  for (const category of options) {
    const button = element('button', category.name);
    button.type = 'button';
    button.addEventListener('click', () => {
      for (const option of filters.children) option.setAttribute('aria-pressed', String(option === button));
      const matches = category.id
        ? prototypes.filter(item => (item.categoryId ?? 'uncategorized') === category.id)
        : prototypes;
      cards.replaceChildren(...matches.map(item => {
        const card = link('', prototypeLink(item.id));
        card.className = 'card';
        const art = element('div', '', 'card-art');
        art.append(document.querySelector('#preview-icon').content.cloneNode(true));
        const copy = element('div', '', 'card-copy');
        copy.append(element('small', categoryNames.get(item.categoryId) ?? '未分类'), element('h2', item.title));
        if (item.description) copy.append(element('p', item.description));
        card.append(art, copy);
        return card;
      }));
      if (!matches.length) cards.append(element('p', '此分类还没有已发布的原型。', 'empty'));
    });
    filters.append(button);
  }
  section.append(element('h1', '全部原型'), element('p', '选择一个原型，在线查看并体验交互。', 'intro'), filters, cards);
  content.replaceChildren(section);
  filters.firstElementChild.click();
}

function renderPrototype(item) {
  document.title = `${item.title} · 原型展示站`;
  const source = `./prototypes/${encodeURIComponent(item.id)}/`;
  const viewer = element('section', '', 'viewer');
  const bar = element('div', '', 'viewer-bar');
  const message = element('p', '', 'message');
  message.setAttribute('role', 'status');
  const copy = element('button', '复制链接');
  copy.type = 'button';
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      message.textContent = '已复制';
    } catch {
      message.textContent = '请从地址栏复制当前链接。';
    }
  });
  const standalone = link('独立打开', source);
  standalone.target = '_blank';
  standalone.rel = 'noopener';
  bar.append(element('h1', item.title), message, copy, standalone);
  const frame = element('iframe');
  frame.title = item.title;
  frame.src = source;
  viewer.append(bar, frame);
  content.replaceChildren(viewer);
}

function renderError(title, message) {
  const section = element('section', '', 'library');
  section.append(element('h1', title), element('p', message, 'intro'), link('返回全部原型', './'));
  content.replaceChildren(section);
}

try {
  const response = await fetch('./catalog.json', {cache: 'no-cache'});
  if (!response.ok) throw new Error('无法读取原型列表');
  const catalog = await response.json();
  renderMenu(catalog.prototypes);
  const selected = catalog.prototypes.find(item => item.id === activeId);
  if (selected) renderPrototype(selected);
  else if (activeId !== null) renderError('未找到原型', '请检查分享链接，或从全部原型中选择。');
  else renderLibrary(catalog);
} catch (error) {
  console.error(error);
  renderError('暂时无法加载原型', '请刷新页面重试。');
} finally {
  content.removeAttribute('aria-busy');
}

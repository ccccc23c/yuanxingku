const catalogUrl = 'https://api.github.com/repos/ccccc23c/yuanxingku/contents/site/catalog.json';
const branch = 'main';
const headers = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2026-03-10'
};

export async function readPublishedCatalog() {
  const response = await fetch(`${catalogUrl}?ref=${branch}`, {headers, cache: 'no-store'});
  if (!response.ok) throw new Error('无法从 GitHub 读取最新原型清单。请稍后重试。');
  const file = await response.json();
  const bytes = Uint8Array.from(atob(file.content), character => character.charCodeAt(0));
  return {catalog: JSON.parse(new TextDecoder().decode(bytes)), revision: file.sha};
}

export async function publishCatalog({catalog, revision, token}) {
  const json = JSON.stringify(catalog, null, 2) + '\n';
  const content = btoa(Array.from(new TextEncoder().encode(json), byte => String.fromCharCode(byte)).join(''));
  const response = await fetch(catalogUrl, {
    method: 'PUT',
    credentials: 'omit',
    redirect: 'error',
    headers: {...headers, 'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
    body: JSON.stringify({branch, sha: revision, content, message: 'Update prototype categories and menu'})
  });
  if (response.status === 401) {
    throw new Error('GitHub 无法验证令牌（401）。请确认已完整复制令牌，且令牌未过期或撤销。');
  }
  if (response.status === 429 || (response.status === 403 &&
      (response.headers.has('retry-after') || response.headers.get('x-ratelimit-remaining') === '0'))) {
    throw new Error('GitHub 暂时限制了请求频率，请稍后再发布。');
  }
  if (response.status === 403 || response.status === 404) {
    const details = await response.json().catch(() => ({}));
    if (/rate limit|login attempts/i.test(details.message ?? '')) {
      throw new Error(`GitHub 暂时限制了请求，请稍后重试（${response.status}）。`);
    }
    throw new Error(`GitHub 未授予仓库写入权限（${response.status}）。请用 ccccc23c 创建令牌，在 Repository access 选中 yuanxingku，并将 Contents 设为 Read and write。`);
  }
  if ([409, 422].includes(response.status)) {
    const latest = await readPublishedCatalog();
    if (latest.revision !== revision) {
      throw new Error('原型清单已有其他更新。请刷新展示站后重新编辑，避免覆盖新内容。');
    }
  }
  if (!response.ok) throw new Error(`GitHub 未接受本次发布（${response.status}）。请稍后重试。`);
  return (await response.json()).content.sha;
}

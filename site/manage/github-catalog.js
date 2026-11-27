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
  if ([401, 403, 404].includes(response.status)) {
    throw new Error('GitHub 拒绝写入。请检查令牌是否有效，并为 yuanxingku 授予 Contents 读写权限。');
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

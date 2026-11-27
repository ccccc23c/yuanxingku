import {createHash, randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {readFile, rename, rm, writeFile} from 'node:fs/promises';
import {extname, isAbsolute, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {catalogFile, readCatalog, site, validateCatalog} from './catalog.mjs';

const port = Number(process.env.PROTOTYPE_PREVIEW_PORT || 4173);
const host = `127.0.0.1:${port}`;
const origin = `http://${host}`;
const sitePath = fileURLToPath(site);
const manager = new URL('../manage/', import.meta.url);
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff2': 'font/woff2'
};
let writes = Promise.resolve();

function json(response, status, data) {
  response.writeHead(status, {'Content-Type': types['.json']});
  response.end(JSON.stringify(data));
}

function version(catalog) {
  return createHash('sha256').update(JSON.stringify(catalog)).digest('hex');
}

async function saveCatalog({revision, categories, prototypes}) {
  const current = await readCatalog();
  if (revision !== version(current)) return null;
  if (!prototypes || current.prototypes.some(item => !Object.hasOwn(prototypes, item.id))) {
    throw new Error('请填写每个原型的菜单名称并选择分类。');
  }
  const next = {
    categories,
    prototypes: current.prototypes.map(item => {
      const {title, categoryId} = prototypes[item.id];
      return {...item, title, categoryId};
    })
  };
  await validateCatalog(next);
  const temporary = new URL(`../.catalog-${randomUUID()}.tmp`, site);
  try {
    await writeFile(temporary, JSON.stringify(next, null, 2) + '\n');
    await rename(temporary, catalogFile);
  } finally {
    await rm(temporary, {force: true});
  }
  return {catalog: next, revision: version(next)};
}

const server = createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.headers.host !== host) return json(response, 403, {error: '请从本机预览地址访问。'});
  try {
    const pathname = decodeURIComponent(new URL(request.url, origin).pathname);
    if (pathname === '/manage/catalog') {
      if (request.method === 'GET') {
        const catalog = await readCatalog();
        return json(response, 200, {catalog, revision: version(catalog)});
      }
      if (request.method !== 'PUT') return json(response, 405, {error: '请求方式无效。'});
      if (request.headers.origin !== origin || request.headers['content-type'] !== 'application/json') {
        return json(response, 403, {error: '请从本机分类管理器保存。'});
      }
      let body = '';
      request.setEncoding('utf8');
      for await (const chunk of request) {
        body += chunk;
        if (body.length > 100_000) return json(response, 413, {error: '分类数据过长。'});
      }
      const changes = JSON.parse(body);
      const pending = writes.then(() => saveCatalog(changes));
      writes = pending.catch(() => {});
      const saved = await pending;
      if (!saved) return json(response, 409, {error: '列表已由其他编辑更新。请刷新管理器后重试。'});
      return json(response, 200, saved);
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return json(response, 405, {error: '请求方式无效。'});
    }
    const managerFiles = {
      '/manage/': 'index.html',
      '/manage/editor.js': 'editor.js',
      '/manage/preview-controls.js': 'preview-controls.js'
    };
    let file;
    if (Object.hasOwn(managerFiles, pathname)) {
      file = fileURLToPath(new URL(managerFiles[pathname], manager));
    } else {
      file = resolve(sitePath, '.' + pathname, ...(pathname.endsWith('/') ? ['index.html'] : []));
      const nested = relative(sitePath, file);
      if (nested === '..' || nested.startsWith('..' + sep) || isAbsolute(nested)) return json(response, 404, {error: '文件不存在。'});
    }
    let data = await readFile(file);
    if (pathname === '/' || pathname === '/index.html') {
      data = data.toString('utf8').replace('<!-- local-management -->', '<script type="module" src="/manage/preview-controls.js"></script>');
    }
    response.writeHead(200, {'Content-Type': types[extname(file)] || 'application/octet-stream'});
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch (error) {
    if (['ENOENT', 'EISDIR'].includes(error.code)) return json(response, 404, {error: '文件不存在。'});
    if (request.method === 'PUT') return json(response, 400, {error: error.message});
    console.error(error);
    return json(response, 500, {error: '无法加载预览。'});
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`展示站预览 ${origin}/\n原型与分类管理 ${origin}/manage/`);
});

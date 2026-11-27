const manage = document.createElement('button');
manage.type = 'button';
manage.textContent = '管理原型';
manage.className = 'manage-trigger';

const dialog = document.createElement('dialog');
dialog.className = 'manage-dialog';
dialog.setAttribute('aria-label', '管理原型');
const header = document.createElement('header');
const title = document.createElement('h2');
title.textContent = '管理原型';
const close = document.createElement('button');
close.type = 'button';
close.textContent = '关闭';
header.append(title, close);

const frame = document.createElement('iframe');
frame.title = '编辑菜单名称和分类';
dialog.append(header, frame);
document.querySelector('.top').append(manage);
document.body.append(dialog);

let changed = false;
window.addEventListener('message', event => {
  if (event.origin === location.origin && event.source === frame.contentWindow && event.data === 'prototype-gallery-saved') {
    changed = true;
  }
});
manage.addEventListener('click', () => {
  if (!frame.hasAttribute('src')) frame.src = '/manage/';
  dialog.showModal();
});
close.addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => {
  if (changed) location.reload();
});

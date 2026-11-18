import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

test('初始页面渲染：功能区、合约链接、新版文案完整，无课程遗留提示', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => null },
  });
  let server;
  try {
    server = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    const { default: App } = await server.ssrLoadModule('/src/App.tsx');
    const html = renderToString(createElement(App));
    for (const text of [
      'Web3 资产控制台 · 主网数据查询与 Sepolia 合约交互',
      'Sepolia 留言合约',
      '真实 ETH 余额查询',
      'ERC-20 代币余额',
      '关于这个 Web3 资产控制台',
      '独立查询区域返回链上数据',
    ]) {
      assert.ok(html.includes(text), `缺少内容：${text}`);
    }
    assert.ok(html.includes('https://sepolia.etherscan.io/address/0x2904d2A5D093d15EbC00d9c2717bCAa251926416'));
    assert.ok(!html.includes('第 01 课'));
    assert.ok(!html.includes('让这份页面变成你的作品'));
  } finally {
    if (server) await server.close();
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else delete globalThis.localStorage;
  }
});

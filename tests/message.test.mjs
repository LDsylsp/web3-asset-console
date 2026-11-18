import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertSuccessfulReceipt,
  validateMessage,
} from '../src/lib/message.ts';

test('空字符串不能提交', () => {
  assert.equal(validateMessage('').error, '请输入留言');
});

test('空白输入不能提交', () => {
  assert.equal(validateMessage(' \n\t ').error, '请输入留言');
});

test('返回实际提交的去空白留言', () => {
  assert.deepEqual(validateMessage(' hello '), {
    message: 'hello', byteLength: 5, error: null,
  });
});

test('280 个 ASCII 字节可以提交', () => {
  assert.equal(validateMessage('a'.repeat(280)).error, null);
});

test('281 个 ASCII 字节被拒绝', () => {
  assert.ok(validateMessage('a'.repeat(281)).error);
});

test('93 个“中”字是 279 字节，可以提交', () => {
  const result = validateMessage('中'.repeat(93));
  assert.equal(result.byteLength, 279);
  assert.equal(result.error, null);
});

test('94 个“中”字是 282 字节，应拒绝', () => {
  const result = validateMessage('中'.repeat(94));
  assert.equal(result.byteLength, 282);
  assert.ok(result.error);
});

test('emoji 按 UTF-8 字节校验：70 个可通过，71 个拒绝', () => {
  assert.equal(validateMessage('😀'.repeat(70)).byteLength, 280);
  assert.equal(validateMessage('😀'.repeat(70)).error, null);
  assert.ok(validateMessage('😀'.repeat(71)).error);
});

test('success 回执通过检查', () => {
  assert.doesNotThrow(() => assertSuccessfulReceipt({ status: 'success' }));
});

test('reverted 回执抛错，不能继续当作成功', () => {
  assert.throws(
    () => assertSuccessfulReceipt({ status: 'reverted' }),
    /交易已上链，但执行失败/,
  );
});

test('中英文混合输入按字节限制', () => {
  const message = '中'.repeat(92) + 'abcd';

  assert.equal(validateMessage(message).byteLength, 280);
  assert.equal(validateMessage(message).error, null);

  assert.ok(validateMessage(message + 'e').error);
});
import test from 'node:test';
import assert from 'node:assert/strict';
import { runMessageTransaction } from '../src/lib/message.ts';

function createSteps(failure) {
  const events = [];
  const request = { message: 'hello' };
  const hash = '0x1234';
  return {
    events,
    steps: {
      onBusy: (busy) => events.push(busy ? 'busy' : 'idle'),
      simulate: async () => {
        events.push('simulate');
        if (failure === 'simulate') throw new Error('Only owner');
        return request;
      },
      send: async (received) => {
        assert.equal(received, request);
        events.push('send');
        if (failure === 'send') throw new Error('User rejected');
        return hash;
      },
      onSubmitted: (received) => {
        assert.equal(received, hash);
        events.push('submitted');
      },
      wait: async (received) => {
        assert.equal(received, hash);
        events.push('wait');
        if (failure === 'wait') throw new Error('RPC timeout');
        return { status: failure === 'revert' ? 'reverted' : 'success' };
      },
      onConfirmed: async () => {
        events.push('confirmed');
        if (failure === 'confirmed') throw new Error('Refresh failed');
      },
    },
  };
}

test('成功：先模拟再发送，等待成功回执后才执行成功逻辑', async () => {
  const { steps, events } = createSteps();
  await runMessageTransaction(steps);
  assert.deepEqual(events, ['busy', 'simulate', 'send', 'submitted', 'wait', 'confirmed', 'idle']);
});

test('模拟失败：不调用发送、不等待回执，并恢复加载状态', async () => {
  const { steps, events } = createSteps('simulate');
  await assert.rejects(runMessageTransaction(steps), /Only owner/);
  assert.deepEqual(events, ['busy', 'simulate', 'idle']);
});

test('拒绝发送：不等待回执、不执行成功逻辑，并恢复加载状态', async () => {
  const { steps, events } = createSteps('send');
  await assert.rejects(runMessageTransaction(steps), /User rejected/);
  assert.deepEqual(events, ['busy', 'simulate', 'send', 'idle']);
});

test('回执 reverted：不执行成功逻辑，并恢复加载状态', async () => {
  const { steps, events } = createSteps('revert');
  await assert.rejects(runMessageTransaction(steps), /执行失败/);
  assert.deepEqual(events, ['busy', 'simulate', 'send', 'submitted', 'wait', 'idle']);
});

test('回执请求超时：不能当成交易成功，并恢复加载状态', async () => {
  const { steps, events } = createSteps('wait');
  await assert.rejects(runMessageTransaction(steps), /RPC timeout/);
  assert.deepEqual(events, ['busy', 'simulate', 'send', 'submitted', 'wait', 'idle']);
});

test('成功后的回调异常：仍恢复加载状态，不重复发送交易', async () => {
  const { steps, events } = createSteps('confirmed');
  await assert.rejects(runMessageTransaction(steps), /Refresh failed/);
  assert.equal(events.at(-1), 'idle');
  assert.equal(events.filter((event) => event === 'send').length, 1);
});

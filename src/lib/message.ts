import type { TransactionReceipt } from 'viem';

export const MAX_MESSAGE_BYTES = 280;

// 与 Solidity bytes(newMessage).length 保持一致，而不是计算 JS 字符数量。
export function validateMessage(input: string) {
  const message = input.trim();
  const byteLength = new TextEncoder().encode(message).length;

  if (!message) {
    return { message, byteLength, error: '请输入留言' };
  }
  if (byteLength > MAX_MESSAGE_BYTES) {
    return { message, byteLength, error: '留言不能超过 280 个 UTF-8 字节' };
  }
  return { message, byteLength, error: null };
}

export function assertSuccessfulReceipt(
  receipt: Pick<TransactionReceipt, 'status'>,
): void {
  if (receipt.status !== 'success') {
    throw new Error('交易已上链，但执行失败；留言未更新，请检查权限和输入');
  }
}

type MessageTransactionSteps<Request> = {
  simulate: () => Promise<Request>;
  send: (request: Request) => Promise<`0x${string}`>;
  wait: (hash: `0x${string}`) => Promise<Pick<TransactionReceipt, 'status'>>;
  onSubmitted: (hash: `0x${string}`) => void;
  onConfirmed: () => Promise<void>;
  onBusy: (busy: boolean) => void;
};

// 注入真实操作或测试替身；测试不需要钱包、RPC 或测试 ETH。
export async function runMessageTransaction<Request>(
  steps: MessageTransactionSteps<Request>,
): Promise<void> {
  steps.onBusy(true);
  try {
    const request = await steps.simulate();
    const hash = await steps.send(request);
    steps.onSubmitted(hash);
    const receipt = await steps.wait(hash);
    assertSuccessfulReceipt(receipt);
    await steps.onConfirmed();
  } finally {
    steps.onBusy(false);
  }
}

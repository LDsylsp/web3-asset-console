import { createPublicClient, createWalletClient, custom, http } from 'viem';
import type { EIP1193Provider } from 'viem';
import { mainnet, sepolia } from 'viem/chains';

// 只读客户端：不连接钱包、不签名、不发送交易。
export const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://ethereum-rpc.publicnode.com', {
    timeout: 10_000,
    retryCount: 0,
  }),
});

export const sepoliaPublicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com', {
    timeout: 10_000,
    retryCount: 0,
  }),
});

export const messageStoreAddress =
  '0x2904d2A5D093d15EbC00d9c2717bCAa251926416' as const;

export const messageStoreAbi = [
  {
    type: 'function',
    name: 'message',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'setMessage',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newMessage', type: 'string' }],
    outputs: [],
  },
] as const;

export function createSepoliaWalletClient(provider: EIP1193Provider) {
  return createWalletClient({
    chain: sepolia,
    transport: custom(provider),
  });
}

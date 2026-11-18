import { useState } from 'react';
import { BaseError } from 'viem';
import type { EIP1193Provider } from 'viem';
import type { WalletInfo } from './types/wallet';
import { runMessageTransaction, validateMessage } from './lib/message';
import {
  createSepoliaWalletClient,
  messageStoreAbi,
  messageStoreAddress,
  sepoliaPublicClient,
} from './blockchain';

type MessageStorePanelProps = {
  walletInfo: WalletInfo | null;
};

// App 提供钱包信息；本组件独立管理留言及其请求状态。
export default function MessageStorePanel({ walletInfo }: MessageStorePanelProps) {
  const [contractMessage, setContractMessage] = useState('');
  const [draftMessage, setDraftMessage] = useState('');
  const [isReadingMessage, setIsReadingMessage] = useState(false);
  const [isWritingMessage, setIsWritingMessage] = useState(false);
  const [contractError, setContractError] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [transactionStatus, setTransactionStatus] = useState('');

  async function handleReadContractMessage() {
    setContractError('');
    setIsReadingMessage(true);

    try {
      const message = await sepoliaPublicClient.readContract({
        address: messageStoreAddress,
        abi: messageStoreAbi,
        functionName: 'message',
      });

      setContractMessage(message);
    } catch (error) {
      console.error('读取留言失败：', error);
      setContractError('读取失败，请确认当前网络为 Sepolia');
    } finally {
      setIsReadingMessage(false);
    }
  }

  async function handleWriteContractMessage() {
    setContractError('');
    setTransactionHash('');
    setTransactionStatus('');

    const validation = validateMessage(draftMessage);
    if (validation.error) {
      setContractError(validation.error);
      return;
    }
    const nextMessage = validation.message;
    if (walletInfo?.chainId !== 11155111) {
      setContractError('请先把 MetaMask 切换到 Sepolia');
      return;
    }

    const provider = (
      window as Window & { ethereum?: EIP1193Provider }
    ).ethereum;
    if (!provider || !walletInfo.address) {
      setContractError('请先连接 MetaMask');
      return;
    }

    try {
      const walletClient = createSepoliaWalletClient(provider);
      await runMessageTransaction({
        onBusy: setIsWritingMessage,
        simulate: async () => {
          setTransactionStatus('正在模拟调用，检查合约执行条件...');
          const { request } = await sepoliaPublicClient.simulateContract({
            address: messageStoreAddress,
            abi: messageStoreAbi,
            functionName: 'setMessage',
            args: [nextMessage],
            account: walletInfo.address as `0x${string}`,
          });
          return request;
        },
        send: async (request) => {
          const chainId = await walletClient.getChainId();
          const [account] = await walletClient.getAddresses();
          if (chainId !== 11155111 || account?.toLowerCase() !== walletInfo.address.toLowerCase()) {
            throw new Error('钱包网络或账号已变化，请重新连接后重试');
          }
          setTransactionStatus('模拟通过，请在 MetaMask 中确认 Sepolia 交易');
          return walletClient.writeContract(request);
        },
        onSubmitted: (hash) => {
          setTransactionHash(hash);
          setTransactionStatus('交易已提交，正在等待链上回执...');
        },
        wait: (hash) => sepoliaPublicClient.waitForTransactionReceipt({ hash }),
        onConfirmed: async () => {
          setTransactionStatus('交易执行成功，正在重新读取留言...');
          setDraftMessage('');
          try {
            const message = await sepoliaPublicClient.readContract({
              address: messageStoreAddress,
              abi: messageStoreAbi,
              functionName: 'message',
            });
            setContractMessage(message);
          } catch (error) {
            console.error('交易成功后刷新留言失败：', error);
            setContractError('交易已成功，但刷新留言失败，请点击“读取链上留言”重试，不要重复提交');
          }
          setTransactionStatus('交易执行成功（已检查链上回执）');
        },
      });
    } catch (error) {
      setTransactionStatus('');
      console.error('更新留言失败：', error);
      setContractError(
        error instanceof BaseError
          ? error.shortMessage
          : error instanceof Error ? error.message : '交易失败，请重试'
      );
    }
  }

  return (
      <section aria-labelledby="contract-title">
        <h2 id="contract-title">Sepolia 留言合约</h2>
        <p>只在 Sepolia 测试网读写，不使用主网资金。</p>
        <p style={{ overflowWrap: 'anywhere' }}>
          合约：
          <a
            href={`https://sepolia.etherscan.io/address/${messageStoreAddress}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {messageStoreAddress}
          </a>
        </p>

        <button
          type="button"
          onClick={handleReadContractMessage}
          disabled={isReadingMessage || isWritingMessage}
        >
          {isReadingMessage ? '读取中...' : '读取链上留言'}
        </button>

        <label>
          新留言：
          <input
            type="text"
            value={draftMessage}
            maxLength={280}
            onChange={(event) => setDraftMessage(event.target.value)}
            placeholder="输入不超过 280 个 UTF-8 字节的留言"
            disabled={isWritingMessage}
          />
        </label>

        <button
          type="button"
          onClick={handleWriteContractMessage}
          disabled={isWritingMessage}
        >
          {isWritingMessage ? '等待交易确认...' : '写入链上留言'}
        </button>

        {contractMessage && (
          <p role="status">当前链上留言：{contractMessage}</p>
        )}
        {transactionStatus && <p role="status">{transactionStatus}</p>}
        {transactionHash && (
          <p style={{ overflowWrap: 'anywhere' }}>
            交易哈希：
            <a
              href={`https://sepolia.etherscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {transactionHash}
            </a>
          </p>
        )}
        {contractError && (
          <p role="alert">{contractError}</p>
        )}
      </section>
  );
}

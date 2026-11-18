import AssetCard from './AssetCard';
import MessageStorePanel from './MessageStorePanel';
import type { WalletInfo } from './types/wallet';
import { useEffect, useState } from 'react';
import { publicClient } from './blockchain';
import {
  formatEther,
  formatUnits,
  isAddress,
} from 'viem';
import type { EIP1193Provider } from 'viem';
// 第 1 课先用模拟数据：这里没有读取区块链，也没有真实资金。
type Asset = {
  symbol: string;
  name: string;
  balance: string;
  isDemo: boolean;
};

const usdcAddress =
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as const;

const erc20Abi = [
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const initialAssets: Asset[] = [
  { symbol: 'ETH', name: '以太币', balance: '0.025', isDemo: true },
  { symbol: 'USDC', name: '美元稳定币', balance: '120.00', isDemo: true },
  { symbol: 'LEARN', name: '学习币（模拟）', balance: '1000', isDemo: true },
];

// React 组件就是返回界面的函数。首字母大写。
export default function App() {
  const [blockNumber, setBlockNumber] = useState<string | null>(null);
  const [showBalance, setShowBalance] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [assets, setAssets] = useState<Asset[]>(() => {
    const savedAssets = localStorage.getItem('web3-demo-assets');

    if (!savedAssets) {
      return initialAssets;
    }

    try {
      return JSON.parse(savedAssets) as Asset[];
    } catch {
      return initialAssets;
    }
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');
  const [shouldFail, setShouldFail] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletError, setWalletError] = useState('');
  const [tokenInfo, setTokenInfo] = useState<{
    symbol: string;
    decimals: number;
    balance: string;
  } | null>(null);

  const [tokenError, setTokenError] = useState('');
  const [isReadingToken, setIsReadingToken] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const isMainnet = walletInfo?.chainId === 1;
  const [balanceResult, setBalanceResult] = useState<{
    address: string;
    eth: string;
  } | null>(null);
  const [balanceError, setBalanceError] = useState('');
  useEffect(() => {
    localStorage.setItem(
      'web3-demo-assets',
      JSON.stringify(assets)
    );
  }, [assets]);
  const [tokenAddressInput, setTokenAddressInput] = useState(
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
  );
  const [tokenAddressError, setTokenAddressError] = useState('');
  const filteredAssets = assets.filter((asset) =>
  asset.symbol.toLowerCase().includes(keyword.trim().toLowerCase())
  || asset.name.toLowerCase().includes(keyword.trim().toLowerCase())
);

  function handleAddAsset() {
    const newAsset = {
      symbol: `DEMO-${crypto.randomUUID()}`,
      name: '新增模拟资产',
      balance: '0',
      isDemo: true,
    };

    setAssets((previousAssets) => [
      ...previousAssets,
      newAsset,
    ]);
  }

  function handleDeleteAsset(symbol: string) {
    setAssets((previousAssets) =>
      previousAssets.filter((asset) => asset.symbol !== symbol)
    );
  }

  async function handleRefreshAssets() {
    setIsRefreshing(true);
    setRefreshMessage('');
    setBlockNumber(null);

    try {
      if (shouldFail) {
        throw new Error('模拟请求失败，请重试');
      }

      const latestBlock = await publicClient.getBlockNumber({
        cacheTime: 0,
      });

      setBlockNumber(latestBlock.toString());
      setRefreshMessage('区块高度读取成功');
    } catch (error) {
      console.error('读取区块高度失败：', error);
      setRefreshMessage(
        error instanceof Error
          ? error.message
          : '读取失败，请重试'
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleCheckBalance() {
    const address = addressInput.trim();

    setBalanceError('');
    setBalanceResult(null);

    if (!isAddress(address)) {
      setBalanceError('请输入有效的以太坊地址');
      return;
    }

    if (walletInfo !== null && !isMainnet) {
      setBalanceError('当前钱包不在以太坊主网，不能查询主网钱包余额');
      return;
    }

    setIsCheckingBalance(true);

    try {
      const balanceWei = await publicClient.getBalance({ address });

      setBalanceResult({
        address,
        eth: formatEther(balanceWei),
      });
    } catch (error) {
      console.error('余额查询失败：', error);
      setBalanceError('查询失败，请检查网络或稍后重试');
    } finally {
      setIsCheckingBalance(false);
    }
  }

  async function handleConnectWallet() {
    setIsConnecting(true);
    setWalletError('');
    setWalletInfo(null);

    try {
      const provider = (
        window as Window & { ethereum?: EIP1193Provider }
      ).ethereum;

      if (!provider) {
        throw new Error('未检测到钱包，请用安装了 MetaMask 的 Chrome 打开');
      }

      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      });

      const address = accounts[0];

      if (!address) {
        throw new Error('钱包没有返回可用地址');
      }

      const chainIdHex = await provider.request({
        method: 'eth_chainId',
      });

      setWalletInfo({
        address,
        chainId: Number.parseInt(chainIdHex, 16),
      });

      // 把钱包地址填入你已有的余额查询框。
      setAddressInput(address);
      setBalanceResult(null);
      setBalanceError('');
    } catch (error) {
      console.error('钱包连接失败：', error);

      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? error.code
          : undefined;

      setWalletError(
        code === 4001
          ? '你取消了连接，可以再次点击重试'
          : code === -32002
            ? '已有钱包请求等待处理，请打开 MetaMask 查看'
            : error instanceof Error
              ? error.message
              : '连接失败，请检查钱包后重试'
      );
    } finally {
      setIsConnecting(false);
    }
  }

  useEffect(() => {
    const provider = (
      window as Window & { ethereum?: EIP1193Provider }
    ).ethereum;

    if (!provider) return;

    function handleAccountsChanged(accounts: string[]) {
      const address = accounts[0];

      setWalletInfo(null);
      setBalanceResult(null);
      setBalanceError('');
      setWalletError('');
      setAddressInput(address ?? '');

      if (!address) return;

      provider!.request({ method: 'eth_chainId' })
        .then((chainIdHex) => {
          setWalletInfo({
            address,
            chainId: Number.parseInt(chainIdHex, 16),
          });
        })
        .catch(() => {
          setWalletError('读取网络失败，请重新连接');
        });
    }

    function handleChainChanged(chainIdHex: string) {
      setWalletInfo((previous) =>
        previous
          ? {
              ...previous,
              chainId: Number.parseInt(chainIdHex, 16),
            }
          : null
      );

      setBalanceResult(null);
      setBalanceError('');
    }

    provider.on('accountsChanged', handleAccountsChanged);
    provider.on('chainChanged', handleChainChanged);

    return () => {
      provider.removeListener('accountsChanged', handleAccountsChanged);
      provider.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  async function handleReadTokenBalance() {
    const tokenAddress = tokenAddressInput.trim();

    setTokenAddressError('');
    setTokenError('');

    if (!isAddress(tokenAddress)) {
      setTokenAddressError('请输入有效的代币合约地址');
      return;
    }
    const address = addressInput.trim();

    setTokenError('');
    setTokenInfo(null);

    if (!isAddress(address)) {
      setTokenError('请先输入有效的以太坊地址');
      return;
    }

    if (walletInfo !== null && !isMainnet) {
      setTokenError('请先把钱包切换到以太坊主网');
      return;
    }

    setIsReadingToken(true);

    try {
      const [symbol, decimals, rawBalance] = await Promise.all([
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'symbol',
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
        publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [address],
        }),
      ]);

      setTokenInfo({
        symbol,
        decimals,
        balance: formatUnits(rawBalance, decimals),
      });
    } catch (error) {
      console.error('读取代币余额失败：', error);
      setTokenError('代币查询失败，请检查网络或稍后重试');
    } finally {
      setIsReadingToken(false);
    }
  }

  return (
    <main className="dashboard">
      <header>
        <p className="eyebrow">BUILD / LEARN / SHIP</p>
        {/* 练习 1：把下方标题改成你喜欢的名字。 */}
        <h1>我的资产</h1>
        <p className="subtitle">Web3 资产控制台 · 主网数据查询与 Sepolia 合约交互</p>
        <button onClick={() => setShowBalance(!showBalance)}>
        {showBalance ? '隐藏余额' : '显示余额'}
        </button>
        <button onClick={handleAddAsset}>
          新增模拟资产
        </button>
        <button
          type="button"
          onClick={handleRefreshAssets}
          disabled={isRefreshing}
        >
          {isRefreshing ? '读取中...' : '读取链上区块高度'}
        </button>
        <label>
          <input
            type="checkbox"
            checked={shouldFail}
            onChange={(event) => setShouldFail(event.target.checked)}
            disabled={isRefreshing}
          />
          模拟请求失败
        </label>
      </header>

      <section className="notice" aria-label="模拟数据说明">
        <span className="dot" />
        资产余额为模拟数据；区块高度来自真实以太坊主网。
      </section>

      <section aria-labelledby="assets-title">
        <div className="section-title">
          <h2 id="assets-title">资产列表</h2>
          {/* 花括号中写 JavaScript，length 获取数组元素数量。 */}
          <span>共 {filteredAssets.length} 种模拟资产</span>
        </div>
        {refreshMessage && (
          <p role="status">{refreshMessage}</p>
        )}
        {blockNumber !== null && (
          <p>以太坊主网 · 本次读取的区块高度：{blockNumber}</p>
        )}
        <label>
          搜索资产：
          <input
            type="text"
            placeholder="输入资产符号，例如 ETH"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </label>
        <div className="asset-list">
          {filteredAssets.length === 0 && (
            <p>没有找到匹配的资产，请尝试其他关键词。</p>
          )}
          {/* map 把每份数据变成一张卡片；key 用来标识列表项。 */}
          {filteredAssets.map((asset) => (
            <AssetCard
              key={asset.symbol}
              asset={asset}
              isDemo={asset.isDemo}
              showBalance={showBalance}
              onDelete={handleDeleteAsset}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="wallet-title">
        <h2 id="wallet-title">连接学习钱包</h2>
        <p>仅请求公开地址，不签名、不转账。</p>

        <button
          type="button"
          onClick={handleConnectWallet}
          disabled={isConnecting}
        >
          {isConnecting ? '等待钱包授权...' : '连接 / 重新读取钱包'}
        </button>

        {walletError && (
          <p role="alert">{walletError}</p>
        )}

        {walletInfo !== null && (
          <div role="status">
            <p style={{ overflowWrap: 'anywhere' }}>
              钱包地址：{walletInfo.address}
            </p>
            <p>钱包网络 Chain ID：{walletInfo.chainId}</p>
            <p>
              {walletInfo.chainId === 1
                ? '钱包当前位于以太坊主网'
                : '注意：下方余额查询仍固定读取以太坊主网'}
            </p>
            <p>钱包账号和网络变化会自动同步；余额仍需点击查询。</p>
          </div>
        )}
      </section>

      <MessageStorePanel walletInfo={walletInfo} />

      <section aria-labelledby="balance-title">
        <h2 id="balance-title">真实 ETH 余额查询</h2>
        <p>
          {walletInfo === null
            ? '查询网络固定为以太坊主网，可查询任意公开地址。'
            : isMainnet
              ? '查询网络：以太坊主网'
              : '请切换到以太坊主网后再查询主网余额'}
        </p>

        <label>
          以太坊地址：
          <input
            type="text"
            placeholder="0x..."
            value={addressInput}
            onChange={(event) => setAddressInput(event.target.value)}
            disabled={isCheckingBalance}
          />
        </label>

        <button
          type="button"
          onClick={handleCheckBalance}
          disabled={isCheckingBalance}
        >
          {isCheckingBalance ? '查询中...' : '查询 ETH 余额'}
        </button>

        {balanceError && (
          <p role="alert">{balanceError}</p>
        )}

        {balanceResult !== null && (
          <div role="status">
            <p style={{ overflowWrap: 'anywhere' }}>
              查询地址：{balanceResult.address}
            </p>
            <p>余额：{balanceResult.eth} ETH</p>
          </div>
        )}
      </section>

      <section aria-labelledby="token-title">
        <h2 id="token-title">ERC-20 代币余额</h2>
        <p>读取以太坊主网 ERC-20 合约，只读查询，默认合约为 USDC。</p>

        <label>
          ERC-20 合约地址：
          <input
            type="text"
            value={tokenAddressInput}
            onChange={(event) => setTokenAddressInput(event.target.value)}
            placeholder="0x..."
            disabled={isReadingToken}
          />
        </label>

        {tokenAddressError && (
          <p role="alert">{tokenAddressError}</p>
        )}

        <button
          type="button"
          onClick={handleReadTokenBalance}
          disabled={isReadingToken}
        >
          {isReadingToken ? '读取中...' : '读取代币余额'}
        </button>

        {tokenError && (
          <p role="alert">{tokenError}</p>
        )}

        {tokenInfo !== null && (
          <div role="status">
            <p>代币：{tokenInfo.symbol}</p>
            <p>精度：{tokenInfo.decimals}</p>
            <p>余额：{tokenInfo.balance} {tokenInfo.symbol}</p>
          </div>
        )}
      </section>

      <aside className="lesson">
        <p className="eyebrow">ABOUT THIS PROJECT</p>
        <h2>关于这个 Web3 资产控制台</h2>
        <ul>
          <li>主网只读：区块高度、ETH 余额和 ERC-20 代币查询。</li>
          <li>钱包交互：MetaMask 连接、账号与网络状态同步。</li>
          <li>Sepolia 实战：模拟调用、钱包确认、交易回执检查和留言更新。</li>
          <li>本地演示：模拟资产的搜索、增删和浏览器持久化。</li>
        </ul>
        <p>主网与 Sepolia 数据相互独立。留言仅部署者可修改，内容公开可见。</p>
      </aside>
      <footer>学习作品，非投资工具。资产列表余额为模拟数据；独立查询区域返回链上数据。交易仅限 Sepolia 测试网，请勿输入私钥或助记词。</footer>
    </main>
  );
}

type AssetCardProps = {
  asset: {
    symbol: string;
    name: string;
    balance: string;
  };
  showBalance: boolean;
  isDemo: boolean;
  onDelete: (symbol: string) => void;
};

export default function AssetCard({
  asset,
  showBalance,
  isDemo,
  onDelete,
}: AssetCardProps) {
  const alwaysVisible =
    asset.symbol === 'USDC' || asset.symbol === 'LEARN';

  return (
    <article className="asset-card">
      <div className="asset-icon" aria-hidden="true">
        {asset.symbol.slice(0, 1)}
      </div>

      <div className="asset-name">
        <h3>{asset.symbol}</h3>
        <p>{asset.name}</p>
        {isDemo && <small>模拟</small>}
      </div>

      <div className="asset-balance">
        <strong>
          {alwaysVisible || showBalance ? asset.balance : '****'}
        </strong>
        <span>{asset.symbol}</span>
      </div>
      <button
        type="button"
        onClick={() => onDelete(asset.symbol)}
      >
        删除
      </button>
    </article>
  );
}
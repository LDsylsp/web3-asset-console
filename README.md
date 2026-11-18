# Web3 Asset Console

React + TypeScript + viem 编写的个人学习项目。

## 在线演示

https://web3-asset-console.ldsylsp.chatgpt.site

无需连接钱包即可体验模拟资产管理、主网区块高度、ETH/ERC-20 余额和 Sepolia 留言读取。写入留言只允许合约部署者，因此访客不能用自己的钱包成功修改留言；权限拦截是预期行为。

> 主网功能只读。留言写入只在 Sepolia 进行，需要 MetaMask 确认并消耗测试 ETH。不提供主网转账或代币授权，不索取助记词或私钥。

## 功能

- React 组件化、资产搜索和增删、余额隐藏、localStorage 持久化。
- MetaMask 连接、账户和网络变化监听。
- 以太坊主网区块高度、ETH 和任意标准 ERC-20 余额查询。
- Sepolia 留言合约：模拟调用、权限拦截、钱包确认、回执检查、结果刷新。
- 18 项自动化测试：字节边界、交易失败路径和初始渲染。

## 运行

需要 Node.js 24 和 npm。

```sh
npm ci
npm run dev
```

打开终端显示的本地地址。钱包扩展需要安装在打开网页的同一个浏览器中。

```sh
npm test
npm run build
```

## 结构

```text
src/App.tsx                 主网查询、资产和钱包状态
src/AssetCard.tsx           模拟资产卡片
src/MessageStorePanel.tsx   Sepolia 留言交互
src/blockchain.ts          客户端、RPC 和合约 ABI
src/lib/message.ts         留言校验、回执检查和交易流程
src/types/wallet.ts        钱包类型
contracts/MessageStore.sol  留言合约源码
 tests/                    Node.js 逻辑和渲染测试
```

## 合约

- 网络：Sepolia（Chain ID 11155111）。
- 地址：`0x2904d2A5D093d15EbC00d9c2717bCAa251926416`
- 部署交易：`0xecc82eebeed94cb86088ff130c2240a19d451aa881c3da018e1109985a3cbaae`
- 查看合约：https://sepolia.etherscan.io/address/0x2904d2A5D093d15EbC00d9c2717bCAa251926416
- Solidity：0.8.24；EVM 目标：paris。
- Remix 编译并选择 Sepolia 浏览器钱包部署；Value 保持 0。
- `owner` 为部署者；任何人可以读，只有部署者可以 `setMessage`。
- 留言限制为 1 至 280 个 UTF-8 字节，不是 280 个中文字符。

## 公开查询示例

主网 USDC 合约：`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`。

将公开钱包地址填入余额输入框，合约地址填入代币输入框。余额为 0 不代表查询失败。

## 测试边界与已知限制

- 自动化测试使用替身，不访问 RPC、不签名、不发送交易，不是浏览器钱包端到端测试。
- 主网查询和 Sepolia 写入使用不同客户端；网络地址不可混用。
- 资产列表是本地模拟数据，不是自动索引的钱包资产。
- 代币查询要求合约兼容本项目使用的标准 ABI，并非所有代币元数据格式都支持。
- 公共 RPC 可能限流或超时。等待回执超时不意味着交易失败，先用交易哈希核实，避免重复发送。
- 模拟通过不保证最终成功，仍需检查回执状态。

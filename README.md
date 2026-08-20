# AI Wallet Investigator

A BOT Chain-native blockchain investigation dApp. Investigate any BOT Chain wallet using real blockchain data and AI analysis.

## What It Does

1. Connect a wallet or paste any BOT Chain address
2. Retrieve real blockchain activity (transactions, tokens, contracts)
3. Analyze wallet behavior (activity score, counterparties, attention signals)
4. Ask AI questions about the wallet using structured evidence
5. Inspect the blockchain data behind every AI answer

## Architecture

```
React Frontend (Vite)
        |
    /api routes
        |
Express Server
        |
  +-----+-----+-----+
  |     |     |     |
Moralis RPC CoinGecko Gemini
```

- **Frontend**: React + Vite + React Router
- **Wallet**: Reown AppKit + Wagmi + Viem
- **Server**: Express.js (handles secret API keys)
- **Blockchain**: Moralis EVM API + BOT Chain RPC
- **Market Data**: CoinGecko API
- **AI**: Gemini API (interpretation only, never blockchain data source)
- **Markdown**: react-markdown (renders AI output)

## Folder Structure

```
ai-wallet-investigator/
├── src/
│   ├── components/      # UI components
│   │   ├── Navbar.jsx
│   │   ├── WalletConnect.jsx
│   │   ├── WalletSearch.jsx
│   │   ├── NetworkStatus.jsx
│   │   ├── InvestigationLoader.jsx
│   │   ├── AIProfile.jsx
│   │   ├── AskWallet.jsx
│   │   └── EmptyState.jsx
│   ├── pages/           # Page components
│   │   ├── Home.jsx
│   │   └── Investigate.jsx
│   ├── context/         # React context providers
│   │   ├── WalletContext.jsx
│   │   └── InvestigationContext.jsx
│   ├── utils/           # Utility functions
│   │   ├── address.js
│   │   ├── format.js
│   │   └── storage.js
│   ├── config/          # BOT Chain configuration
│   │   └── botChain.js
│   ├── App.jsx          # Root component with routing
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── api/                 # Server-side API routes
│   ├── investigate.js   # Main investigation endpoint
│   ├── chat.js          # Chat and report endpoints
│   ├── services/        # External API services
│   │   ├── moralis.js
│   │   ├── rpc.js
│   │   ├── coingecko.js
│   │   └── gemini.js
│   ├── normalizers/     # Data normalization
│   │   ├── wallet.js
│   │   ├── transactions.js
│   │   └── tokens.js
│   ├── analysis/        # Deterministic analysis
│   │   ├── activityScore.js
│   │   ├── counterparties.js
│   │   ├── transactionClassifier.js
│   │   └── attentionSignals.js
│   └── ai/              # AI integration
│       ├── investigator.js
│       └── prompts.js
├── contracts/           # Smart contracts (future)
├── server.js            # Express server
└── .env.example         # Environment variable template
```

## Key Design Decisions

- **BOT Chain first**: Chain ID 968, RPC https://rpc.bohr.life
- **Server-side secrets**: API keys never reach the browser
- **Gemini interprets, not fabricates**: AI receives structured evidence only
- **Deterministic analysis**: Activity scoring and classification in application code
- **Evidence system**: Every AI claim traceable to blockchain data

## How Investigations Work

1. User enters a wallet address
2. Frontend sends address to `/api/investigate`
3. Server fetches data from Moralis and BOT Chain RPC in parallel
4. Data is normalized into stable application structures
5. Deterministic analysis runs (activity score, counterparties, attention signals)
6. Investigation object is returned to frontend
7. AI profile is generated on-demand using Gemini

Wallet age is calculated deterministically. Since the recent-transaction scan
only covers the newest blocks, a chain-wide binary search finds the wallet's
earliest on-chain activity so old wallets report their true age instead of
appearing newly created. Timestamps are normalized to unix seconds and sorted
numerically.

## How the Chat Works

1. User asks a question about the wallet
2. Frontend sends question + investigation data to `/api/chat`
3. Server creates a compact evidence package from investigation data
4. Evidence + question is sent to Gemini
5. AI responds with answer and evidence references

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose | Client/Server |
|----------|---------|---------------|
| `VITE_REOWN_PROJECT_ID` | Wallet connection | Client |
| `MORALIS_API_KEY` | Blockchain data | Server |
| `COINGECKO_API_KEY` | Market data | Server |
| `GEMINI_API_KEY` | AI analysis | Server |
| `BOT_NETWORK` | `testnet` or `mainnet` | Server |
| `BOT_RPC_URL` | Direct RPC (overrides per-network default) | Server |
| `REGISTRY_CONTRACT` | Deployed InvestigationRegistry address | Server |
| `BOT_PRIVATE_KEY` | Funded key that pays anchor/mint gas | Server |

## Network Switching (Testnet / Mainnet)

The app supports both `testnet` and `mainnet` with a one-line switch:

- **Client:** change `ACTIVE_NETWORK_KEY` in `src/config/botChain.js`
  (`'testnet'` → `'mainnet'`). Wallet connect, network detection/adding, and
  switching all follow automatically.
- **Server:** set `BOT_NETWORK=mainnet` in `.env` (defaults to `testnet`).
  The RPC is taken from `BOT_RPC_URL`, or per-network defaults
  (`BOT_TESTNET_RPC_URL` / `BOT_MAINNET_RPC_URL`).

WalletConnect detects the wallet's current chain and adds the BOT network
first (`wallet_addEthereumChain`) before switching
(`wallet_switchEthereumChain`) when it is not present.

## On-Chain Registry & Snapshots

`contracts/InvestigationRegistry.sol` anchors report hashes to BOT Chain and
mints timestamped snapshot NFTs:

1. **Deploy once:** set a funded `BOT_PRIVATE_KEY`, run `npm run deploy:registry`,
   then put the printed address in `REGISTRY_CONTRACT`.
2. **Anchor:** on an investigation page, "ANCHOR REPORT ON-CHAIN" stores the
   keccak256 hash of the report with a block timestamp.
3. **Mint snapshot:** "MINT SNAPSHOT" mints a soulbound token holding the
   report hash, timestamp, and full report text (`dataRef`).
4. **Timestamp page** (`/snapshot/:wallet`): browse a wallet's snapshots and
   query "what was known at time T" (`getSnapshotAtOrBefore`).

The download button on the investigate page saves the same markdown whose
hash is anchored, so the file can be re-verified on-chain.

## Development

```bash
npm install
cp .env.example .env    # Fill in your API keys
npm run dev             # Starts frontend + API server
```

## Production Build

```bash
npm run build           # Build frontend
node server.js          # Start API server
```

## Deployment to Vercel

1. Push code to GitHub
2. Import repository on Vercel
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variables in Vercel dashboard
6. Deploy

See `steps.txt` for detailed deployment instructions.

## Known Limitations

- No verified block explorer for BOT Chain yet
- BOT Chain tokens may not exist in CoinGecko
- Mainnet RPC / chain id not set yet (fill in `src/config/botChain.js` +
  `.env` when moving to mainnet)
- Mobile wallet behavior varies by wallet app

## Future Work

- Mainnet deployment
- Multi-chain support
- Additional AI providers
- More detailed fund flow visualization
- Gas price / faucet integration

## License

Private project. All rights reserved.

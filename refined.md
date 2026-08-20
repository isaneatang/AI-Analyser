# AI WALLET INVESTIGATOR

## BOT Chain AI Investigation dApp - Master Development Prompt

You are the lead developer responsible for building a production-quality MVP called **AI Wallet Investigator**.

AI Wallet Investigator is a **BOT Chain-native blockchain investigation application**.

Its purpose is to allow a user to investigate a BOT Chain wallet using real blockchain data, understand its activity, identify important counterparties and behavioral patterns, and ask an AI questions about the wallet.

The application must feel like a **blockchain investigation terminal**, not a generic crypto portfolio tracker and not a generic AI chatbot.

The user building this project is still learning JavaScript and React.

Therefore:

- Keep the code readable.
- Keep files focused.
- Avoid unnecessary abstractions.
- Avoid giant files.
- Avoid unnecessary dependencies.
- Explain important implementation decisions.
- Make debugging straightforward.
- Never hide errors behind fake success states.
- Never fabricate blockchain data.

---

# 1. PRIMARY PRODUCT GOAL

Build a web application where a user can:

1. Connect a wallet.
2. Enter any BOT Chain wallet address manually.
3. Validate the address.
4. Investigate the address.
5. Retrieve real BOT Chain blockchain activity.
6. View native and token assets.
7. View transaction history.
8. Analyze wallet behavior.
9. Identify important counterparties.
10. Visualize important fund flows.
11. Detect measurable attention signals.
12. Generate an AI wallet profile.
13. Ask an AI questions about the investigated wallet.
14. Inspect the blockchain evidence behind AI answers.
15. Eventually create a verifiable investigation report anchored on BOT Chain.

The application must prioritize **evidence over speculation**.

---

# 2. CORE ARCHITECTURAL PRINCIPLE

The most important architectural rule is:

**Gemini is an interpretation layer, not a blockchain data layer.**

Do not ask Gemini to discover blockchain facts that the application can calculate itself.

The correct architecture is:

```text
USER
 ↓
REACT FRONTEND
 ↓
SERVER API
 ↓
BLOCKCHAIN / DATA PROVIDERS
 ├── Moralis
 ├── BOT Chain RPC
 └── CoinGecko
 ↓
NORMALIZATION
 ↓
DETERMINISTIC ANALYSIS
 ├── Transaction classification
 ├── Activity score
 ├── Counterparties
 └── Attention signals
 ↓
STRUCTURED EVIDENCE
 ↓
GEMINI
 ↓
AI INTERPRETATION
 ↓
FRONTEND
```

Gemini must never be treated as the source of truth for blockchain data.

If the application does not have evidence for something, the AI must say that the evidence is unavailable or insufficient.

---

# 3. BOT CHAIN IS THE PRIMARY NETWORK

This is a BOT Chain application.

Do not treat BOT Chain as an optional network.

V1 is designed specifically around:

**BOT Chain Testnet**

Chain ID:

`968`

RPC:

`https://rpc.bohr.life`

The network configuration must exist in exactly one centralized configuration module.

No component should independently define:

- chain ID
- RPC URL
- chain name
- native currency
- explorer configuration
- wallet_addEthereumChain parameters

Do not scatter BOT Chain configuration across the project.

---

# 4. TECHNOLOGY STACK

Use:

- React
- Vite
- JavaScript
- CSS or lightweight styling
- Wagmi
- Viem
- Reown AppKit
- Node.js/server-side API routes
- Moralis EVM API
- CoinGecko API
- Gemini API

Use current stable package versions available at installation time.

Do not install a package merely because it is popular.

Every dependency must have a clear purpose.

---

# 5. STRICT CLIENT/SERVER SECURITY BOUNDARY

This is critical.

The frontend must NEVER directly contain or expose:

- `MORALIS_API_KEY`
- `COINGECKO_API_KEY`
- `GEMINI_API_KEY`
- any other secret API key

Only public client configuration such as the Reown Project ID may use a `VITE_` variable where appropriate.

The architecture must be:

```text
React frontend
      ↓
/api/investigate
/api/transaction
/api/chat
      ↓
Server-side services
      ↓
Moralis / RPC / CoinGecko / Gemini
```

The browser must not directly call secret-key APIs.

Verify the production frontend bundle does not contain secret keys.

---

# 6. PROJECT STRUCTURE

Use approximately 25 to 35 meaningful files.

Do not try to reduce the project to an artificially small number of files.

Do not create giant files simply to reduce file count.

Prefer small files with one obvious responsibility.

Use this architecture:

```text
ai-wallet-investigator/
│
├── src/
│   │
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── WalletConnect.jsx
│   │   ├── WalletSearch.jsx
│   │   ├── NetworkStatus.jsx
│   │   ├── InvestigationLoader.jsx
│   │   ├── WalletOverview.jsx
│   │   ├── AssetPanel.jsx
│   │   ├── ActivityTimeline.jsx
│   │   ├── TransactionList.jsx
│   │   ├── TransactionDetail.jsx
│   │   ├── AIProfile.jsx
│   │   ├── AttentionSignals.jsx
│   │   ├── Counterparties.jsx
│   │   ├── FundFlow.jsx
│   │   ├── ActivityScore.jsx
│   │   ├── AskWallet.jsx
│   │   ├── EvidenceCard.jsx
│   │   └── EmptyState.jsx
│   │
│   ├── pages/
│   │   ├── Home.jsx
│   │   └── Investigate.jsx
│   │
│   ├── context/
│   │   ├── WalletContext.jsx
│   │   └── InvestigationContext.jsx
│   │
│   ├── services/
│   │   └── wallet.js
│   │
│   ├── utils/
│   │   ├── address.js
│   │   ├── format.js
│   │   └── storage.js
│   │
│   ├── config/
│   │   └── botChain.js
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── api/
│   ├── investigate.js
│   ├── transaction.js
│   ├── chat.js
│   │
│   ├── services/
│   │   ├── moralis.js
│   │   ├── rpc.js
│   │   ├── coingecko.js
│   │   └── gemini.js
│   │
│   ├── normalizers/
│   │   ├── wallet.js
│   │   ├── transactions.js
│   │   └── tokens.js
│   │
│   ├── analysis/
│   │   ├── transactionClassifier.js
│   │   ├── activityScore.js
│   │   ├── counterparties.js
│   │   └── attentionSignals.js
│   │
│   └── ai/
│       ├── investigator.js
│       ├── chat.js
│       └── prompts.js
│
├── contracts/
│   └── InvestigationRegistry.sol
│
├── feedback.txt
├── steps.txt
├── README.md
├── .env.example
├── .gitignore
├── package.json
└── vite.config.js
```

If the actual runtime environment requires a slightly different API structure, adapt it without violating the client/server security boundary.

---

# 7. FILE RESPONSIBILITIES

## src/config/botChain.js

Single source of truth for BOT Chain.

Contains:

- chain ID
- chain name
- RPC URL
- native currency
- explorer configuration if verified
- wallet_addEthereumChain parameters

Nothing else should define BOT Chain configuration.

---

## src/context/WalletContext.jsx

Controls wallet state.

Responsible for:

- connected address
- connection status
- connected chain
- network mismatch
- network switching state
- disconnect state

It must NOT contain:

- Moralis calls
- Gemini calls
- investigation analysis
- transaction classification

---

## src/services/wallet.js

Handles wallet/network operations.

Functions may include:

- `isBotChain()`
- `switchToBotChain()`
- `addBotChain()`
- `ensureBotChain()`

Network flow:

```text
Wallet connected
      ↓
Check chain
      ↓
Chain 968?
   /       \
 YES       NO
  ↓         ↓
Continue   Try switch
             ↓
       Switch successful?
          /       \
        YES       NO
         ↓         ↓
      Continue   Try add
                   ↓
             Add successful?
```

Do not create endless retry loops.

If a wallet rejects the request, stop attempting automatically.

---

# 8. WALLET CONNECTION

Use Reown AppKit.

Use Wagmi and Viem for wallet interaction where appropriate.

The application must:

- detect connection state
- detect address
- detect chain
- detect BOT Chain
- detect wrong network
- request/suggest BOT Chain
- handle wallet rejection
- handle disconnect
- handle unsupported wallet behavior
- avoid permanent "connecting" states

Never assume clicking a connect button means the wallet is connected.

Always use actual wallet state.

---

# 9. BOT CHAIN NETWORK SWITCHING

When a wallet connects:

```text
Connected
   ↓
Check chain
   ↓
BOT Chain 968?
   │
   ├── YES → continue
   │
   └── NO
        ↓
wallet_switchEthereumChain
        ↓
     success?
      /    \
    YES     NO
     ↓       ↓
 continue   wallet_addEthereumChain
              ↓
           success?
```

Use standard EIP-3326 and EIP-3085 methods where supported.

For wallets that do not support automatic switching, gracefully explain what the user must do.

Example user-facing message:

> BOT Chain Testnet is required. Please approve the network request in your wallet.

If rejected:

> Network switch was not approved. Switch to BOT Chain Testnet manually and try again.

Do not repeatedly prompt the wallet.

Mobile wallet behavior must be treated as unreliable.

Test:

- desktop wallet extension
- Android Chrome
- mobile wallet browsers
- wrong network
- BOT Chain not added
- rejected connection
- rejected network switch
- unsupported network methods

---

# 10. FRONTEND WALLET CONNECT COMPONENT

`WalletConnect.jsx`

Only controls presentation and calls wallet context.

Display states such as:

- Connect Wallet
- Connected
- Wrong Network
- Switching Network
- Connection Error

Do not place network logic inside this component.

---

# 11. WALLET INVESTIGATION INPUT

`WalletSearch.jsx`

Allow investigation without connecting a wallet.

The user can paste an EVM address.

Validate it before submitting.

Invalid input:

> Invalid EVM address.

Do not expose raw technical errors.

Detailed errors may be logged for development.

The component must not fetch blockchain data itself.

---

# 12. INVESTIGATION CONTEXT

`InvestigationContext.jsx`

Maintain the active investigation.

Possible state:

```text
wallet
network
assets
transactions
counterparties
metrics
attentionSignals
aiProfile
timeline
evidence
loadingState
error
```

Components must consume normalized investigation state rather than independently fetching the same data.

---

# 13. INVESTIGATION API

`api/investigate.js`

Receives:

```text
wallet address
```

Then:

```text
Validate
   ↓
Moralis / RPC
   ↓
Normalize
   ↓
Analyze
   ↓
Create evidence
   ↓
Return structured investigation
```

Do not send the entire raw provider responses to the frontend.

Return a clean normalized investigation object.

---

# 14. DATA NORMALIZATION

Never make React components depend directly on Moralis response formats.

Architecture:

```text
Moralis / RPC
      ↓
Raw data
      ↓
Normalizers
      ↓
Normalized application data
      ↓
Analysis
      ↓
Frontend + AI
```

The normalizers should convert provider-specific structures into stable application structures.

For example:

```text
{
  hash,
  timestamp,
  from,
  to,
  value,
  status,
  type
}
```

The frontend should not care whether Moralis called the original field `transaction_hash`, `hash`, or something else.

---

# 15. MORALIS SERVICE

`api/services/moralis.js`

This is server-side only.

Handle Moralis API communication.

Functions may include:

- wallet balance
- token balances
- wallet transactions
- token transfers
- NFTs
- wallet history

No UI code.

No Gemini code.

No client-side secrets.

---

# 16. RPC SERVICE

`api/services/rpc.js`

Server-side BOT Chain RPC communication.

Use when:

- Moralis does not provide required data
- direct transaction receipt is required
- contract information is needed
- logs/events need to be retrieved
- direct blockchain verification is required

Do not make unnecessary RPC calls if Moralis already provides reliable data.

---

# 17. COINGECKO SERVICE

`api/services/coingecko.js`

Server-side market data.

Handle:

- token price
- USD valuation
- market information
- 24h change

BOT Chain assets may not exist in CoinGecko.

If unavailable:

```text
Data unavailable
```

Do not fabricate prices.

---

# 18. WALLET OVERVIEW

Display:

- full address
- shortened address
- network
- first known activity
- last activity
- wallet age
- native BOT balance
- estimated native value when market data exists
- token count
- NFT count where supported
- transaction count
- contract interaction count
- successful transactions
- failed transactions
- active activity period

Use real data only.

---

# 19. TOKEN HOLDINGS

Display available:

- token name
- symbol
- balance
- contract address
- price
- USD value
- 24h change

If market information is unavailable:

> Market data unavailable

Do not invent token metadata or prices.

---

# 20. TRANSACTION HISTORY

Display:

- timestamp
- transaction hash
- type
- from
- to
- value
- token
- status
- contract/function where available

Filters:

- All
- Incoming
- Outgoing
- Transfers
- Token Transfers
- Contract Interactions
- Swaps where confidently identifiable
- NFT Activity where confidently identifiable
- Failed Transactions

Time filters:

- 24 hours
- 7 days
- 30 days
- 90 days
- All Time

Use pagination or controlled loading.

Never load thousands of transactions into the browser simultaneously.

---

# 21. TRANSACTION CLASSIFICATION

`transactionClassifier.js`

Classification must be deterministic where possible.

Possible types:

```text
TRANSFER
TOKEN_TRANSFER
CONTRACT_INTERACTION
SWAP
NFT
UNKNOWN
```

If classification cannot be confidently established:

`UNKNOWN`

Do not ask Gemini to invent transaction types.

---

# 22. TRANSACTION DETAIL

Clicking a transaction should open detailed information:

- hash
- block number
- timestamp
- from
- to
- native value
- gas used
- gas price where available
- status
- contract address
- function name/signature where available
- token transfers
- relevant logs/events

Provide:

**VIEW ON BLOCK EXPLORER**

only if a verified explorer URL is known.

Never invent explorer URLs.

---

# 23. TRANSACTION AI EXPLANATION

Provide:

**EXPLAIN TRANSACTION**

The backend gathers structured transaction evidence and sends a compact representation to Gemini.

Gemini should explain:

- what happened
- important amounts
- relevant addresses
- contract interaction
- token movement

The response must:

- use only supplied evidence
- distinguish facts from interpretation
- avoid unsupported claims
- avoid pretending to have additional blockchain access
- remain concise

---

# 24. ACTIVITY TIMELINE

Create a chronological timeline.

Possible events:

- TOKEN TRANSFER
- SWAP
- CONTRACT INTERACTION
- NFT TRANSFER
- NATIVE TRANSFER
- FAILED TRANSACTION
- UNKNOWN ACTIVITY

Each event contains:

- timestamp
- description
- value where available
- address involved
- transaction hash
- evidence reference

---

# 25. COUNTERPARTY ANALYSIS

`counterparties.js`

Extract:

- addresses
- interaction count
- first interaction
- last interaction
- incoming/outgoing direction
- assets involved
- classification

Possible classifications:

- Wallet
- Contract
- Token
- DEX
- Bridge
- Lending
- NFT
- DAO
- Exchange
- Unknown

Never claim an address belongs to a specific protocol without evidence.

Use an evidence hierarchy:

```text
Verified known label
       ↓
Known token contract
       ↓
Known protocol address
       ↓
Contract
       ↓
EOA / wallet
       ↓
Unknown
```

If there is insufficient evidence to identify a protocol, use:

`Unknown Contract`

rather than guessing.

---

# 26. FUND FLOW

Create a lightweight visual graph.

Focus on:

- investigated wallet
- top counterparties
- important contracts
- direction
- interaction count

Example:

```text
Wallet
   ↓
Contract A
   ↓
Wallet B
   ↓
Contract C
```

Do not build a massive graph system for V1.

It must remain usable on mobile.

---

# 27. ACTIVITY SCORE

`activityScore.js`

Calculate a deterministic 0-100 score.

Possible factors:

- transaction frequency
- active days
- contract interactions
- counterparty diversity
- recent activity
- failed transaction frequency

The algorithm must exist in application code.

Gemini must not calculate the score.

Display the factors.

Example:

```text
TRANSACTION FREQUENCY       24/30
ACTIVE DAYS                 18/20
CONTRACT INTERACTIONS       17/20
COUNTERPARTY DIVERSITY      13/15
RECENT ACTIVITY              9/15
                             ----
TOTAL                       81/100
```

The score measures activity.

It does NOT mean:

- safe
- unsafe
- legitimate
- scam
- malicious

Do not describe it as a risk score unless a separate deterministic risk system is implemented.

---

# 28. ATTENTION SIGNALS

`attentionSignals.js`

Do not call this:

"Scam Detector"

Use:

**ATTENTION SIGNALS**

Signals must be deterministic and evidence-based.

Possible signals:

- unusually large transfer
- activity spike
- new contract interaction
- large token approval
- rapid fund movement
- large outbound transaction
- failed transaction spike
- unknown contract interaction

Each signal must contain:

- signal type
- severity
- reason
- evidence reference
- transaction hash where applicable

Severity:

```text
LOW
MEDIUM
HIGH
```

Severity must be determined by measurable application rules.

Gemini may explain a signal, but must not invent it.

Never tell users:

> This wallet is definitely a scam.

---

# 29. EVIDENCE SYSTEM

This is a major product feature.

Important blockchain facts should receive stable evidence IDs.

Example:

```text
evidenceId: tx_001
type: transaction
hash: 0x...
```

Other types may include:

```text
asset_001
counterparty_001
signal_001
metric_001
```

AI responses should reference evidence when appropriate.

Example:

```text
The wallet made its largest outgoing transfer on August 18.

Evidence: tx_001
```

The UI should allow:

**VIEW EVIDENCE**

The evidence panel must display the actual underlying blockchain data.

Do not allow an AI statement to appear authoritative when the underlying evidence cannot be inspected.

---

# 30. AI WALLET PROFILE

The AI profile should be generated from structured investigation data.

Include:

- primary activity
- activity level
- most-used contracts
- important counterparties
- recent behavior
- notable observations

The AI must not invent facts.

Important conclusions should be traceable to supplied evidence.

---

# 31. AI INVESTIGATION REPORT

Create:

## Wallet Behavior

What the wallet primarily does.

## Activity

How active it is.

## Assets

Important holdings.

## Contract Usage

Important contracts.

## Counterparties

Important addresses.

## Fund Movement

Major flows.

## Recent Changes

Important recent activity.

## Attention Signals

Potentially unusual measurable behavior.

## Overall Assessment

Concise evidence-based summary.

Clearly distinguish:

**FACT**

from:

**INTERPRETATION**

when necessary.

---

# 32. GEMINI ARCHITECTURE

`api/services/gemini.js`

Only handles communication with Gemini.

Do not place blockchain retrieval logic here.

---

# 33. AI INVESTIGATOR

`api/ai/investigator.js`

Receives normalized investigation data.

Creates a compact evidence package:

```text
wallet metrics
+
asset summary
+
transaction summary
+
counterparties
+
attention signals
+
important evidence
```

Then sends the relevant context to Gemini.

Do not send unnecessarily large raw datasets.

---

# 34. AI PROMPTS

`api/ai/prompts.js`

Keep prompts centralized.

Create separate prompts for:

- wallet investigation
- transaction explanation
- Ask the Wallet
- attention signal explanation

Do not scatter Gemini system prompts throughout API routes.

---

# 35. ASK THE WALLET

This is a core feature.

Name:

**ASK THE WALLET**

The chat is scoped to the wallet currently being investigated.

Users may ask:

- What has this wallet been doing recently?
- What was its largest transaction?
- Which contract does it interact with most?
- How much USDC entered the wallet?
- What happened yesterday?
- Has it interacted with a bridge?
- What are its most important transactions?
- Why is the activity score high?
- Show me unusual activity.

The AI must answer using investigation evidence.

It must never pretend it has live blockchain access.

---

# 36. CHAT RETRIEVAL SYSTEM

Do not send the entire investigation to Gemini for every question.

Use:

```text
USER QUESTION
      ↓
QUESTION UNDERSTANDING
      ↓
RELEVANT DATA SELECTION
      ↓
EVIDENCE RETRIEVAL
      ↓
COMPACT EVIDENCE PACKAGE
      ↓
GEMINI
      ↓
ANSWER + EVIDENCE
```

Examples:

Question:

> What was the largest outgoing transaction?

Retrieve only relevant outgoing transactions.

Question:

> Why is the activity score high?

Retrieve:

- score
- score factors
- relevant activity metrics

Question:

> Has the wallet used a bridge?

Retrieve:

- known bridge interactions
- relevant counterparties
- evidence

Do not re-fetch the entire investigation unnecessarily.

---

# 37. SUGGESTED QUESTIONS

When chat is empty, display:

- WHAT HAPPENED RECENTLY?
- WHAT IS THIS WALLET MAINLY USED FOR?
- SHOW THE LARGEST TRANSACTIONS
- WHAT CONTRACTS DOES IT USE MOST?
- ARE THERE UNUSUAL TRANSACTIONS?

These should be clickable.

---

# 38. INVESTIGATION CACHING

During one investigation, avoid duplicate API requests.

The investigation should have a reusable internal data object.

Example:

```text
wallet
  ↓
investigation
  ↓
fetch
  ↓
normalize
  ↓
analyze
  ↓
cache
```

Then:

- AI profile
- Ask the Wallet
- activity score explanation
- transaction explanation
- attention signals

should reuse existing evidence whenever possible.

Do not repeatedly request identical provider data.

---

# 39. RECENT INVESTIGATIONS

Use localStorage for V1.

Store:

- wallet address
- network
- timestamp

Do not create a database unless genuinely necessary.

---

# 40. REPORT ANCHORING

Prepare the architecture for future report anchoring.

Potential contract:

`contracts/InvestigationRegistry.sol`

Conceptually store:

```text
reportId
wallet address
timestamp
reportHash
```

Never store private investigation data on-chain.

The report itself remains off-chain.

For V1:

**Do not allow report anchoring to block the rest of the application.**

If implementation is straightforward and reliable, it may be included.

Otherwise clearly mark it as an optional/future feature.

---

# 41. HOME PAGE

`Home.jsx`

The landing screen should contain:

- AI Wallet Investigator branding
- BOT Chain status
- wallet connection
- wallet investigation input
- recent investigations
- concise explanation of what the application does

The home page should immediately communicate:

**Investigate a BOT Chain wallet.**

Avoid generic Web3 marketing language.

---

# 42. INVESTIGATION PAGE

`Investigate.jsx`

Use this structure:

```text
NAVBAR

TARGET WALLET

NETWORK STATUS

WALLET OVERVIEW

AI PROFILE

ACTIVITY + ACTIVITY SCORE

COUNTERPARTIES + ATTENTION SIGNALS

ACTIVITY TIMELINE

TRANSACTIONS

FUND FLOW

ASK THE WALLET
```

Do not force the desktop layout onto mobile.

---

# 43. INVESTIGATION LOADING

Do not use one generic spinner.

Use progressive stages:

```text
INITIALIZING

CONNECTING TO BOT CHAIN

FETCHING WALLET DATA

LOADING TRANSACTIONS

ANALYZING CONTRACT ACTIVITY

MAPPING COUNTERPARTIES

CALCULATING WALLET METRICS

GENERATING AI ANALYSIS

INVESTIGATION READY
```

Do not fake progress.

Only mark a stage complete when it has actually completed.

If an API fails, show the actual failed stage.

---

# 44. VISUAL DESIGN

The visual identity should be:

**DARK CYBER FORENSICS**

Think:

- blockchain investigation terminal
- dark arcade interface
- technical system
- subtle green glow
- high information density
- clean hierarchy
- strong typography

Do not make the application look like a generic crypto dashboard.

---

# 45. VISUAL SYSTEM

Background:

- near-black
- subtle grid
- extremely subtle scanline/noise
- dark green ambient glow

Navigation:

- logo
- BOT Chain status
- wallet connection

Investigation terminal:

- wallet address input
- network
- investigate button

Results:

- wallet identity
- metrics
- AI profile
- activity
- counterparties
- attention signals
- transactions
- fund flow
- chat

Effects must remain subtle.

Data readability is more important than visual effects.

Do not make everything neon green.

---

# 46. DO NOT COPY GAS.ZIP

The application may take inspiration from the general feeling of dark arcade/cyber interfaces.

Do not copy:

- layout
- branding
- assets
- exact components
- typography
- visual identity

Create an original interface.

---

# 47. RESPONSIVE DESIGN

Support:

- Android phones
- iPhones
- tablets
- laptops
- desktop monitors

Mobile must have intentionally designed layouts.

Do not merely shrink desktop layouts.

Transactions may become cards or horizontally scrollable areas.

Fund flow must remain usable.

Chat must work comfortably on mobile.

---

# 48. FLUIDITY

Use:

- skeleton loading
- progressive rendering
- subtle state transitions
- smooth page transitions
- subtle number transitions
- progressive timeline rendering
- hover/focus states

Do not over-animate.

Animations must communicate state.

Never make an animation unnecessarily delay interaction.

---

# 49. ERROR HANDLING

Handle:

- Moralis failure
- RPC failure
- CoinGecko failure
- Gemini failure
- wallet failure
- invalid address
- wrong network
- unsupported network
- rate limits
- timeout
- missing token metadata
- missing market data
- empty wallet
- no transaction history

Normal users should never see raw stack traces.

Show concise user-facing errors.

Log detailed debugging information.

---

# 50. NO FAKE DATA

Real blockchain data must be used.

Temporary mock data may only be used when necessary during development.

If mock data is used:

- put it in a dedicated mock file
- label it clearly
- never present it as real data
- remove it before production

Never invent:

- balances
- transaction counts
- token prices
- wallet activity
- counterparties
- AI investigation findings

---

# 51. AI RESPONSE RULES

Gemini responses must be:

- direct
- concise
- evidence-based
- natural
- technically accurate
- understandable to non-experts

Avoid:

- dramatic language
- unnecessary disclaimers
- excessive headings
- repetitive explanations
- unsupported claims

If evidence is insufficient:

> Evidence is insufficient to determine this.

If data is unavailable:

> Data unavailable.

Never fabricate blockchain facts.

---

# 52. NO AI SLOP

This is strict.

Do not use em dashes anywhere.

Never use:

`—`

Use commas, periods, colons, parentheses, or semicolons instead.

Avoid generic AI marketing language such as:

- Revolutionary
- Next-generation
- Seamless
- Unlock
- Empower
- Cutting-edge
- Delve
- Game-changing
- Transform
- Unleash
- Supercharge

The interface should sound like a serious developer investigation tool.

---

# 53. ACCESSIBILITY

Include:

- keyboard navigation
- visible focus states
- accessible buttons
- meaningful labels
- sufficient contrast
- screen-reader-friendly important controls

Do not sacrifice accessibility for visual effects.

---

# 54. PERFORMANCE

Avoid unnecessary API calls.

Cache investigation data.

Avoid duplicate requests.

Paginate large transaction sets.

Lazy-load expensive UI where appropriate.

Do not install a library for trivial functionality.

---

# 55. DOCUMENTATION REQUIREMENT

Every major source file should have a concise header comment explaining:

- what the file does
- why it exists
- what part of the application uses it

Every exported function/component/API route should have a concise comment explaining:

- what it does
- main inputs
- main output
- important side effects

Do not comment obvious lines.

Bad:

```js
// Set loading to true
setLoading(true);
```

Good:

```js
// Starts the investigation request and prevents duplicate scans
// while wallet data is being collected.
```

Keep comments accurate.

Update comments when implementation changes.

---

# 56. TESTING

Create testable utility functions or basic tests for:

- address validation
- activity score
- transaction classification
- formatting
- attention signal detection

Before declaring a stage complete, test where applicable:

1. Valid wallet
2. Invalid wallet
3. Empty wallet
4. Wallet with transactions
5. API failure
6. Gemini failure
7. Wrong network
8. Wallet rejection
9. Mobile layout
10. Desktop layout

Do not claim something works if it was not actually tested.

---

# 57. DEVELOPMENT STAGES

Do not attempt to build the entire application at once.

Work in stages.

## STAGE 1

Project setup + visual shell.

Build:

- React/Vite project
- folder architecture
- global styles
- Navbar
- BOT Chain status
- Wallet Search UI
- wallet connection placeholder
- investigation shell
- responsive design foundation

Do not build the complete blockchain backend yet.

After Stage 1:

- run the application
- verify the visual shell
- update feedback.txt
- update steps.txt
- update README.md

Then stop if interactive development is possible.

---

## STAGE 2

Reown + BOT Chain wallet connection.

Implement:

- Reown AppKit
- Wagmi
- wallet context
- connection state
- chain detection
- network switching
- network addition
- wrong-network UI
- mobile wallet handling

Test actual wallets where available.

Update documentation.

---

## STAGE 3

Moralis + BOT Chain RPC.

Implement:

- server-side Moralis service
- RPC service
- environment variables
- wallet data retrieval
- transaction retrieval
- token retrieval
- normalizers

Do not implement Gemini yet.

---

## STAGE 4

Investigation dashboard.

Implement:

- Wallet Overview
- Assets
- Transactions
- Transaction Detail
- Timeline
- loading states
- errors
- pagination

Use real data.

---

## STAGE 5

Analysis engine.

Implement:

- transaction classifier
- activity score
- counterparties
- attention signals
- evidence IDs

All deterministic.

---

## STAGE 6

Gemini investigation.

Implement:

- Gemini server-side service
- AI prompts
- investigator
- AI wallet profile
- investigation report
- transaction explanation

AI receives structured evidence only.

---

## STAGE 7

Ask the Wallet.

Implement:

- chat interface
- question understanding
- relevant evidence selection
- compact evidence context
- Gemini answer
- evidence references

Do not send the entire transaction history unnecessarily.

---

## STAGE 8

Attention signals + evidence refinement.

Improve:

- signal explanations
- evidence cards
- evidence links
- transaction references
- AI traceability

---

## STAGE 9

BOT Chain report registry.

Only implement if the MVP is already stable.

Create:

- InvestigationRegistry.sol
- report hashing
- report ID
- wallet address
- timestamp
- report hash

Otherwise document it as future work.

---

## STAGE 10

Final polish.

Test:

- mobile
- desktop
- wallet connection
- network switching
- API failures
- empty wallets
- large transaction histories
- AI failures
- responsive behavior

Optimize the interface.

Prepare production deployment.

---

# 58. IMPORTANT CHANGE CONTROL RULE

Never modify 10 unrelated files to implement one small feature.

Keep changes localized.

If a feature genuinely requires multiple files, explain why.

Do not duplicate functionality.

Before creating a new file:

1. Inspect the existing project.
2. Determine whether existing code can be reused.
3. Determine whether a new file is actually necessary.
4. Avoid creating a second component/service that performs the same responsibility.

If a file becomes too large, split it by responsibility.

Avoid files exceeding approximately 300 lines unless there is a clear reason.

---

# 59. FEEDBACK.TXT

Create:

`feedback.txt`

This is a communication log between the coding agent and the human developer.

After every major stage, update:

```text
DATE

STAGE

STATUS

WHAT WAS BUILT

FILES CREATED/CHANGED

WHAT WORKS

WHAT WAS ACTUALLY TESTED

WHAT HAS NOT BEEN TESTED

KNOWN ISSUES

WHAT THE HUMAN SHOULD CHECK

NEXT DEVELOPMENT STEP
```

Do not claim something works if it has not been tested.

Example:

```text
STAGE:
Wallet connection

STATUS:
Implemented

FILES:
src/context/WalletContext.jsx
src/services/wallet.js
src/components/WalletConnect.jsx

WORKS:
Reown AppKit loads.
BOT Chain Testnet is configured.

TESTED:
Desktop browser UI.

NOT TESTED:
Real mobile wallet connection.

HUMAN CHECK:
Connect an actual wallet and confirm BOT Chain is detected.

NEXT:
Implement wallet data retrieval.
```

Keep this file concise.

---

# 60. STEPS.TXT

Create:

`steps.txt`

This is specifically for the human developer.

Explain in simple language:

1. Install dependencies.
2. Create `.env`.
3. Configure each environment variable.
4. Obtain the required API keys.
5. Configure Reown.
6. Configure BOT Chain.
7. Start development server.
8. Test the application.
9. Build the application.
10. Deploy to Vercel.
11. Add Vercel environment variables.
12. Verify production deployment.
13. Troubleshoot common problems.

Assume the human is still learning React and JavaScript.

Never assume advanced knowledge.

Update this file whenever a new human setup action becomes necessary.

---

# 61. README.MD

Create:

`README.md`

Explain:

- what the application does
- why it exists
- architecture
- folder structure
- frontend/backend boundary
- API responsibilities
- BOT Chain configuration
- data normalization
- deterministic analysis
- AI architecture
- evidence system
- Ask the Wallet
- environment variables
- local development
- deployment
- testing
- known limitations
- future report anchoring

Keep the explanation understandable.

---

# 62. ENVIRONMENT VARIABLES

Create:

`.env.example`

Use:

```text
VITE_REOWN_PROJECT_ID=

BOT_RPC_URL=

MORALIS_API_KEY=

COINGECKO_API_KEY=

GEMINI_API_KEY=
```

Only public configuration should use `VITE_`.

Never put secret keys in `VITE_` variables.

Never commit `.env`.

---

# 63. RECENT INVESTIGATION STORAGE

Use localStorage.

Do not create a database.

Store:

```text
address
network
timestamp
```

Keep this feature simple.

---

# 64. FINAL PRODUCT QUALITY

The finished application should feel like one coherent product.

Maintain:

- one design system
- one typography system
- one spacing system
- consistent cards
- consistent buttons
- consistent loading states
- consistent error states
- consistent terminology

It must not look like several AI-generated pages glued together.

---

# 65. FIRST TASK

Before writing application code:

1. Inspect the current project directory.
2. Determine whether this is a new or existing project.
3. Do not overwrite working files unnecessarily.
4. Identify existing dependencies.
5. Identify existing components that can be reused.
6. Create the project architecture if required.
7. Create the initial visual shell.

The first screen must establish the final design language:

**Dark cyber investigation interface.**

It should include:

- BOT Chain identity
- wallet investigation input
- wallet connection area
- BOT Chain network status
- subtle terminal/arcade effects
- responsive layout

Do not build the complete application in one step.

After the initial shell is complete:

1. Run the application.
2. Test the initial shell.
3. Update `feedback.txt`.
4. Update `steps.txt`.
5. Update `README.md`.
6. Explain what was created.
7. Tell the human exactly what they need to do next.
8. Wait for confirmation before moving to the next major stage if interactive development is possible.

The objective is a maintainable BOT Chain AI investigation dApp, not a large generated code dump.

---

# 66. FINAL NON-NEGOTIABLE RULES

Remember these throughout development:

**1. BOT Chain first.**

**2. Real blockchain data only.**

**3. Never expose secret API keys to the frontend.**

**4. Gemini interprets evidence. Gemini does not create blockchain facts.**

**5. Deterministic calculations belong in application code.**

**6. Every important AI claim should be traceable to evidence where possible.**

**7. Never fabricate missing data.**

**8. Never claim an unverified address belongs to a protocol.**

**9. Never create endless wallet network-switch retries.**

**10. Mobile wallet behavior must be explicitly tested.**

**11. Never send the entire transaction history to Gemini unnecessarily.**

**12. Reuse cached investigation data.**

**13. Keep files focused.**

**14. Avoid unnecessary dependencies.**

**15. Never modify unrelated files without a reason.**

**16. Never silently work around a broken feature.**

**17. Update `feedback.txt`, `steps.txt`, and `README.md` as development progresses.**

**18. Never claim something was tested when it was not.**

**19. Do not use em dashes anywhere in code comments, documentation, UI copy, or generated AI responses.**

**20. Build and verify one stage before moving to the next.**

The goal is not simply to generate code.

The goal is to build a maintainable, evidence-driven BOT Chain investigation product that can be understood, tested, debugged, and deployed by a developer who is still learning.

/**
 * shared/registryAbi.js - ABI for InvestigationRegistry.sol.
 * Shared by the API server (api/services/registry.js), the deploy script
 * (scripts/deploy-registry.js), and the client (RegistryVerify, Snapshot).
 * Single source of truth so the contract and callers never drift apart.
 */

export const REGISTRY_ABI = [
  {
    type: 'event',
    name: 'ReportAnchored',
    inputs: [
      { name: 'wallet', type: 'address', indexed: true },
      { name: 'summaryHash', type: 'bytes32', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
      { name: 'investigator', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'SnapshotMinted',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'wallet', type: 'address', indexed: true },
      { name: 'summaryHash', type: 'bytes32', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false },
      { name: 'investigator', type: 'address', indexed: false },
    ],
  },
  {
    type: 'function',
    name: 'anchorReport',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'wallet', type: 'address' },
      { name: 'summaryHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'mintSnapshot',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'wallet', type: 'address' },
      { name: 'summaryHash', type: 'bytes32' },
      { name: 'dataRef', type: 'string' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getReports',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [
      {
        type: 'tuple[]',
        components: [
          { name: 'summaryHash', type: 'bytes32' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'investigator', type: 'address' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'reportCount',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'snapshotsOf',
    stateMutability: 'view',
    inputs: [{ name: 'wallet', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    type: 'function',
    name: 'snapshotOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'wallet', type: 'address' },
          { name: 'summaryHash', type: 'bytes32' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'investigator', type: 'address' },
          { name: 'dataRef', type: 'string' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getSnapshotAtOrBefore',
    stateMutability: 'view',
    inputs: [{ name: 'timestamp', type: 'uint256' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'tokenId', type: 'uint256' },
          { name: 'wallet', type: 'address' },
          { name: 'summaryHash', type: 'bytes32' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'investigator', type: 'address' },
          { name: 'dataRef', type: 'string' },
        ],
      },
      { name: 'found', type: 'bool' },
    ],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'supportsInterface',
    stateMutability: 'view',
    inputs: [{ name: 'interfaceId', type: 'bytes4' }],
    outputs: [{ name: '', type: 'bool' }],
  },
];
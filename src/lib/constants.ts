export const SUBGRAPH_ID =
  "FE63YgkzcpVocxdCEyEYbvjYqEf2kb1A6daMYRxmejYC";

export function getSubgraphUrl(): string {
  const apiKey = process.env.GRAPH_API_KEY;
  if (!apiKey) {
    throw new Error("GRAPH_API_KEY environment variable is not set");
  }
  return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${SUBGRAPH_ID}`;
}

export const IPFS_GATEWAYS = [
  "https://w3s.link/ipfs",
  "https://ipfs.io/ipfs",
  "https://dweb.link/ipfs",
];

export const IPFS_TIMEOUT_MS = 5000;

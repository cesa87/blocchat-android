import type {SearchResult} from '../types/profile';

export function formatSearchResult(result: SearchResult): string {
  if (result.username) {
    return `@${result.username}`;
  }
  if (result.display_name) {
    return result.display_name;
  }
  return `${result.wallet_address.slice(0, 6)}...${result.wallet_address.slice(-4)}`;
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

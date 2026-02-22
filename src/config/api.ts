// API Configuration for React Native
// In production, use react-native-config or a .env approach
const API_BASE_URL = __DEV__
  ? 'http://10.0.2.2:8080' // Android emulator localhost alias
  : 'https://api.blocchat.xyz'; // Production URL

export { API_BASE_URL };

export const API_ENDPOINTS = {
  // Payments
  createTransaction: `${API_BASE_URL}/api/payments/transactions`,
  getTransaction: (txHash: string) => `${API_BASE_URL}/api/payments/transactions/${txHash}`,
  getConversationTransactions: (conversationId: string) =>
    `${API_BASE_URL}/api/payments/conversations/${conversationId}/transactions`,

  // Token Gates
  createTokenGate: (conversationId: string) =>
    `${API_BASE_URL}/api/token-gates/conversations/${conversationId}`,
  getTokenGate: (conversationId: string) =>
    `${API_BASE_URL}/api/token-gates/conversations/${conversationId}`,
  deleteTokenGate: (conversationId: string) =>
    `${API_BASE_URL}/api/token-gates/conversations/${conversationId}`,
  verifyTokenGate: `${API_BASE_URL}/api/token-gates/verify`,

  // Shops
  createShop: (conversationId: string) =>
    `${API_BASE_URL}/api/shops/conversations/${conversationId}/shops`,
  getShops: (conversationId: string) =>
    `${API_BASE_URL}/api/shops/conversations/${conversationId}/shops`,
  getShop: (shopId: string) => `${API_BASE_URL}/api/shops/${shopId}`,
  updateShop: (shopId: string) => `${API_BASE_URL}/api/shops/${shopId}`,
  deleteShop: (shopId: string) => `${API_BASE_URL}/api/shops/${shopId}`,
  createItem: (shopId: string) => `${API_BASE_URL}/api/shops/${shopId}/items`,
  getItems: (shopId: string) => `${API_BASE_URL}/api/shops/${shopId}/items`,
  updateItem: (itemId: string) => `${API_BASE_URL}/api/items/${itemId}`,
  deleteItem: (itemId: string) => `${API_BASE_URL}/api/items/${itemId}`,

  // Groups (public registry)
  registerGroup: `${API_BASE_URL}/api/groups`,
  searchGroups: (query: string) =>
    `${API_BASE_URL}/api/groups/search?q=${encodeURIComponent(query)}`,
  getGroup: (conversationId: string) => `${API_BASE_URL}/api/groups/${conversationId}`,
  updateGroup: (conversationId: string) => `${API_BASE_URL}/api/groups/${conversationId}`,
  deleteGroup: (conversationId: string) => `${API_BASE_URL}/api/groups/${conversationId}`,

  // Typing indicators
  typing: (conversationId: string) =>
    `${API_BASE_URL}/api/conversations/${conversationId}/typing`,

  // Health
  health: `${API_BASE_URL}/api/health`,

  // Profiles
  initProfile: `${API_BASE_URL}/api/profiles/init`,
  getProfileByWallet: (walletAddress: string) =>
    `${API_BASE_URL}/api/profiles/${walletAddress}`,
  getProfileByUsername: (username: string) =>
    `${API_BASE_URL}/api/profiles/username/${username}`,
  claimUsername: `${API_BASE_URL}/api/profiles/claim`,
  updateProfile: `${API_BASE_URL}/api/profiles/update`,
  searchProfiles: (query: string) =>
    `${API_BASE_URL}/api/profiles/search?q=${encodeURIComponent(query)}`,
  checkUsername: (username: string) => `${API_BASE_URL}/api/profiles/check/${username}`,
};

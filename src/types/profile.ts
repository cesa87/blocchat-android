export interface UserProfile {
  wallet_address: string;
  inbox_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface ClaimUsernameRequest {
  wallet_address: string;
  inbox_id: string;
  username: string;
}

export interface UpdateProfileRequest {
  wallet_address: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
}

export interface SearchResult {
  wallet_address: string;
  inbox_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

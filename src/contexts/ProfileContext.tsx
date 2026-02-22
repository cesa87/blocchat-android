import React, {createContext, useContext, useState, useEffect} from 'react';
import {useAccount} from '@reown/appkit-react-native';
import {useXMTP} from './XMTPContext';
import type {UserProfile} from '../types/profile';
import {API_ENDPOINTS} from '../config/api';

interface ProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const {address, isConnected} = useAccount();
  const {client, isInitialized} = useXMTP();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeProfile = async () => {
    if (!address || !client?.inboxId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(API_ENDPOINTS.initProfile, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          wallet_address: address.toLowerCase(),
          inbox_id: client.inboxId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize profile');
      }

      const profileData = await response.json();
      setProfile(profileData);
    } catch (err: any) {
      console.error('Failed to initialize profile:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (!address) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        API_ENDPOINTS.getProfileByWallet(address.toLowerCase()),
      );

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const profileData = await response.json();
      setProfile(profileData);
    } catch (err: any) {
      console.error('Failed to refresh profile:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const updateUsername = async (username: string) => {
    if (!address || !client?.inboxId) {
      throw new Error('Wallet not connected');
    }

    const response = await fetch(API_ENDPOINTS.claimUsername, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        wallet_address: address.toLowerCase(),
        inbox_id: client.inboxId,
        username,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update username');
    }

    const profileData = await response.json();
    setProfile(profileData);
  };

  useEffect(() => {
    if (isConnected && address && isInitialized && client?.inboxId && !profile) {
      initializeProfile();
    }
  }, [isConnected, address, isInitialized, client?.inboxId]);

  useEffect(() => {
    if (!isConnected) {
      setProfile(null);
      setError(null);
    }
  }, [isConnected]);

  return (
    <ProfileContext.Provider
      value={{profile, isLoading, error, refreshProfile, updateUsername}}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within ProfileProvider');
  }
  return context;
};

import React, {createContext, useContext, useState, useEffect, useRef} from 'react';
import {Client} from '@xmtp/react-native-sdk';
import {useAccount, useProvider} from '@reown/appkit-react-native';
import {createXMTPSigner} from '../utils/xmtpSigner';
import {ethers} from 'ethers';

interface XMTPContextType {
  client: Client | null;
  isInitialized: boolean;
  isInitializing: boolean;
  error: string | null;
  initializeClient: () => Promise<void>;
}

const XMTPContext = createContext<XMTPContextType | undefined>(undefined);

export const XMTPProvider: React.FC<{children: React.ReactNode}> = ({
  children,
}) => {
  const {address, isConnected} = useAccount();
  const {provider: walletProvider, providerType} = useProvider();
  const [client, setClient] = useState<Client | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const providerRef = useRef(walletProvider);
  providerRef.current = walletProvider;

  const initializeClient = async () => {
    if (!address || !isConnected) {
      return;
    }
    if (isInitializing || isInitialized) {
      return;
    }
    if (!providerRef.current || providerType !== 'eip155') {
      console.warn('No EVM provider available yet, waiting...');
      return;
    }

    try {
      setIsInitializing(true);
      setError(null);
      console.log('Initializing XMTP client for address:', address);

      // Use the EIP-1193 provider from Reown useProvider() hook
      const ethersProvider = new ethers.BrowserProvider(
        providerRef.current as any,
      );
      const ethersSigner = await ethersProvider.getSigner();
      const xmtpSigner = createXMTPSigner(ethersSigner);

      // Generate a deterministic dbEncryptionKey from the wallet address
      const addressBytes = ethers.toUtf8Bytes(address.toLowerCase());
      const hash = ethers.keccak256(addressBytes);
      const dbEncryptionKey = ethers.getBytes(hash); // 32 bytes

      console.log('Using persistent encryption key for installation');

      const xmtpClient = await Client.create(xmtpSigner, {
        env: 'production',
        dbEncryptionKey,
      });

      // Request message history from other installations/devices
      try {
        await xmtpClient.sendSyncRequest();
        console.log('Sent sync request to other devices');
      } catch (syncErr) {
        console.warn('Could not send sync request:', syncErr);
      }

      // Sync all conversations
      try {
        await xmtpClient.conversations.syncAll();
        console.log('Synced all conversations from network');
      } catch (syncErr) {
        console.warn('Initial conversation sync failed:', syncErr);
      }

      setClient(xmtpClient);
      setIsInitialized(true);
      console.log('XMTP client initialized successfully');
      console.log('Installation ID:', xmtpClient.installationId);
    } catch (err: any) {
      console.error('Failed to initialize XMTP client:', err);
      setError(err?.message || 'Failed to initialize XMTP');
      setIsInitialized(false);
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    if (isConnected && address && walletProvider && !isInitialized && !isInitializing) {
      initializeClient();
    }
  }, [isConnected, address, walletProvider]);

  useEffect(() => {
    if (!isConnected && client) {
      console.log('Disconnecting XMTP client...');
      setClient(null);
      setIsInitialized(false);
      setError(null);
    }
  }, [isConnected]);

  return (
    <XMTPContext.Provider
      value={{client, isInitialized, isInitializing, error, initializeClient}}>
      {children}
    </XMTPContext.Provider>
  );
};

export const useXMTP = () => {
  const context = useContext(XMTPContext);
  if (!context) {
    throw new Error('useXMTP must be used within XMTPProvider');
  }
  return context;
};

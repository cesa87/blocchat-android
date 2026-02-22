import '@walletconnect/react-native-compat';

import React, {useState} from 'react';
import {StatusBar, Alert} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppKitProvider, AppKit} from '@reown/appkit-react-native';
import {appKit} from './src/config/walletConnect';

import {useAppKit, useAccount} from '@reown/appkit-react-native';
import {XMTPProvider, useXMTP} from './src/contexts/XMTPContext';
import {ProfileProvider} from './src/contexts/ProfileContext';
import WalletConnectScreen from './src/screens/WalletConnectScreen';
import ConversationListScreen from './src/screens/ConversationListScreen';
import ChatScreen from './src/screens/ChatScreen';
import NewChatModal from './src/components/NewChatModal';
import {colors} from './src/theme';

function AppContent() {
  const {isConnected} = useAccount();
  const {disconnect} = useAppKit();
  const {client} = useXMTP();
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);

  const handleChatCreated = async (conversationId: string) => {
    if (client) {
      const convo = await client.conversations.getConversationById(
        conversationId,
      );
      if (convo) {
        setSelectedConversation(convo);
      }
    }
  };

  const handleOpenMenu = () => {
    Alert.alert('Menu', 'Select an option', [
      {text: 'New Chat', onPress: () => setIsNewChatOpen(true)},
      {
        text: 'Refresh',
        onPress: async () => {
          if (client) {
            await client.conversations.syncAll();
          }
        },
      },
      {
        text: 'Disconnect',
        onPress: disconnect,
        style: 'destructive',
      },
      {text: 'Cancel', style: 'cancel'},
    ]);
  };

  if (!isConnected) {
    return <WalletConnectScreen />;
  }

  if (selectedConversation) {
    return (
      <ChatScreen
        conversation={selectedConversation}
        onBack={() => setSelectedConversation(null)}
      />
    );
  }

  return (
    <>
      <ConversationListScreen
        onSelectConversation={setSelectedConversation}
        onNewChat={() => setIsNewChatOpen(true)}
        onOpenMenu={handleOpenMenu}
      />
      <NewChatModal
        isOpen={isNewChatOpen}
        onClose={() => setIsNewChatOpen(false)}
        onChatCreated={handleChatCreated}
      />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.background}
      />
      <AppKitProvider instance={appKit}>
        <XMTPProvider>
          <ProfileProvider>
            <NavigationContainer>
              <AppContent />
            </NavigationContainer>
          </ProfileProvider>
        </XMTPProvider>
        <AppKit />
      </AppKitProvider>
    </SafeAreaProvider>
  );
}

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {useXMTP} from '../contexts/XMTPContext';
import {PublicIdentity} from '@xmtp/react-native-sdk';
import {useAccount} from '@reown/appkit-react-native';
import {API_ENDPOINTS} from '../config/api';
import {formatSearchResult} from '../utils/profile';
import type {SearchResult} from '../types/profile';
import {colors, radii, fontSizes, fontWeights, shadows, spacing} from '../theme';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (conversationId: string) => void;
}

export default function NewChatModal({isOpen, onClose, onChatCreated}: NewChatModalProps) {
  const {client} = useXMTP();
  const {address: walletAddress} = useAccount();
  const [chatType, setChatType] = useState<'dm' | 'group'>('dm');
  const [address, setAddress] = useState('');
  const [groupName, setGroupName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<SearchResult | null>(null);

  useEffect(() => {
    if (chatType === 'dm' && address.length >= 2 && !selectedProfile) {
      const timer = setTimeout(async () => {
        try {
          const res = await fetch(API_ENDPOINTS.searchProfiles(address));
          if (res.ok) setSearchResults(await res.json());
        } catch {
          /* silent */
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [address, chatType, selectedProfile]);

  const selectProfile = (profile: SearchResult) => {
    setSelectedProfile(profile);
    setAddress(profile.inbox_id);
    setSearchResults([]);
  };

  const handleCreate = async () => {
    if (!client) return;
    if (chatType === 'dm' && !address) return;

    setIsLoading(true);
    setError(null);

    try {
      let conversation;

      if (chatType === 'group') {
        conversation = await client.conversations.newGroup([], {name: groupName.trim() || undefined});

        if (groupName.trim() && walletAddress) {
          try {
            await fetch(API_ENDPOINTS.registerGroup, {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                conversation_id: conversation.id,
                name: groupName.trim(),
                description: null,
                image_url: null,
                owner_inbox_id: client.inboxId,
                owner_wallet: walletAddress,
              }),
            });
          } catch {
            /* silent */
          }
        }
      } else {
        const isInboxId = address.length === 64 && /^[0-9a-f]+$/i.test(address);

        if (isInboxId) {
          await client.conversations.syncAllConversations();
          let dm = await client.conversations.findDmByInboxId(address);
          if (!dm) {
            dm = await client.conversations.findOrCreateDm(address);
          }
          conversation = dm;
        } else {
          // Assume Ethereum address
          await client.conversations.syncAllConversations();
          conversation = await client.conversations.findOrCreateDmWithIdentity(
            new PublicIdentity(address.toLowerCase(), 'ETHEREUM'),
          );
        }
      }

      onChatCreated(conversation.id);
      onClose();
      resetState();
    } catch (err: any) {
      console.error('Failed to create chat:', err);
      setError(err.message || 'Failed to create chat');
    } finally {
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setChatType('dm');
    setAddress('');
    setGroupName('');
    setSelectedProfile(null);
    setSearchResults([]);
    setError(null);
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>New Chat</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
            {/* Chat Type Selector */}
            <View style={styles.typeSelector}>
              <Pressable
                style={[styles.typeButton, chatType === 'dm' && styles.typeButtonActive]}
                onPress={() => setChatType('dm')}>
                <Text style={[styles.typeButtonText, chatType === 'dm' && styles.typeButtonTextActive]}>
                  Direct Message
                </Text>
              </Pressable>
              <Pressable
                style={[styles.typeButton, chatType === 'group' && styles.typeButtonActive]}
                onPress={() => setChatType('group')}>
                <Text style={[styles.typeButtonText, chatType === 'group' && styles.typeButtonTextActive]}>
                  Group Chat
                </Text>
              </Pressable>
            </View>

            {chatType === 'dm' ? (
              <View>
                <Text style={styles.label}>Search by username, address, or inbox ID</Text>
                <TextInput
                  style={styles.input}
                  value={selectedProfile ? formatSearchResult(selectedProfile) : address}
                  onChangeText={text => {
                    setAddress(text);
                    setSelectedProfile(null);
                  }}
                  placeholder="@username, 0x..., or inbox ID"
                  placeholderTextColor={colors.mutedForeground}
                  editable={!isLoading}
                  autoCapitalize="none"
                />

                {/* Search Results */}
                {searchResults.length > 0 && !selectedProfile && (
                  <View style={styles.searchResults}>
                    {searchResults.map(result => (
                      <Pressable
                        key={result.inbox_id}
                        style={styles.searchResultItem}
                        onPress={() => selectProfile(result)}>
                        <Text style={styles.searchResultName}>
                          {formatSearchResult(result)}
                        </Text>
                        <Text style={styles.searchResultAddress}>
                          {result.wallet_address.slice(0, 10)}...{result.wallet_address.slice(-8)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}

                {selectedProfile && (
                  <Text style={styles.selectedText}>
                    ✓ Selected: {formatSearchResult(selectedProfile)}
                  </Text>
                )}
              </View>
            ) : (
              <View>
                <Text style={styles.label}>Group Name (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={groupName}
                  onChangeText={setGroupName}
                  placeholder="My Group Chat"
                  placeholderTextColor={colors.mutedForeground}
                  editable={!isLoading}
                />
              </View>
            )}

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable style={styles.cancelButton} onPress={onClose} disabled={isLoading}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.createButton, (chatType === 'dm' && !address) && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={(chatType === 'dm' && !address) || isLoading}>
              <Text style={styles.createButtonText}>
                {isLoading ? 'Creating...' : chatType === 'dm' ? 'Start Chat' : 'Create Group'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.modal,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: colors.foreground,
  },
  closeButton: {
    padding: spacing.xs,
  },
  closeText: {
    fontSize: 28,
    color: colors.mutedForeground,
  },
  content: {
    paddingHorizontal: spacing.xxl,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  typeButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  typeButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.card,
  },
  typeButtonText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.mutedForeground,
  },
  typeButtonTextActive: {
    color: colors.accent,
  },
  label: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
    color: colors.foreground,
    fontFamily: 'monospace',
    marginBottom: spacing.sm,
  },
  searchResults: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  searchResultItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  searchResultName: {
    fontSize: fontSizes.md,
    color: colors.foreground,
  },
  searchResultAddress: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  selectedText: {
    fontSize: fontSizes.xs,
    color: colors.online,
    marginBottom: spacing.md,
  },
  errorContainer: {
    backgroundColor: 'rgba(224, 40, 40, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(224, 40, 40, 0.3)',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: fontSizes.sm,
    color: colors.destructive,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  cancelButtonText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.secondaryForeground,
  },
  createButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.5,
    borderColor: colors.borderSubtle,
  },
  createButtonText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.accent,
  },
});

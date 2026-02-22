import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {useAccount} from '@reown/appkit-react-native';
import {useXMTP} from '../contexts/XMTPContext';
import {useProfile} from '../contexts/ProfileContext';
import {API_ENDPOINTS} from '../config/api';
import {formatAddress} from '../utils/profile';
import {colors, radii, fontSizes, fontWeights, shadows, spacing} from '../theme';

interface ConversationListScreenProps {
  onSelectConversation: (conversation: any) => void;
  onNewChat: () => void;
  onOpenMenu: () => void;
}

export default function ConversationListScreen({
  onSelectConversation,
  onNewChat,
  onOpenMenu,
}: ConversationListScreenProps) {
  const {address} = useAccount();
  const {client, isInitialized, isInitializing, error} = useXMTP();
  const {profile} = useProfile();
  const [conversations, setConversations] = useState<any[]>([]);
  const [conversationNames, setConversationNames] = useState<Map<string, string>>(new Map());
  const [conversationPreviews, setConversationPreviews] = useState<Map<string, string>>(new Map());
  const [conversationTimes, setConversationTimes] = useState<Map<string, Date>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isInitialized && client) {
      fetchConversations();
    }
  }, [isInitialized, client]);

  const extractPreviewText = (message: any) => {
    if (!message) return '';
    if (typeof message.content === 'string') return message.content;
    if (message.content && typeof message.content === 'object') {
      return (message.content as any).text || '';
    }
    return '';
  };

  const fetchConversations = async () => {
    if (!client) return;
    try {
      await client.conversations.syncAll();
      const convos = await client.conversations.list();
      setConversations(convos);

      // Resolve names for DM conversations
      const nameMap = new Map<string, string>();
      for (const convo of convos) {
        const convAny = convo as any;
        const isGroup = 'name' in convAny;

        if (!isGroup) {
          try {
            await convo.sync();
            let peerInboxId: string | null = null;

            if (typeof convAny.peerInboxId === 'function') {
              peerInboxId = await convAny.peerInboxId();
            }
            if (!peerInboxId && typeof convAny.members === 'function') {
              const members = await convAny.members();
              const peer = members.find((m: any) => m.inboxId !== client.inboxId);
              peerInboxId = peer?.inboxId || null;
            }

            if (peerInboxId) {
              const response = await fetch(API_ENDPOINTS.searchProfiles(peerInboxId));
              if (response.ok) {
                const results = await response.json();
                const match = results.find((r: any) => r.inbox_id === peerInboxId);
                if (match?.username) {
                  nameMap.set(convo.id, `@${match.username}`);
                } else if (match?.wallet_address) {
                  nameMap.set(convo.id, formatAddress(match.wallet_address));
                } else {
                  nameMap.set(convo.id, `${peerInboxId.slice(0, 8)}...`);
                }
              }
            }
          } catch {
            /* silent */
          }
        }
      }
      setConversationNames(nameMap);

      // Fetch previews
      const previewMap = new Map<string, string>();
      const timeMap = new Map<string, Date>();
      await Promise.all(
        convos.map(async convo => {
          try {
            const msgs = await convo.messages();
            const last = msgs[msgs.length - 1];
            const text = extractPreviewText(last);
            if (text) {
              previewMap.set(convo.id, text);
              if (last?.sentAt) timeMap.set(convo.id, last.sentAt);
            }
          } catch {
            /* silent */
          }
        }),
      );
      setConversationPreviews(previewMap);
      setConversationTimes(timeMap);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const getDisplayName = (conversation: any) => {
    const convAny = conversation as any;
    const isGroup = 'name' in convAny;
    if (isGroup) return convAny.name || 'Group Chat';
    return conversationNames.get(conversation.id) || `${conversation.id.slice(0, 12)}...`;
  };

  const renderConversation = useCallback(
    ({item}: {item: any}) => {
      const displayName = getDisplayName(item);
      const isGroup = 'name' in (item as any);
      const preview = conversationPreviews.get(item.id) || 'Encrypted chat';
      const lastTime = conversationTimes.get(item.id);

      return (
        <Pressable
          style={({pressed}) => [
            styles.conversationItem,
            pressed && styles.conversationItemPressed,
          ]}
          onPress={() => onSelectConversation(item)}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.conversationContent}>
            <View style={styles.conversationHeader}>
              <Text style={styles.conversationName} numberOfLines={1}>
                {displayName}
              </Text>
              {isGroup && (
                <View style={styles.chip}>
                  <Text style={styles.chipText}>Group</Text>
                </View>
              )}
            </View>
            <Text style={styles.conversationPreview} numberOfLines={1}>
              {preview}
            </Text>
          </View>
          <Text style={styles.conversationTime}>
            {lastTime
              ? lastTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </Text>
        </Pressable>
      );
    },
    [conversationNames, conversationPreviews, conversationTimes],
  );

  const statusText = isInitializing
    ? 'Connecting'
    : isInitialized
      ? 'Ready'
      : 'Offline';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Pressable style={styles.menuButton} onPress={onOpenMenu}>
            <Text style={styles.menuIcon}>☰</Text>
          </Pressable>
          <View style={styles.chipStatus}>
            <Text style={styles.chipStatusText}>{statusText}</Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>BlocChat</Text>
        <Text style={styles.headerSubtitle}>Encrypted P2P messaging.</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations"
          placeholderTextColor={colors.mutedForeground}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* XMTP Status */}
      {isInitializing && (
        <View style={styles.statusBar}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.statusText}>Initializing XMTP...</Text>
        </View>
      )}
      {error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText}>Error: {error}</Text>
        </View>
      )}

      {/* Conversation List */}
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={item => item.id}
        style={styles.list}
        contentContainerStyle={conversations.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon} />
            <Text style={styles.emptyText}>
              No conversations yet. Start a new thread.
            </Text>
            <Pressable
              style={styles.newChatButtonEmpty}
              onPress={onNewChat}>
              <Text style={styles.newChatButtonText}>New Chat</Text>
            </Pressable>
          </View>
        }
      />

      {/* Footer */}
      <View style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Connected wallet</Text>
          <Text style={styles.footerName}>
            {profile?.username ? `@${profile.username}` : 'Wallet identity'}
          </Text>
          {address && (
            <Text style={styles.footerAddress}>{formatAddress(address)}</Text>
          )}
        </View>
        {isInitialized && (
          <Pressable style={styles.newChatButton} onPress={onNewChat}>
            <Text style={styles.newChatButtonText}>New Chat</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  menuButton: {
    padding: spacing.xs,
  },
  menuIcon: {
    fontSize: fontSizes.xl,
    color: colors.foreground,
  },
  chipStatus: {
    backgroundColor: colors.muted,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipStatusText: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
  },
  headerTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
  },
  headerSubtitle: {
    fontSize: fontSizes.md,
    color: colors.mutedForeground,
    marginBottom: spacing.lg,
  },
  searchInput: {
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.full,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
    color: colors.foreground,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255, 0, 102, 0.08)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  statusText: {
    fontSize: fontSizes.md,
    color: colors.accent,
  },
  errorBar: {
    backgroundColor: 'rgba(224, 40, 40, 0.1)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(224, 40, 40, 0.3)',
  },
  errorText: {
    fontSize: fontSizes.md,
    color: colors.destructive,
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: 40,
  },
  emptyIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.card,
    marginBottom: spacing.lg,
  },
  emptyText: {
    fontSize: fontSizes.md,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  conversationItemPressed: {
    backgroundColor: 'rgba(236, 233, 227, 0.4)',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255, 0, 102, 0.1)',
    borderWidth: 1,
    borderColor: colors.accentBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.accent,
  },
  conversationContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  conversationName: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
    flexShrink: 1,
  },
  chip: {
    backgroundColor: colors.muted,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  chipText: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
  },
  conversationPreview: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  conversationTime: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  footerLabel: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
  },
  footerName: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
  },
  footerAddress: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
    fontFamily: 'monospace',
  },
  newChatButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  newChatButtonEmpty: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
  },
  newChatButtonText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.accent,
  },
});

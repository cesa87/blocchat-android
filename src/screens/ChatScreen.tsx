import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useXMTP} from '../contexts/XMTPContext';
import {useAccount, useProvider} from '@reown/appkit-react-native';
import {ethers} from 'ethers';
import {API_ENDPOINTS} from '../config/api';
import {formatAddress} from '../utils/profile';
import {colors, radii, fontSizes, fontWeights, shadows, spacing} from '../theme';

// USDC on Base
const USDC_BASE_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const ERC20_ABI = ['function transfer(address to, uint256 amount) returns (bool)'];

const SUPPORTED_TOKENS: Record<string, {decimals: number; isNative: boolean}> = {
  ETH: {decimals: 18, isNative: true},
  USDC: {decimals: 6, isNative: false},
};

const SLASH_COMMANDS = [
  {
    command: '/pay',
    template: '/pay ',
    syntax: '/pay <amount> <token>',
    description: 'Send a crypto payment',
    example: '/pay 0.01 ETH',
    icon: '💸',
  },
];

interface PaymentPreview {
  amount: string;
  token: string;
  recipientAddress: string;
}

interface ChatScreenProps {
  conversation: any;
  onBack: () => void;
}

export default function ChatScreen({conversation, onBack}: ChatScreenProps) {
  const {client} = useXMTP();
  const {address} = useAccount();
  const {provider: walletProvider} = useProvider();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGroup, setIsGroup] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('Conversation');
  const [paymentPreview, setPaymentPreview] = useState<PaymentPreview | null>(null);
  const [isSendingPayment, setIsSendingPayment] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadMessages();
    loadMetadata();
    setupStream();
  }, [conversation.id]);

  const loadMetadata = async () => {
    const convAny = conversation as any;
    const hasGroupName = 'name' in convAny;
    setIsGroup(hasGroupName);

    if (hasGroupName) {
      setHeaderTitle(convAny.name || 'Group Chat');
    } else {
      // Resolve DM peer name
      try {
        if (typeof convAny.peerInboxId === 'function') {
          const peerInboxId = await convAny.peerInboxId();
          if (peerInboxId) {
            const res = await fetch(API_ENDPOINTS.searchProfiles(peerInboxId));
            if (res.ok) {
              const results = await res.json();
              const match = results.find((r: any) => r.inbox_id === peerInboxId);
              if (match?.username) {
                setHeaderTitle(`@${match.username}`);
              } else if (match?.wallet_address) {
                setHeaderTitle(formatAddress(match.wallet_address));
              }
            }
          }
        }
      } catch {
        setHeaderTitle('DM');
      }
    }
  };

  const getMessageText = (m: any): string => {
    try {
      // v5.x: content is a function
      if (typeof m.content === 'function') {
        const decoded = m.content();
        if (typeof decoded === 'string') return decoded;
        if (decoded?.text) return decoded.text;
      }
    } catch {}
    // Fallback to nativeContent.text
    return m.nativeContent?.text || '';
  };

  const getSentAt = (m: any): Date => {
    if (m.sentNs) return new Date(Number(BigInt(m.sentNs) / 1000000n));
    if (m.sentAt instanceof Date) return m.sentAt;
    return new Date();
  };

  const loadMessages = async () => {
    try {
      await conversation.sync();
      const msgs = await conversation.messages();
      // Filter system messages
      const filtered = msgs.filter((m: any) => {
        const text = getMessageText(m);
        if (!text.trim() || text === '{}') return false;
        // Filter XMTP group admin system messages
        const native = m.nativeContent || {};
        if (native.initiatedByInboxId || native.addedInboxes || native.removedInboxes || native.metadataFieldChanges) return false;
        return true;
      });
      setMessages(filtered.reverse()); // Reversed for inverted FlatList
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const setupStream = async () => {
    let cancelStream: (() => Promise<void>) | undefined;
    try {
      cancelStream = await conversation.streamMessages(
        (message: any) => {
          setMessages(prev => {
            if (prev.some((m: any) => m.id === message.id)) return prev;
            return [message, ...prev];
          });
        },
      );
    } catch (err) {
      console.error('Stream error:', err);
      // Fallback to periodic sync
      const interval = setInterval(() => loadMessages(), 3000);
      return () => clearInterval(interval);
    }
    return () => { cancelStream?.(); };
  };

  const getPeerAddress = async (): Promise<string | null> => {
    try {
      const members = await conversation.members();
      const peer = members.find((m: any) => m.inboxId !== client?.inboxId);
      // identities[0].identifier is the wallet address (lowercased by SDK)
      const addr = peer?.identities?.[0]?.identifier;
      return addr || null;
    } catch {
      return null;
    }
  };

  const handlePayCommand = async (command: string) => {
    if (isGroup) {
      Alert.alert('Not supported', '/pay is only available in direct messages.');
      return;
    }

    const parts = command.trim().split(/\s+/);
    if (parts.length < 3) {
      Alert.alert('Usage', '/pay <amount> <token>\nExample: /pay 0.01 ETH');
      return;
    }

    const amount = parts[1];
    const token = parts[2].toUpperCase();

    if (!SUPPORTED_TOKENS[token]) {
      Alert.alert(
        'Unsupported token',
        `Supported tokens: ${Object.keys(SUPPORTED_TOKENS).join(', ')}`,
      );
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a positive number.');
      return;
    }

    const recipientAddress = await getPeerAddress();
    if (!recipientAddress) {
      Alert.alert('Error', 'Could not resolve recipient wallet address.');
      return;
    }

    setPaymentPreview({amount, token, recipientAddress});
    setNewMessage('');
  };

  const executePayment = async () => {
    if (!paymentPreview || !walletProvider) {
      Alert.alert('Error', 'Wallet not connected.');
      return;
    }

    setIsSendingPayment(true);
    try {
      const ethersProvider = new ethers.BrowserProvider(walletProvider as any);
      const signer = await ethersProvider.getSigner();
      const fromAddress = await signer.getAddress();
      const {amount, token, recipientAddress} = paymentPreview;
      const tokenInfo = SUPPORTED_TOKENS[token];

      let txHash: string;

      if (tokenInfo.isNative) {
        // Native ETH transfer
        const tx = await signer.sendTransaction({
          to: recipientAddress,
          value: ethers.parseEther(amount),
        });
        txHash = tx.hash;
      } else {
        // ERC-20 transfer (USDC on Base)
        const contract = new ethers.Contract(USDC_BASE_ADDRESS, ERC20_ABI, signer);
        const tx = await contract.transfer(
          recipientAddress,
          ethers.parseUnits(amount, tokenInfo.decimals),
        );
        txHash = tx.hash;
      }

      // Post payment message in chat
      const paymentMsg = `💸 ${JSON.stringify({
        type: 'payment',
        amount,
        token,
        txHash,
        from: fromAddress.toLowerCase(),
        to: recipientAddress,
      })}`;
      await conversation.send(paymentMsg);
      setPaymentPreview(null);
      await loadMessages();
    } catch (err: any) {
      const msg = err?.reason || err?.message || 'Transaction failed';
      Alert.alert('Transaction failed', msg);
    } finally {
      setIsSendingPayment(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    // Intercept /pay command
    if (newMessage.trim().toLowerCase().startsWith('/pay')) {
      await handlePayCommand(newMessage.trim());
      return;
    }

    setIsSending(true);
    try {
      await conversation.send(newMessage);
      setNewMessage('');
      await loadMessages();
    } catch (err) {
      console.error('Failed to send:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const isMyMessage = (message: any) => {
    return message.senderInboxId === client?.inboxId;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderMessage = useCallback(
    ({item}: {item: any}) => {
      const isMine = isMyMessage(item);
      const messageText = getMessageText(item);

      if (!messageText.trim()) return null;

      // Payment message detection
      let isPayment = false;
      if (messageText.includes('💸') && messageText.includes('{"type":"payment"')) {
        isPayment = true;
        try {
          const jsonStr = messageText.substring(messageText.indexOf('{'));
          const paymentData = JSON.parse(jsonStr);
          const displayText = `💸 Sent ${paymentData.amount} ${paymentData.token}`;
          return (
            <View style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowTheirs]}>
              <View style={[styles.bubble, styles.paymentBubble]}>
                <Text style={styles.paymentText}>{displayText}</Text>
                <Text style={styles.paymentHash}>
                  {formatAddress(paymentData.txHash)}
                </Text>
                <Text style={styles.messageTime}>{formatTime(getSentAt(item))}</Text>
              </View>
            </View>
          );
        } catch {
          /* render as normal */
        }
      }

      return (
        <View
          style={[
            styles.messageRow,
            isMine ? styles.messageRowMine : styles.messageRowTheirs,
          ]}>
          <View
            style={[
              styles.bubble,
              isMine ? styles.bubbleMine : styles.bubbleTheirs,
            ]}>
            <Text
              style={[
                styles.messageText,
                isMine ? styles.messageTextMine : styles.messageTextTheirs,
              ]}>
              {messageText}
            </Text>
            <View style={styles.messageFooter}>
              <Text
                style={[
                  styles.messageTime,
                  isMine ? styles.messageTimeMine : styles.messageTimeTheirs,
                ]}>
                {formatTime(getSentAt(item))}
              </Text>
              {isMine && (
                <Text style={styles.readReceipt}>✓</Text>
              )}
            </View>
          </View>
        </View>
      );
    },
    [client?.inboxId],
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>
            {headerTitle.slice(0, 1).toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {headerTitle}
          </Text>
          <Text style={styles.headerSubtitle}>
            {isGroup ? 'Group chat' : 'Direct message'} · 🔒 Encrypted
          </Text>
        </View>
        <View style={styles.headerChip}>
          <Text style={styles.headerChipText}>
            {conversation.id.slice(0, 6)}...
          </Text>
        </View>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          inverted
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={styles.emptyMessagesText}>
                No messages yet. Send one to start the conversation!
              </Text>
            </View>
          }
        />
      )}

      {/* Slash Command Hints */}
      {!paymentPreview && newMessage.startsWith('/') && (() => {
        const typed = newMessage.toLowerCase();
        const matches = SLASH_COMMANDS.filter(c =>
          c.command.startsWith(typed.split(' ')[0]),
        );
        if (!matches.length) return null;
        return (
          <View style={styles.commandHints}>
            {matches.map(cmd => (
              <Pressable
                key={cmd.command}
                style={styles.commandHintRow}
                onPress={() => setNewMessage(cmd.template)}>
                <Text style={styles.commandHintIcon}>{cmd.icon}</Text>
                <View style={styles.commandHintText}>
                  <Text style={styles.commandHintSyntax}>{cmd.syntax}</Text>
                  <Text style={styles.commandHintDesc}>
                    {cmd.description} · e.g. <Text style={styles.commandHintExample}>{cmd.example}</Text>
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        );
      })()}

      {/* Payment Confirmation Card */}
      {paymentPreview && (
        <View style={styles.paymentConfirm}>
          <View style={styles.paymentConfirmHeader}>
            <Text style={styles.paymentConfirmIcon}>💸</Text>
            <Text style={styles.paymentConfirmTitle}>Confirm Payment</Text>
          </View>
          <Text style={styles.paymentConfirmAmount}>
            {paymentPreview.amount} {paymentPreview.token}
          </Text>
          <Text style={styles.paymentConfirmTo}>
            To: {paymentPreview.recipientAddress.slice(0, 6)}...{paymentPreview.recipientAddress.slice(-4)}
          </Text>
          <View style={styles.paymentConfirmButtons}>
            <Pressable
              style={styles.paymentCancelBtn}
              onPress={() => setPaymentPreview(null)}
              disabled={isSendingPayment}>
              <Text style={styles.paymentCancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[
                styles.paymentSendBtn,
                isSendingPayment && styles.paymentSendBtnDisabled,
              ]}
              onPress={executePayment}
              disabled={isSendingPayment}>
              {isSendingPayment ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.paymentSendText}>Send</Text>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.messageInput}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder={isGroup ? 'Type a message...' : 'Type a message or /pay 0.01 ETH'}
          placeholderTextColor={colors.mutedForeground}
          editable={!isSending}
          multiline
          maxLength={4000}
        />
        <Pressable
          style={[
            styles.sendButton,
            (!newMessage.trim() || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!newMessage.trim() || isSending}>
          <Text style={styles.sendButtonText}>
            {isSending ? '...' : 'Send'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  backText: {
    fontSize: fontSizes.xl,
    color: colors.foreground,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(255, 0, 102, 0.1)',
    borderWidth: 1,
    borderColor: colors.accentBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.accent,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
  },
  headerSubtitle: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
  },
  headerChip: {
    backgroundColor: colors.muted,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  headerChipText: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
    fontFamily: 'monospace',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: fontSizes.md,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyMessagesText: {
    color: colors.mutedForeground,
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
  messageRow: {
    marginBottom: spacing.md,
    maxWidth: '85%',
  },
  messageRowMine: {
    alignSelf: 'flex-end',
  },
  messageRowTheirs: {
    alignSelf: 'flex-start',
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderWidth: 1,
    ...shadows.bubble,
  },
  bubbleMine: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accentBorder,
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: colors.card,
    borderColor: colors.borderSubtle,
    borderBottomLeftRadius: 4,
  },
  paymentBubble: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.4)',
  },
  paymentText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
  },
  paymentHash: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
    fontFamily: 'monospace',
    marginTop: spacing.xs,
  },
  messageText: {
    fontSize: fontSizes.base,
    lineHeight: 22,
  },
  messageTextMine: {
    color: colors.foreground,
  },
  messageTextTheirs: {
    color: colors.foreground,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  messageTime: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  messageTimeMine: {
    color: colors.mutedForeground,
  },
  messageTimeTheirs: {
    color: colors.mutedForeground,
  },
  readReceipt: {
    fontSize: 11,
    color: colors.accent,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  messageInput: {
    flex: 1,
    backgroundColor: colors.input,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSizes.base,
    color: colors.foreground,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
    borderColor: colors.borderSubtle,
  },
  sendButtonText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.accent,
  },
  // Slash command hints
  commandHints: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingVertical: spacing.xs,
  },
  commandHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  commandHintIcon: {
    fontSize: fontSizes.xl,
  },
  commandHintText: {
    flex: 1,
  },
  commandHintSyntax: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: colors.accent,
    fontFamily: 'monospace',
  },
  commandHintDesc: {
    fontSize: fontSizes.xs,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  commandHintExample: {
    color: colors.foreground,
    fontFamily: 'monospace',
  },
  // Payment confirmation card
  paymentConfirm: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: 'rgba(34, 197, 94, 0.4)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  paymentConfirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  paymentConfirmIcon: {
    fontSize: fontSizes.xl,
  },
  paymentConfirmTitle: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: colors.foreground,
  },
  paymentConfirmAmount: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
    color: 'rgb(34, 197, 94)',
  },
  paymentConfirmTo: {
    fontSize: fontSizes.sm,
    color: colors.mutedForeground,
    fontFamily: 'monospace',
  },
  paymentConfirmButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  paymentCancelBtn: {
    flex: 1,
    backgroundColor: colors.muted,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  paymentCancelText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.medium,
    color: colors.mutedForeground,
  },
  paymentSendBtn: {
    flex: 2,
    backgroundColor: 'rgb(34, 197, 94)',
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  paymentSendBtnDisabled: {
    opacity: 0.6,
  },
  paymentSendText: {
    fontSize: fontSizes.md,
    fontWeight: fontWeights.semibold,
    color: '#fff',
  },
});

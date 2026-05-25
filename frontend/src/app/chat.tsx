import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { chatApi } from '@/services/api';
import { Colors, Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

export default function ChatScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial',
      text: 'Hi 👋 I’m your AI therapist. How are you feeling today?',
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const intervalsRef = useRef<any[]>([]);

  useEffect(() => {
    return () => {
      intervalsRef.current.forEach(clearInterval);
    };
  }, []);

  // Save session and navigate back
  const handleClose = async () => {
    try {
      await chatApi.endChat();
    } catch (e) {
      // Silently fail — endChat saving stress is best-effort
    }
    router.back();
  };

  // Auto-scroll when message count changes
  useEffect(() => {
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, typing]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageText = input;
    setInput('');
    setTyping(true);

    try {
      const response = await chatApi.sendMessage(messageText);
      const fullReply = response.reply || '';

      // Initialize empty AI message
      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage: Message = {
        id: aiMessageId,
        text: '',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setTyping(false);

      let currentText = '';
      let charIndex = 0;

      const intervalId = setInterval(() => {
        if (charIndex < fullReply.length) {
          currentText += fullReply[charIndex];
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, text: currentText } : msg
            )
          );
          if (charIndex % 8 === 0 && flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
          charIndex++;
        } else {
          clearInterval(intervalId);
          intervalsRef.current = intervalsRef.current.filter((id) => id !== intervalId);
          if (flatListRef.current) {
            flatListRef.current.scrollToEnd({ animated: true });
          }
        }
      }, 15);

      intervalsRef.current.push(intervalId);
    } catch (error: any) {
      console.error('Chat error:', error);
      const isTimeout = error?.response?.status === 504 || error?.response?.data?.error?.includes('taking too long');
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: isTimeout
          ? "I'm waking up — it might take a moment on first message. Please try sending again! 🌱"
          : "I'm having trouble connecting right now. Please check your network and try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setTyping(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    return (
      <View
        style={[
          styles.messageRow,
          item.isUser ? styles.userRow : styles.aiRow,
        ]}
      >
        {!item.isUser && (
          <View style={[styles.avatar, { backgroundColor: '#8B5CF6' }]}>
            <Text style={styles.avatarText}>AI</Text>
          </View>
        )}
        <View
          style={[
            styles.bubble,
            item.isUser
              ? [styles.userBubble, { backgroundColor: '#208AEF' }]
              : [styles.aiBubble, { backgroundColor: colors.backgroundElement }],
          ]}
        >
          <Text
            style={[
              styles.messageText,
              { color: item.isUser ? '#ffffff' : colors.text },
            ]}
          >
            {item.text}
          </Text>
          <Text
            style={[
              styles.timeText,
              { color: item.isUser ? 'rgba(255,255,255,0.7)' : colors.textSecondary },
            ]}
          >
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.backgroundSelected }]}>
            <TouchableOpacity onPress={handleClose} style={styles.backButton}>
              <Text style={[styles.backText, { color: colors.textSecondary }]}>✕ Close</Text>
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <ThemedText type="smallBold" style={{ fontSize: 16 }}>AI Therapist</ThemedText>
              <View style={styles.statusRow}>
                <View style={styles.statusDot} />
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>Always here for you</Text>
              </View>
            </View>
            <View style={{ width: 60 }} />
          </View>

          {/* Message List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
            ListFooterComponent={
              typing ? (
                <View style={[styles.messageRow, styles.aiRow]}>
                  <View style={[styles.avatar, { backgroundColor: '#8B5CF6' }]}>
                    <Text style={styles.avatarText}>AI</Text>
                  </View>
                  <View style={[styles.typingBubble, { backgroundColor: colors.backgroundElement }]}>
                    <ActivityIndicator size="small" color="#208AEF" />
                  </View>
                </View>
              ) : null
            }
          />

          {/* Input area */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.background,
                borderTopColor: colors.backgroundSelected,
              },
            ]}
          >
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.backgroundElement,
                  color: colors.text,
                  borderColor: colors.backgroundSelected,
                },
              ]}
              placeholder="Type your thoughts..."
              placeholderTextColor={colors.textSecondary}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              onPress={handleSend}
              disabled={!input.trim()}
              style={[
                styles.sendButton,
                {
                  backgroundColor: input.trim() ? '#208AEF' : colors.backgroundSelected,
                },
              ]}
            >
              <Text style={styles.sendButtonText}>➤</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingVertical: Spacing.one,
  },
  backText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerInfo: {
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  statusText: {
    fontSize: 10,
  },
  listContent: {
    padding: Spacing.three,
    paddingBottom: Spacing.four,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: Spacing.three,
    alignItems: 'flex-end',
    maxWidth: '85%',
  },
  userRow: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  aiRow: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.two,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bubble: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userBubble: {
    borderBottomRightRadius: 2,
  },
  aiBubble: {
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  typingBubble: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    borderBottomLeftRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderTopWidth: 1,
    gap: Spacing.two,
  },
  textInput: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
});

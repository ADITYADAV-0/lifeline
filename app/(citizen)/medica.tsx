import type { MedicalProfile } from '@/services/appData';
import { getCurrentUser } from '@/services/appData';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';


import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  triageQuestions?: string[];
}

export default function MedicaScreen() {
  const [userName, setUserName] = useState('there');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: `Hello ${'there'}! I'm Medica AI, your emergency medical assistant. I can help with symptom checking, first aid guidance, or triage while you wait for responders.`,
    },
    {
      id: '2',
      sender: 'user',
      text: "I'm feeling dizzy and have a slight headache.",
    },
    {
      id: '3',
      sender: 'bot',
      text: "I understand you are experiencing dizziness and a headache. Let's gather a bit more information to provide the best guidance.",
      triageQuestions: [
        "Did this start suddenly?",
        "Are you experiencing any numbness or weakness?",
      ],
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [profile, setProfile] = useState<MedicalProfile | null>(null);
  

  useEffect(() => {
    const loadName = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUserName(currentUser.name.trim() || 'User');
        setProfile(currentUser.profile);
      }
    };

    loadName();
  }, []);
  const API_URL = process.env.EXPO_PUBLIC_API_URL;


  const askMedicaAI = async (message: string) => {
  try {
    const response = await fetch(`${API_URL}/medica`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        userName,
        medicalProfile: profile,
      }),
    });

    if (!response.ok) {
      throw new Error('AI request failed');
    }

    const data = await response.json();

    return data.reply;
  } catch (error) {
    console.error('Medica AI error:', error);

    return "I'm unable to connect to Medica AI right now. If you're having severe symptoms or feel unsafe, please contact your local emergency services.";
  }
};

  const handleSend = async (text: string) => {
  if (!text.trim() || isTyping) return;

  const userMessage: Message = {
    id: Math.random().toString(),
    sender: 'user',
    text: text.trim(),
  };

  setMessages((prev) => [...prev, userMessage]);
  setInput('');
  setIsTyping(true);

  const reply = await askMedicaAI(text.trim());

  setIsTyping(false);

  setMessages((prev) => [
    ...prev,
    {
      id: Math.random().toString(),
      sender: 'bot',
      text: reply,
    },
  ]);

  setTimeout(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, 100);
};

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Sticky Header */}
      <View style={styles.header}>
        <View style={styles.headerBranding}>
          <Ionicons name="alert-circle" color="#ba1a1a" size={28} />
          <Text style={styles.headerText}>Medica AI</Text>
        </View>
        <View style={styles.avatarContainer}>
          <Image
            style={styles.avatar}
            source={{
              uri: profile?.avatarUri || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPdSrcWn-Rr4SJpNPqFLiKwTPB4qxzdCZh8UA3-fVZp9vV5fjU9K1NVRPB0VYR5q35eRE_6p-b6YbEVOR-ggooCV0aroqP8_k7qlhaQXwcKZt7b-L8x3zY_DOrkUfw4kMoOT0R90GbfSGQNO8EHqvBCVM14D2C2FJhGMxhGclFaJ8trKoFMI6WfNt7DOan4MjQop94Tyd1nwCEJeXdNf03KUd2GOzJ3XLhembq4NnyS26wZZT4_Eg',
            }}
          />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Messages list */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Today badge */}
          <View style={styles.todayDivider}>
            <View style={styles.todayBadge}>
              <Text style={styles.todayText}>Today, 10:42 AM</Text>
            </View>
          </View>

          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';
            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  isBot ? styles.messageRowBot : styles.messageRowUser,
                ]}
              >
                {isBot ? (
                  <View style={styles.botIconWrapper}>
                    <Ionicons name="person-circle-outline" color="#0058bc" size={16} />
                  </View>
                ) : (
                  <View style={styles.userIconWrapper}>
                    <Image
                      style={styles.userAvatar}
                      source={{
                        uri: profile?.avatarUri || 'https://i.pinimg.com/236x/76/8d/76/768d764a0a8891c0295842d8c1b9030d.jpg',
                      }}
                    />
                  </View>
                )}

                <View
                  style={[
                    styles.messageBubble,
                    isBot ? styles.messageBubbleBot : styles.messageBubbleUser,
                  ]}
                >
                  <Text style={[styles.messageText, isBot ? styles.messageTextBot : styles.messageTextUser]}>
                    {msg.text}
                  </Text>

                  {msg.triageQuestions && (
                    <View style={styles.triageContainer}>
                      <Text style={styles.triageTitle}>Triage Questions</Text>
                      {msg.triageQuestions.map((q, idx) => (
                        <Text key={idx} style={styles.triageQuestion}>
                          • {q}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })}

          {/* Bot Typing indicator */}
          {isTyping && (
            <View style={[styles.messageRow, styles.messageRowBot]}>
              <View style={styles.botIconWrapper}>
                <Ionicons name="person-circle-outline" color="#0058bc" size={16} />
              </View>
              <View style={[styles.messageBubble, styles.messageBubbleBot, styles.typingBubble]}>
                <Text style={styles.typingText}>Medica is typing...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input area */}
        <View style={styles.inputArea}>
          {/* Suggestion Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionScroll}
            contentContainerStyle={styles.suggestionContent}
          >
            <TouchableOpacity
              onPress={() => handleSend("Check Symptoms")}
              style={styles.suggestionChip}
            >
              <Ionicons name="medical-outline" color="#44474d" size={14} />
              <Text style={styles.suggestionChipText}>Check Symptoms</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSend("First Aid Steps")}
              style={styles.suggestionChip}
            >
              <Ionicons name="medkit" color="#44474d" size={14} />
              <Text style={styles.suggestionChipText}>First Aid Steps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Linking.openURL('tel:911')}
              style={[styles.suggestionChip, styles.suggestionChipRed]}
            >
              <Ionicons name="call" color="#ba1a1a" size={14} />
              <Text style={[styles.suggestionChipText, styles.suggestionChipTextRed]}>
                Emergency Call
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Text Input Row */}
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.inputActionBtn}>
              <Ionicons name="add" color="#75777e" size={20} />
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => handleSend(input)}
              placeholder="Describe your symptoms..."
              placeholderTextColor="#75777e"
            />

            <TouchableOpacity style={styles.inputActionBtn}>
              <Ionicons name="mic" color="#75777e" size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSend(input)}
              style={styles.sendButton}
              activeOpacity={0.8}
            >
              <Ionicons name="send" color="#d6e3e6" size={14} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  header: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5eeff',
    backgroundColor: '#ffffff',
  },
  headerBranding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#031632',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderColor: '#c5c6ce',
    borderWidth: 1,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  todayDivider: {
    alignItems: 'center',
    marginVertical: 12,
  },
  todayBadge: {
    backgroundColor: '#e5eeff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  todayText: {
    fontSize: 11,
    color: '#75777e',
    fontWeight: '600',
  },
  messageRow: {
    flexDirection: 'row',
    gap: 8,
    maxWidth: '85%',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  messageRowBot: {
    alignSelf: 'flex-start',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  botIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5eeff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  userIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    marginTop: 2,
  },
  userAvatar: {
    width: '100%',
    height: '100%',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    shadowColor: '#1a2b48',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  messageBubbleBot: {
    backgroundColor: '#ffffff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    borderTopLeftRadius: 0,
  },
  messageBubbleUser: {
    backgroundColor: '#0058bc',
    borderTopRightRadius: 0,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextBot: {
    color: '#0b1c30',
  },
  messageTextUser: {
    color: '#ffffff',
  },
  triageContainer: {
    backgroundColor: '#f8f9ff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  triageTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#031632',
    marginBottom: 6,
  },
  triageQuestion: {
    fontSize: 12,
    color: '#44474d',
    lineHeight: 18,
    marginBottom: 2,
  },
  typingBubble: {
    justifyContent: 'center',
    height: 40,
  },
  typingText: {
    fontSize: 12,
    color: '#75777e',
    fontStyle: 'italic',
  },
  inputArea: {
    backgroundColor: '#ffffff',
    borderTopColor: '#c5c6ce',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 8 : 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  suggestionScroll: {
    maxHeight: 34,
  },
  suggestionContent: {
    gap: 8,
    paddingRight: 16,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    borderColor: '#c5c6ce',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 30,
    gap: 6,
  },
  suggestionChipRed: {
    backgroundColor: '#ffdad6',
    borderColor: '#ffb4ab',
  },
  suggestionChipText: {
    fontSize: 12,
    color: '#44474d',
    fontWeight: '600',
  },
  suggestionChipTextRed: {
    color: '#ba1a1a',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
    borderColor: '#75777e',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 8,
    height: 48,
  },
  textInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#0b1c30',
  },
  inputActionBtn: {
    padding: 6,
  },
  sendButton: {
    backgroundColor: '#0058bc',
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});

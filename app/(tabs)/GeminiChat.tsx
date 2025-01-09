import React, { useState, useEffect, useRef } from "react";
import * as GoogleGenerativeAI from "@google/generative-ai";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ViewStyle,
  TextStyle,
  StyleSheet,
  SafeAreaView,
  Platform,
  RefreshControl,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import FlashMessage from "react-native-flash-message";

interface Message {
  text: string;
  user: boolean;
  typing?: boolean;
}

interface Styles {
  safeArea: ViewStyle;
  container: ViewStyle;
  messageList: ViewStyle;
  messageContainer: ViewStyle;
  userMessage: ViewStyle;
  botMessage: ViewStyle;
  messageText: TextStyle;
  inputContainer: ViewStyle;
  input: ViewStyle & TextStyle;
  sendButton: ViewStyle;
  sendButtonDisabled: ViewStyle;
}

const GeminiChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList | null>(null);

  const API_KEY = "AIzaSyAM3FpMgmvk8IsETN7vpY-mYrP0VNIyIVI";

  const initializeChat = async () => {
    try {
      const genAI = new GoogleGenerativeAI.GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      // Modified prompt to request shorter, more focused responses
      const prompt = "Give a brief, friendly greeting in 1-2 sentences. Keep it concise.";
      const result = await model.generateContent(prompt);
      const response = result.response;
      
      setMessages([
        {
          text: response.text(),
          user: false,
        },
      ]);
    } catch (error) {
      console.error("Error starting chat:", error);
      setMessages([
        {
          text: "Sorry, I couldn't connect. Please try again.",
          user: false,
        },
      ]);
    }
  };

  useEffect(() => {
    initializeChat();
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setMessages([]); // Clear existing messages
    initializeChat().finally(() => setRefreshing(false));
  }, []);

  const sendMessage = async () => {
    if (!userInput.trim()) return;
    
    setLoading(true);
    const userMessage: Message = { text: userInput, user: true };
    setMessages((prevMessages) => [
      ...prevMessages,
      userMessage,
      { text: "Thinking...", user: false, typing: true },
    ]);

    try {
      const genAI = new GoogleGenerativeAI.GoogleGenerativeAI(API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });

      const conversationHistory = messages
        .map((msg) => (msg.user ? `User: ${msg.text}` : `Assistant: ${msg.text}`))
        .join("\n");

      // Modified prompt to encourage shorter responses
      const prompt = `${conversationHistory}\nUser: ${userMessage.text}\nAssistant: Please provide a clear and concise response in 1-3 sentences:`;

      const result = await model.generateContent(prompt);
      const response = result.response;

      setMessages((prevMessages) => [
        ...prevMessages.slice(0, -1),
        { text: response.text(), user: false }
      ]);
    } catch (error) {
      console.error("Error generating content:", error);
      setMessages((prevMessages) => [
        ...prevMessages.slice(0, -1),
        { text: "Sorry, something went wrong. Please try again.", user: false }
      ]);
    } finally {
      setLoading(false);
      setUserInput("");
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.user ? styles.userMessage : styles.botMessage]}>
      <Text style={styles.messageText}>
        {item.text}
      </Text>
    </View>
  );

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(_, index) => index.toString()}
          style={styles.messageList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
              titleColor="#fff"
            />
          }
        />
        <View style={styles.inputContainer}>
          <TextInput
            placeholder="Type a message"
            onChangeText={setUserInput}
            value={userInput}
            onSubmitEditing={sendMessage}
            style={styles.input}
            placeholderTextColor="#ccc"
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, loading && styles.sendButtonDisabled]} 
            onPress={sendMessage}
            disabled={loading}
          >
            <FontAwesome name="send" size={20} color="#3498db" />
          </TouchableOpacity>
        </View>
        <FlashMessage position="top" />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create<Styles>({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgb(38, 38, 38)',
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  container: {
    flex: 1,
  },
  messageList: {
    flex: 1,
    padding: 10,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
    maxWidth: "80%",
  },
  userMessage: {
    backgroundColor: "#3498db",
    alignSelf: "flex-end",
  },
  botMessage: {
    backgroundColor: "#444",
    alignSelf: "flex-start",
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    padding: 10,
    backgroundColor: "#666",
    borderRadius: 12,
    color: "#fff",
    fontSize: 14,
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#666",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#a0aec0",
  },
});

export default GeminiChat;
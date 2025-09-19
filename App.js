import React, { useState, useRef, useEffect } from "react";
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = "https://sal-backend.onrender.com/sal-chat";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem("@sal_chat_history");
        if (saved) setMessages(JSON.parse(saved));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem("@sal_chat_history", JSON.stringify(messages));
      } catch {}
    })();
  }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const userMsg = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setSending(true);
    try {
      const r = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: userMsg.content }] })
      });
      let text = "";
      let errorReply = "";
      try {
        const data = await r.json();
        if (data?.reply) text = String(data.reply);
        if (data?.error) errorReply = JSON.stringify(data.error);
      } catch {
        errorReply = "invalid_json";
      }
      if (!text) {
        if (errorReply.includes("insufficient_quota")) text = "SAL temporariamente indisponível (quota da API). Tente novamente mais tarde.";
        else text = "Não consegui responder agora. Verifique a conexão e tente novamente.";
      }
      const salMsg = { id: (Date.now()+1).toString(), role: "assistant", content: text };
      setMessages(prev => [...prev, salMsg]);
      setTimeout(() => { try { listRef.current?.scrollToEnd({ animated: true }); } catch {} }, 50);
    } catch {
      const salMsg = { id: (Date.now()+1).toString(), role: "assistant", content: "Falha de rede. Tente novamente." };
      setMessages(prev => [...prev, salMsg]);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
        <Text style={styles.text}>{item.content}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1, width: "100%" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Fale com o SAL..."
            placeholderTextColor="#9aa0a6"
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity onPress={send} disabled={sending} style={[styles.button, sending && { opacity: 0.6 }]}>
            {sending ? <ActivityIndicator /> : <Text style={styles.buttonText}>Enviar</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0c0e", alignItems: "center", justifyContent: "center" },
  bubble: { borderRadius: 14, padding: 12, marginBottom: 10, maxWidth: "88%" },
  user: { backgroundColor: "#ff3b30", alignSelf: "flex-end" },
  assistant: { backgroundColor: "#1f1f24", alignSelf: "flex-start" },
  text: { color: "#ffffff", fontSize: 16, lineHeight: 22 },
  inputRow: { flexDirection: "row", paddingHorizontal: 12, paddingBottom: 16, gap: 8 },
  input: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: "#121217", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: "#fff" },
  button: { height: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#ff3b30", alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "600" }
});

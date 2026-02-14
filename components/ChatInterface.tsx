"use client"

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Send, Bot, User, ChevronDown, Award, Trash2, Paperclip, X, ImageIcon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { supabase } from "@/lib/supabase/client";
import { ChatAttachmentThumbnail } from "./ChatAttachmentThumbnail";
import { compressImage } from "@/lib/image-compress";

type Role = 'user' | 'assistant';

interface Message {
  id: string;
  content: string;
  role: Role;
  timestamp: Date;
  attachmentId?: string;
  attachmentName?: string;
  attachmentMime?: string;
}

type Mode = 'tutor' | 'checker' | 'explainer';
type ChatHistoryMessage = { role: Role; content: string };
type ChatResponse = { enabled?: boolean; reply?: string; error?: string };

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

// localStorage persistence constants
const CHAT_STORAGE_KEY_PREFIX = 'vectorius_chat_messages';
const CHAT_STORAGE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface StoredChat {
  messages: Array<{ id: string; content: string; role: Role; timestamp: string; attachmentId?: string; attachmentName?: string; attachmentMime?: string }>;
  timestamp: number;
  ownerId?: string; // Added to verify ownership on load
}

const getWelcomeMessage = (): Message => ({
  id: 'welcome',
  content: "Hello! I'm your AI tutor. What are you working on today?",
  role: 'assistant',
  timestamp: new Date(),
});

// Generate storage key with optional user ID for isolation
const getStorageKey = (userId?: string) =>
  userId ? `${CHAT_STORAGE_KEY_PREFIX}_${userId}` : CHAT_STORAGE_KEY_PREFIX;

// Load messages from localStorage
const loadStoredMessages = (userId?: string): Message[] => {
  if (typeof window === 'undefined') return [getWelcomeMessage()];
  if (!userId) return [getWelcomeMessage()]; // Don't load without verified userId

  const storageKey = getStorageKey(userId);
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return [getWelcomeMessage()];

    const parsed: StoredChat = JSON.parse(stored);

    // Verify ownership - if ownerId doesn't match, don't load these messages
    if (parsed.ownerId && parsed.ownerId !== userId) {
      localStorage.removeItem(storageKey);
      return [getWelcomeMessage()];
    }

    // Check if expired (24 hours)
    if (Date.now() - parsed.timestamp > CHAT_STORAGE_EXPIRY) {
      localStorage.removeItem(storageKey);
      return [getWelcomeMessage()];
    }

    // Restore timestamps as Date objects
    const messages = parsed.messages.map(m => ({
      ...m,
      timestamp: new Date(m.timestamp)
    }));

    return messages.length > 0 ? messages : [getWelcomeMessage()];
  } catch {
    return [getWelcomeMessage()];
  }
};

// Save messages to localStorage
const saveMessages = (messages: Message[], userId?: string) => {
  if (typeof window === 'undefined') return;
  if (!userId) return; // Don't save without verified userId

  const storageKey = getStorageKey(userId);
  try {
    const stored: StoredChat = {
      messages: messages.map(m => ({
        ...m,
        timestamp: m.timestamp.toISOString()
      })),
      timestamp: Date.now(),
      ownerId: userId // Store owner for verification
    };

    localStorage.setItem(storageKey, JSON.stringify(stored));
  } catch {
    // Ignore storage errors
  }
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([getWelcomeMessage()]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>('tutor');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{ file: File; previewUrl: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get verified user ID directly from Supabase auth (not from potentially stale localStorage)
  useEffect(() => {
    let isMounted = true;

    const getAuthUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (isMounted && user?.id) {
        setAuthUserId(user.id);
      }
    };

    getAuthUser();

    // Listen for auth state changes to handle login/logout
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        setAuthUserId(session?.user?.id ?? null);
        // Clear messages when user changes to prevent data leakage
        if (event === 'SIGNED_OUT' || !session?.user) {
          setMessages([getWelcomeMessage()]);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load messages when authUserId becomes available
  useEffect(() => {
    if (authUserId) {
      setMessages(loadStoredMessages(authUserId));
    }
  }, [authUserId]);

  // Persist messages to localStorage when they change (only if authUserId is available)
  useEffect(() => {
    if (authUserId) {
      saveMessages(messages, authUserId);
    }
  }, [messages, authUserId]);

  // Clear chat handler
  const handleClearChat = useCallback(() => {
    const storageKey = getStorageKey(authUserId ?? undefined);
    localStorage.removeItem(storageKey);
    setMessages([getWelcomeMessage()]);
  }, [authUserId]);

  // File attachment handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];
    if (!allowed.includes(file.type)) {
      setErrorMsg('Only JPG, PNG, and HEIC images are allowed');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('Image must be under 8MB');
      return;
    }

    setErrorMsg(null);
    const compressed = await compressImage(file);
    const previewUrl = URL.createObjectURL(compressed);
    setPendingAttachment({ file: compressed, previewUrl });
    e.target.value = '';
  };

  const clearPendingAttachment = useCallback(() => {
    if (pendingAttachment) {
      URL.revokeObjectURL(pendingAttachment.previewUrl);
      setPendingAttachment(null);
    }
  }, [pendingAttachment]);

  // Load chat enabled flag and persisted mode
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('chatMode') : null;
    if (stored === 'checker' || stored === 'explainer' || stored === 'tutor') {
      setMode(stored);
    }
    (async () => {
      try {
        const res = await fetch('/api/chat', { method: 'GET' });
        if (!res.ok) throw new Error('Failed to check chat availability');
        const data = (await res.json()) as ChatResponse;
        setEnabled(Boolean(data?.enabled));
      } catch (e: unknown) {
        setEnabled(false);
        setErrorMsg(getErrorMessage(e, 'Failed to check chat availability'));
      }
    })();
  }, []);

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && !pendingAttachment) || isTyping || isUploading) return;
    setErrorMsg(null);

    let attachmentId: string | undefined;
    let attachmentName: string | undefined;
    let attachmentMime: string | undefined;

    // Upload attachment if present
    if (pendingAttachment) {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', pendingAttachment.file);

      try {
        const uploadRes = await fetch('/api/chat/upload', {
          method: 'POST',
          body: formData,
        });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || 'Upload failed');
        }
        const uploadData = await uploadRes.json();
        attachmentId = uploadData.attachmentId;
        attachmentName = uploadData.fileName;
        attachmentMime = uploadData.mimeType;
      } catch (e: unknown) {
        setErrorMsg(getErrorMessage(e, 'Failed to upload image'));
        setIsUploading(false);
        return;
      } finally {
        clearPendingAttachment();
        setIsUploading(false);
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue || (attachmentName ? `[Attached: ${attachmentName}]` : ''),
      role: 'user',
      timestamp: new Date(),
      attachmentId,
      attachmentName,
      attachmentMime,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      // Prepare trimmed history: last ~9 exchanges (18 messages)
      const historySource = [...messages, userMessage];
      const trimmed: ChatHistoryMessage[] = historySource.slice(-18).map(m => ({ role: m.role, content: m.content }));

      // Find the most recent attachmentId in conversation (for image context persistence)
      const activeAttachmentId = userMessage.attachmentId
        ?? [...messages].reverse().find(m => m.attachmentId)?.attachmentId;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage.content, mode, history: trimmed, attachmentId: activeAttachmentId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Chat request failed');
      }

      const data = (await res.json()) as ChatResponse;
      const reply: string = data.reply || '';

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: reply,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (e: unknown) {
      setErrorMsg(getErrorMessage(e, 'Failed to get a response'));
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = [
    { label: "Math", prompts: [
      "Explain how to solve quadratic equations",
      "Help me understand fractions and decimals",
      "What are the rules for order of operations?",
      "How do I calculate percentages?",
    ]},
    { label: "Science", prompts: [
      "Explain photosynthesis",
      "How does the water cycle work?",
      "What are the laws of motion?",
    ]},
    { label: "Writing", prompts: [
      "Essay writing tips",
      "How do I structure a paragraph?",
      "Help me with thesis statements",
    ]},
    { label: "History", prompts: [
      "History of World War II",
      "Explain the American Revolution",
      "What caused the Industrial Revolution?",
    ]},
  ];

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Curiosity badge progress calculation
  const questionsAsked = messages.filter(m => m.role === 'user').length;
  const curiosityGoal = 10;
  const curiosityProgress = Math.min(questionsAsked, curiosityGoal) / curiosityGoal * 100;

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 flex flex-col border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-t-lg py-3">
          <CardTitle className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <span>AI Tutor</span>

            {/* Mode dropdown */}
            <Select
              value={mode}
              onValueChange={(value: Mode) => {
                setMode(value);
                if (typeof window !== 'undefined') localStorage.setItem('chatMode', value);
              }}
            >
              <SelectTrigger className="w-[130px] h-8 bg-white/20 border-white/30 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutor">Tutor Mode</SelectItem>
                <SelectItem value="checker">Checker Mode</SelectItem>
                <SelectItem value="explainer">Explainer Mode</SelectItem>
              </SelectContent>
            </Select>

            {/* Curiosity badge in header */}
            <div className="ml-auto flex items-center gap-2 bg-white/20 rounded-full px-3 py-1">
              <Award className="w-4 h-4 text-amber-300" />
              <div className="flex items-center gap-2">
                <span className="text-xs">Curiosity</span>
                <div className="w-16 h-2 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-300 transition-all duration-300"
                    style={{ width: `${curiosityProgress}%` }}
                  />
                </div>
                <span className="text-xs">{Math.min(questionsAsked, curiosityGoal)}/{curiosityGoal}</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Chat availability warning */}
          {enabled === false && (
            <div className="p-4 border-b">
              <Alert variant="destructive">
                <AlertTitle>Chat disabled</AlertTitle>
                <AlertDescription>
                  Missing Azure OpenAI configuration. Please set credentials in <code>.env.local</code>.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-0">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="w-8 h-8 bg-purple-100">
                    <AvatarFallback className="bg-purple-100 text-purple-600">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}
                >
                  {message.attachmentId && (
                    <ChatAttachmentThumbnail
                      attachmentId={message.attachmentId}
                      mimeType={message.attachmentMime}
                      className="mb-2"
                    />
                  )}
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none text-gray-900">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                  <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                
                {message.role === 'user' && (
                  <Avatar className="w-8 h-8 bg-blue-100">
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex gap-3 justify-start">
                <Avatar className="w-8 h-8 bg-purple-100">
                  <AvatarFallback className="bg-purple-100 text-purple-600">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-gray-100 text-gray-900 p-3 rounded-lg rounded-bl-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Error banner */}
          {errorMsg && (
            <div className="px-4">
              <Alert variant="destructive">
                <AlertTitle>Request failed</AlertTitle>
                <AlertDescription className="break-words">{errorMsg}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Pending attachment preview */}
          {pendingAttachment && (
            <div className="px-4 pt-2 border-t bg-white">
              <div className="inline-flex items-center gap-2 bg-gray-100 rounded-lg p-2 pr-3">
                {pendingAttachment.file.type.startsWith('image/') && !pendingAttachment.file.type.includes('heic') ? (
                  <img src={pendingAttachment.previewUrl} alt="Preview" className="w-12 h-12 object-cover rounded" />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <span className="text-sm text-gray-600 truncate max-w-[200px]">{pendingAttachment.file.name}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500" onClick={clearPendingAttachment}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Input Area with Quick Prompts Dropdown */}
          <div className={`p-4 ${pendingAttachment ? '' : 'border-t'} bg-white`}>
            <div className="flex gap-2">
              {/* Quick prompts dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0" disabled={isTyping || isUploading || enabled === false}>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  {quickPrompts.map((category) => (
                    <div key={category.label}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">{category.label}</div>
                      {category.prompts.map((prompt) => (
                        <DropdownMenuItem
                          key={prompt}
                          onClick={() => handleQuickPrompt(prompt)}
                          className="text-sm cursor-pointer"
                        >
                          {prompt}
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Attach image button */}
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                disabled={isTyping || isUploading || enabled === false}
                onClick={() => fileInputRef.current?.click()}
                title="Attach image"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif"
                className="hidden"
                onChange={handleFileSelect}
              />

              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your studies..."
                className="flex-1"
                disabled={isTyping || isUploading || enabled === false}
              />
              <Button
                onClick={handleSendMessage}
                disabled={(!inputValue.trim() && !pendingAttachment) || isTyping || isUploading || enabled === false}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleClearChat}
                variant="ghost"
                size="icon"
                className="shrink-0 text-gray-400 hover:text-red-500"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              AI tutor is here to help with homework, concepts, and study guidance
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

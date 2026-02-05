"use client"

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Send, Bot, User, ChevronDown, Trash2 } from "lucide-react";
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

type Role = 'user' | 'assistant';

interface Message {
  id: string;
  content: string;
  role: Role;
  timestamp: Date;
}

type Mode = 'tutor' | 'checker' | 'explainer';
type ChatHistoryMessage = { role: Role; content: string };
type ChatResponse = { enabled?: boolean; reply?: string; error?: string };

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error ? err.message : fallback;

// localStorage persistence constants (separate from student chat)
const PARENT_CHAT_STORAGE_KEY = 'vectorius_parent_chat_messages';
const CHAT_STORAGE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

interface StoredChat {
  messages: Array<{ id: string; content: string; role: Role; timestamp: string }>;
  timestamp: number;
}

const getWelcomeMessage = (): Message => ({
  id: 'welcome',
  content: "Hello! I'm here to help you support your child's learning. Ask me about homework help strategies, study tips, or how to explain concepts to your child.",
  role: 'assistant',
  timestamp: new Date(),
});

// Load messages from localStorage
const loadStoredMessages = (): Message[] => {
  if (typeof window === 'undefined') return [getWelcomeMessage()];

  try {
    const stored = localStorage.getItem(PARENT_CHAT_STORAGE_KEY);
    if (!stored) return [getWelcomeMessage()];

    const parsed: StoredChat = JSON.parse(stored);

    // Check if expired (24 hours)
    if (Date.now() - parsed.timestamp > CHAT_STORAGE_EXPIRY) {
      localStorage.removeItem(PARENT_CHAT_STORAGE_KEY);
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
const saveMessages = (messages: Message[]) => {
  if (typeof window === 'undefined') return;

  try {
    const stored: StoredChat = {
      messages: messages.map(m => ({
        ...m,
        timestamp: m.timestamp.toISOString()
      })),
      timestamp: Date.now()
    };

    localStorage.setItem(PARENT_CHAT_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Ignore storage errors
  }
};

export function ParentChatInterface() {
  const [messages, setMessages] = useState<Message[]>(() => loadStoredMessages());
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>('tutor');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Persist messages to localStorage when they change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // Clear chat handler
  const handleClearChat = useCallback(() => {
    localStorage.removeItem(PARENT_CHAT_STORAGE_KEY);
    setMessages([getWelcomeMessage()]);
  }, []);

  // Load chat enabled flag and persisted mode
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('parentChatMode') : null;
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
    if (!inputValue.trim() || isTyping) return;
    setErrorMsg(null);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      // Prepare trimmed history: last ~9 exchanges (18 messages)
      const historySource = [...messages, userMessage];
      const trimmed: ChatHistoryMessage[] = historySource.slice(-18).map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage.content, mode, history: trimmed }),
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

  // Parent-specific quick prompts
  const quickPrompts = [
    { label: "Homework Help", prompts: [
      "How can I help my child with homework without giving answers?",
      "Tips for explaining math concepts to my child",
      "How to make homework time less stressful",
    ]},
    { label: "Study Skills", prompts: [
      "How to encourage good study habits",
      "Best ways to help my child prepare for tests",
      "How much homework time is appropriate?",
    ]},
    { label: "Motivation", prompts: [
      "How to motivate my child to do schoolwork",
      "My child is struggling in school, what can I do?",
      "How to balance screen time and study time",
    ]},
    { label: "Subject Help", prompts: [
      "Explain fractions in a simple way",
      "How to help with reading comprehension",
      "Tips for science fair projects",
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

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-1 flex flex-col border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-t-lg py-3">
          <CardTitle className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <span>AI Assistant</span>

            {/* Mode dropdown */}
            <Select
              value={mode}
              onValueChange={(value: Mode) => {
                setMode(value);
                if (typeof window !== 'undefined') localStorage.setItem('parentChatMode', value);
              }}
            >
              <SelectTrigger className="w-[130px] h-8 bg-white/20 border-white/30 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tutor">Helper Mode</SelectItem>
                <SelectItem value="checker">Checker Mode</SelectItem>
                <SelectItem value="explainer">Explainer Mode</SelectItem>
              </SelectContent>
            </Select>
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Chat availability warning */}
          {enabled === false && (
            <div className="p-4 border-b">
              <Alert variant="destructive">
                <AlertTitle>Chat disabled</AlertTitle>
                <AlertDescription>
                  AI chat is currently unavailable. Please try again later.
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
                  <Avatar className="w-8 h-8 bg-green-100">
                    <AvatarFallback className="bg-green-100 text-green-600">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-teal-500 text-white rounded-br-sm'
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none text-gray-900">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                  <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-teal-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {message.role === 'user' && (
                  <Avatar className="w-8 h-8 bg-teal-100">
                    <AvatarFallback className="bg-teal-100 text-teal-600">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 justify-start">
                <Avatar className="w-8 h-8 bg-green-100">
                  <AvatarFallback className="bg-green-100 text-green-600">
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

          {/* Input Area with Quick Prompts Dropdown */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              {/* Quick prompts dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0" disabled={isTyping || enabled === false}>
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

              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me how to help your child..."
                className="flex-1"
                disabled={isTyping || enabled === false}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping || enabled === false}
                className="bg-teal-600 hover:bg-teal-700"
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
              AI assistant to help you support your child&apos;s education
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

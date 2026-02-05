"use client"

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Send, Bot, User, ChevronDown, Award } from "lucide-react";
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

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    content: "Hello! I'm your AI tutor. What are you working on today?",
    role: 'assistant',
    timestamp: new Date(),
  }]);
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
                placeholder="Ask me anything about your studies..."
                className="flex-1"
                disabled={isTyping || enabled === false}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping || enabled === false}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Send className="w-4 h-4" />
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

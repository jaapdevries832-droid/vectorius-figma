"use client"

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Send, Bot, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Progress } from "./ui/progress";

type Role = 'user' | 'assistant';

interface Message {
  id: string;
  content: string;
  role: Role;
  timestamp: Date;
}

type Mode = 'tutor' | 'checker' | 'explainer';

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
        const data = await res.json();
        setEnabled(Boolean(data?.enabled));
      } catch (e: any) {
        setEnabled(false);
        setErrorMsg(e?.message || 'Failed to check chat availability');
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
      const trimmed = historySource.slice(-18).map(m => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage.content, mode, history: trimmed }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Chat request failed');
      }

      const data = await res.json();
      const reply: string = data?.reply || '';

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: reply,
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to get a response');
    } finally {
      setIsTyping(false);
    }
  };

  const quickPrompts = [
    "Help me with algebra",
    "Explain photosynthesis", 
    "Essay writing tips",
    "History of World War II"
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
        <CardHeader className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            AI Tutor
            <Sparkles className="w-4 h-4 ml-auto" />
          </CardTitle>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Gamification banner */}
          <div className="px-4 pt-4">
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm font-medium text-amber-800">Earn points for asking questions!</p>
                {(() => {
                  const asked = messages.filter(m => m.role === 'user').length;
                  const goal = 10;
                  const progress = Math.min(asked, goal) / goal * 100;
                  return (
                    <div className="min-w-[220px]">
                      <div className="flex justify-between text-xs text-amber-800 mb-1">
                        <span>Curiosity badge</span>
                        <span>{Math.min(asked, goal)} / {goal}</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Chat availability + Mode selector */}
          <div className="p-4 border-b bg-white flex items-center gap-3 flex-wrap">
            <div className="text-sm text-gray-600">Mode:</div>
            <div className="flex gap-2">
              {([
                { key: 'tutor', label: 'Tutor' },
                { key: 'checker', label: 'Checker' },
                { key: 'explainer', label: 'Explainer' },
              ] as { key: Mode; label: string }[]).map(m => (
                <Button
                  key={m.key}
                  variant={mode === m.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setMode(m.key); if (typeof window !== 'undefined') localStorage.setItem('chatMode', m.key); }}
                  className={mode === m.key ? 'bg-purple-600 hover:bg-purple-700' : ''}
                >
                  {m.label}
                </Button>
              ))}
            </div>
            {enabled === false && (
              <Alert variant="destructive" className="ml-auto">
                <AlertTitle>Chat disabled</AlertTitle>
                <AlertDescription>
                  Missing Azure OpenAI configuration. Please set credentials in <code>.env.local</code>.
                </AlertDescription>
              </Alert>
            )}
          </div>

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

          {/* Quick Prompts */}
          {messages.length === 1 && (
            <div className="p-4 border-t bg-gray-50">
              <p className="text-sm text-gray-600 mb-3">Try asking about:</p>
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickPrompt(prompt)}
                    className="text-xs"
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
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

"use client"

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Send, Bot, User, Sparkles, X, Minimize2 } from "lucide-react";
import { cn } from "./ui/utils";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface FloatingChatDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function FloatingChatDrawer({ isOpen, onToggle, onClose }: FloatingChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: "Hi there! 👋 I'm your AI tutor. I'm here to help you with any questions about your studies. What would you like to learn about today?",
      sender: 'ai',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: generateAIResponse(inputValue),
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1200);
  };

  const generateAIResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('math') || input.includes('equation') || input.includes('calculate')) {
      return "I'd love to help you with math! 📊 Could you share the specific problem you're working on? I can assist with algebra, geometry, calculus, and more. Just type out the equation or describe what you're trying to solve.";
    } else if (input.includes('chemistry') || input.includes('chemical') || input.includes('molecule')) {
      return "Chemistry is fascinating! ⚗️ Whether you're working on balancing equations, understanding molecular structures, or exploring chemical reactions, I'm here to help. What specific chemistry topic would you like to explore?";
    } else if (input.includes('essay') || input.includes('write') || input.includes('english')) {
      return "I can definitely help you with writing! ✍️ Whether you need help brainstorming ideas, structuring your essay, improving your grammar, or citing sources, I'm here to assist. What type of writing assignment are you working on?";
    } else {
      return "That's a great question! 🤔 I'm here to help you understand any academic topic. Could you provide a bit more detail about what you're working on? The more specific you can be, the better I can assist you with your studies.";
    }
  };

  const quickPrompts = [
    "Help me with algebra 📐",
    "Explain photosynthesis 🌱", 
    "Essay writing tips ✍️",
    "Chemistry formulas ⚗️"
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

  if (!isOpen) {
    return (
      <Button 
        className="fab flex items-center justify-center"
        onClick={onToggle}
      >
        <Sparkles className="w-6 h-6 text-white" />
      </Button>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
        onClick={onClose}
      />
      
      {/* Chat Drawer */}
      <div className={cn(
        "fixed z-50 transition-all duration-300 ease-out animate-slide-up",
        isMinimized 
          ? "bottom-6 right-6 w-80" 
          : "bottom-6 right-6 w-96 h-[600px] md:h-[500px]",
        "md:bottom-6 md:right-6",
        // Mobile: full screen
        "max-md:bottom-0 max-md:right-0 max-md:left-0 max-md:top-0 max-md:w-full max-md:h-full"
      )}>
        <Card className={cn(
          "glass border-0 shadow-2xl rounded-2xl flex flex-col h-full overflow-hidden",
          isMinimized && "h-auto"
        )}>
          {/* Header */}
          <CardHeader className="bg-gradient-primary text-white rounded-t-2xl flex-shrink-0 p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-grid-2 text-white">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-lg">AI Tutor</span>
                  <div className="text-xs text-white/80">Always here to help</div>
                </div>
              </CardTitle>
              
              <div className="flex items-center space-grid-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-2 text-white hover:bg-white/20 rounded-xl hidden md:flex"
                  onClick={() => setIsMinimized(!isMinimized)}
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-2 text-white hover:bg-white/20 rounded-xl"
                  onClick={onClose}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          {!isMinimized && (
            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
              {/* Messages Area */}
              <div className="flex-1 p-4 overflow-y-auto space-grid-3 min-h-0">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex space-grid-3 ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.sender === 'ai' && (
                      <Avatar className="w-8 h-8 bg-gradient-primary">
                        <AvatarFallback className="bg-gradient-primary text-white">
                          <Bot className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div
                      className={cn(
                        "max-w-[80%] p-4 rounded-2xl shadow-sm",
                        message.sender === 'user'
                          ? 'bg-gradient-primary text-white rounded-br-md'
                          : 'bg-white/80 text-gray-900 rounded-bl-md border border-gray-200/50'
                      )}
                    >
                      <p className="text-sm leading-relaxed">{message.content}</p>
                      <p className={cn(
                        "text-xs mt-2",
                        message.sender === 'user' ? 'text-white/70' : 'text-gray-500'
                      )}>
                        {message.timestamp.toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    
                    {message.sender === 'user' && (
                      <Avatar className="w-8 h-8 bg-blue-100">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex space-grid-3 justify-start">
                    <Avatar className="w-8 h-8 bg-gradient-primary">
                      <AvatarFallback className="bg-gradient-primary text-white">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-white/80 text-gray-900 p-4 rounded-2xl rounded-bl-md border border-gray-200/50 shadow-sm">
                      <div className="flex space-grid">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts */}
              {messages.length === 1 && (
                <div className="p-4 border-t border-gray-200/50 bg-gray-50/80">
                  <p className="text-sm text-gray-600 mb-3 font-medium">Try asking about:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickPrompts.map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickPrompt(prompt)}
                        className="text-xs rounded-xl border-gray-200 hover:bg-white hover:border-blue-300 transition-colors"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200/50 bg-white/80">
                <div className="flex space-grid-2">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about your studies..."
                    className="flex-1 rounded-xl border-gray-200 bg-white/80 focus:border-blue-300"
                    disabled={isTyping}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isTyping}
                    className="bg-gradient-primary hover:opacity-90 px-4 rounded-xl shadow-md btn-glow"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  AI tutor is here to help with homework and study guidance
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </>
  );
}
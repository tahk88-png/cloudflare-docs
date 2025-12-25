'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  agentRole?: string;
  createdAt: string;
}

interface ChatWidgetProps {
  userId?: string;
  bookingId?: string;
  context?: Record<string, unknown>;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
}

export default function ChatWidget({
  userId,
  bookingId,
  context,
  position = 'bottom-right',
  primaryColor = '#2563eb',
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string>('SUPPORT');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const positionClasses = {
    'bottom-right': 'right-4',
    'bottom-left': 'left-4',
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load existing conversation
  useEffect(() => {
    if (isOpen && conversationId) {
      loadMessages();
    }
  }, [isOpen, conversationId]);

  async function loadMessages() {
    if (!conversationId) return;
    
    try {
      const response = await fetch(`/api/chat?conversationId=${conversationId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        if (data.conversation?.currentAgent) {
          setCurrentAgent(data.conversation.currentAgent);
        }
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message immediately for better UX
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'USER',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationId,
          userId,
          bookingId,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Update conversation ID if new
      if (!conversationId && data.conversationId) {
        setConversationId(data.conversationId);
      }

      // Update agent
      if (data.agentRole) {
        setCurrentAgent(data.agentRole);
      }

      // Add assistant response
      const assistantMessage: Message = {
        id: `response-${Date.now()}`,
        role: 'ASSISTANT',
        content: data.response,
        agentRole: data.agentRole,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'SYSTEM',
          content: 'Sorry, something went wrong. Please try again.',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const agentNames: Record<string, string> = {
    SUPPORT: 'Support Agent',
    OPS: 'Operations',
    SALES: 'Sales',
  };

  return (
    <div className={`fixed bottom-4 ${positionClasses[position]} z-50`}>
      {/* Chat Window */}
      {isOpen && (
        <div
          className="mb-4 bg-white rounded-2xl shadow-2xl border overflow-hidden"
          style={{ width: '380px', height: '520px' }}
        >
          {/* Header */}
          <div
            className="px-4 py-3 text-white flex items-center justify-between"
            style={{ backgroundColor: primaryColor }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">
                🤖
              </div>
              <div>
                <div className="font-semibold">Rentbox AI</div>
                <div className="text-xs opacity-90">
                  {agentNames[currentAgent] || 'Support'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="h-[380px] overflow-y-auto p-4 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <div className="text-4xl mb-3">👋</div>
                <p className="font-medium">Hi there!</p>
                <p className="text-sm mt-1">How can I help you today?</p>
                
                {/* Quick actions */}
                <div className="mt-6 space-y-2">
                  <QuickAction
                    text="Check my booking status"
                    onClick={() => {
                      setInput('I want to check my booking status');
                    }}
                  />
                  <QuickAction
                    text="Help with locker access"
                    onClick={() => {
                      setInput('I need help accessing my locker');
                    }}
                  />
                  <QuickAction
                    text="Return rental item"
                    onClick={() => {
                      setInput('How do I return my rental?');
                    }}
                  />
                </div>
              </div>
            )}

            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                primaryColor={primaryColor}
              />
            ))}

            {loading && (
              <div className="flex gap-2 items-center text-gray-500 mb-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm">AI is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-3 bg-white border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
                style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-full flex items-center justify-center text-white transition disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white transition hover:scale-110"
        style={{ backgroundColor: primaryColor }}
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>
    </div>
  );
}

function MessageBubble({
  message,
  primaryColor,
}: {
  message: Message;
  primaryColor: string;
}) {
  const isUser = message.role === 'USER';
  const isSystem = message.role === 'SYSTEM';

  if (isSystem) {
    return (
      <div className="text-center text-sm text-gray-500 my-3">
        {message.content}
      </div>
    );
  }

  return (
    <div className={`mb-3 flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isUser
            ? 'text-white rounded-br-md'
            : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
        }`}
        style={isUser ? { backgroundColor: primaryColor } : undefined}
      >
        {!isUser && message.agentRole && (
          <div className="text-xs text-gray-400 mb-1">
            {message.agentRole === 'SUPPORT' ? '🎧 Support' :
             message.agentRole === 'OPS' ? '🔧 Operations' :
             message.agentRole === 'SALES' ? '💼 Sales' : '🤖 AI'}
          </div>
        )}
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        <div className={`text-xs mt-1 ${isUser ? 'text-white/70' : 'text-gray-400'}`}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

function QuickAction({
  text,
  onClick,
}: {
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition text-sm text-gray-700"
    >
      {text}
    </button>
  );
}

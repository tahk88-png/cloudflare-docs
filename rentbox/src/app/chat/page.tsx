"use client";
import { useState } from "react";

type Message = {
  role: "user" | "ai";
  content: string;
};

export default function ChatPage() {
  const [bookingId, setBookingId] = useState("booking-123");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: "user" as const, content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, message: userMsg.content }),
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: "ai", content: data.response }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-blue-600 p-4 text-white">
          <h2 className="font-bold">Rentbox Support</h2>
          <p className="text-xs">Booking ID: <input className="text-black px-1" value={bookingId} onChange={e => setBookingId(e.target.value)} /></p>
        </div>
        
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] p-3 rounded-lg ${m.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && <div className="text-gray-400 text-sm">AI is typing...</div>}
        </div>

        <div className="p-4 border-t flex gap-2">
          <input 
            className="flex-1 border rounded px-3 py-2"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
          />
          <button onClick={sendMessage} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

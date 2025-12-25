'use client';

import { ChatWidget } from '@/components/ChatWidget';

export default function Home() {
  // In a real implementation, you would get these from the URL params or user session
  const bookingId = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('booking_id')
    : null;
  
  const userId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('user_id')
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to Rentbox
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Smart rental service with AI-powered support
          </p>
        </div>

        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-3xl font-semibold mb-6">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📱</span>
              </div>
              <h3 className="font-semibold mb-2">1. Book Online</h3>
              <p className="text-gray-600 text-sm">
                Choose your product and book a time slot
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔓</span>
              </div>
              <h3 className="font-semibold mb-2">2. Smart Locker Access</h3>
              <p className="text-gray-600 text-sm">
                Pick up from our automated lockers 24/7
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🤖</span>
              </div>
              <h3 className="font-semibold mb-2">3. AI Support</h3>
              <p className="text-gray-600 text-sm">
                Get instant help from our AI assistant
              </p>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-lg mb-3">AI Employee Features</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start">
                <span className="mr-2">✅</span>
                <span>24/7 customer support with context-aware assistance</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✅</span>
                <span>Automated pickup instructions and reminders</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✅</span>
                <span>Smart locker troubleshooting and remote access</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✅</span>
                <span>Proactive overdue notifications and ticket creation</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✅</span>
                <span>Multi-agent system: Support, Operations, and Sales</span>
              </li>
            </ul>
          </div>

          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Need help? Click the chat button in the bottom right corner!
            </p>
            <a
              href="/admin"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Admin Dashboard →
            </a>
          </div>
        </div>
      </div>

      {/* Chat Widget */}
      <ChatWidget
        bookingId={bookingId ? parseInt(bookingId) : undefined}
        userId={userId ? parseInt(userId) : undefined}
      />
    </div>
  );
}

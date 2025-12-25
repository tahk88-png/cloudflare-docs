import ChatWidget from '@/components/chat/ChatWidget';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📦</span>
              <span className="text-xl font-bold text-gray-900">Rentbox.ee</span>
            </div>
            <nav className="flex gap-4">
              <Link
                href="/admin"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
              >
                Admin Console
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            🤖 Rentbox AI Employee
            <span className="block text-2xl font-normal text-gray-600 mt-2">
              v1.0
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Intelligent customer support, automated operations, and seamless equipment rental management.
          </p>

          {/* Feature Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <FeatureCard
              icon="💬"
              title="AI Chat Support"
              description="Multi-agent chat system with Support, Operations, and Sales roles. Context-aware responses with tool calling."
            />
            <FeatureCard
              icon="⚡"
              title="Event Automation"
              description="Rules engine processes webhooks and schedules. Automated reminders, overdue notices, and ticket creation."
            />
            <FeatureCard
              icon="🔐"
              title="Safe Operations"
              description="Built-in safety checks for locker access. No unauthorized refunds. Rate-limited communications."
            />
          </div>

          {/* Architecture */}
          <div className="mt-20 bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">System Architecture</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <ArchCard
                title="Chat API"
                items={['Message routing', 'Conversation state', 'Tool execution', 'Multi-agent orchestration']}
              />
              <ArchCard
                title="Events API"
                items={['Webhook ingestion', 'Rules processing', 'Event logging', 'Async processing']}
              />
              <ArchCard
                title="Admin API"
                items={['Risk dashboard', 'Ticket management', 'AI actions log', 'Metrics & stats']}
              />
              <ArchCard
                title="Background Worker"
                items={['Cron schedules', 'Overdue checks', 'Reminder sending', 'Event processing']}
              />
            </div>
          </div>

          {/* DB Schema */}
          <div className="mt-12 bg-white rounded-2xl shadow-xl p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Database Schema</h2>
            <div className="flex flex-wrap justify-center gap-3">
              {['users', 'products', 'lockers', 'compartments', 'bookings', 'payments', 'events', 'messages', 'conversations', 'ai_actions', 'tickets', 'rules', 'templates'].map((table) => (
                <span
                  key={table}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium"
                >
                  {table}
                </span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="mt-12 flex justify-center gap-4">
            <Link
              href="/admin"
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Open Admin Console →
            </Link>
          </div>
        </div>
      </main>

      {/* Chat Widget - Demo */}
      <ChatWidget
        userId="demo-user"
        position="bottom-right"
        primaryColor="#2563eb"
      />

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600">
          <p>Rentbox AI Employee v1.0 • Built with Next.js, Prisma, OpenAI</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 text-left">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

function ArchCard({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-semibold text-gray-900 mb-3">{title}</h3>
      <ul className="text-sm text-gray-600 space-y-1">
        {items.map((item, i) => (
          <li key={i}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

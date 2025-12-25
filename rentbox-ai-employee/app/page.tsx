import ChatWidget from '@/components/ChatWidget';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Welcome to Rentbox</h1>
        <p className="text-lg text-gray-600 mb-8">
          Your locker rental service. Use the chat widget in the bottom right corner for support.
        </p>
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">How it works</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Book a locker compartment for your rental period</li>
            <li>Receive pickup instructions via email/SMS</li>
            <li>Use your pickup code to access the locker</li>
            <li>Get automated reminders and support when needed</li>
          </ul>
        </div>
      </div>
      <ChatWidget />
    </main>
  );
}

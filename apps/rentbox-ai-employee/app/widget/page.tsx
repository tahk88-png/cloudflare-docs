import { ChatWidgetClient } from "@/components/ChatWidgetClient";

export default async function WidgetDemoPage(props: { searchParams: Promise<{ booking_id?: string }> }) {
  const sp = await props.searchParams;
  const bookingId = sp.booking_id ?? "";
  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <h1 className="text-xl font-semibold">Chat Widget (Demo)</h1>
          <p className="text-sm text-white/70">
            This is the same UI as the iframe widget, rendered full-page for easier testing.
          </p>
        </div>
        <div className="h-[70vh] overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <ChatWidgetClient bookingId={bookingId} />
        </div>
      </div>
    </main>
  );
}


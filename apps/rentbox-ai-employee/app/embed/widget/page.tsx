import { ChatWidgetClient } from "@/components/ChatWidgetClient";

export default async function EmbedWidgetPage(props: { searchParams: Promise<{ booking_id?: string }> }) {
  const sp = await props.searchParams;
  const bookingId = sp.booking_id ?? "";
  return (
    <main className="h-screen w-screen">
      <div className="h-full w-full">
        <ChatWidgetClient bookingId={bookingId} />
      </div>
    </main>
  );
}


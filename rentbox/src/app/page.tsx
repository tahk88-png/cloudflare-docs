import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 gap-8">
      <h1 className="text-4xl font-bold">Rentbox AI Employee</h1>
      <div className="flex gap-4">
        <Link href="/chat" className="px-4 py-2 bg-blue-500 text-white rounded">
          Customer Chat Demo
        </Link>
        <Link href="/admin" className="px-4 py-2 bg-slate-800 text-white rounded">
          Admin Console
        </Link>
      </div>
    </main>
  );
}

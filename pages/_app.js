import QrUploader from "./index";

export default function Home() {
  return (
    <main className="p-6">
      <h1 className="text-xl font-bold mb-4">QR Image to Qr String</h1>
      <QrUploader />
    </main>
  );
}

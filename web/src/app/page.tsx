import Link from "next/link";

export default function Home() {
  return (
    <main className="home-page">
      <p className="eyebrow">MEDOT · Prototype</p>
      <h1>Tap a sample strip to hear its recorded medicine details.</h1>
      <p>
        This test app opens the URL stored on an NFC tag. The phone reads the tag;
        the medicine information comes from the web app.
      </p>
      <p>
        Operators can create a pending tag, write its URL, verify the readback,
        and activate it for a sample strip.
      </p>
      <Link className="button-link" href="/admin">Open operator area</Link>
      <p className="small-note">
        For prototype testing with sample packaging only. This does not verify a
        medicine&apos;s authenticity or provide medical advice.
      </p>
    </main>
  );
}

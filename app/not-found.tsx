import Link from "next/link";
export default function NotFound() {
  return (
    <main className="system-page">
      <p>404 / NO REGISTER</p>
      <h1>This route has no clock.</h1>
      <Link href="/">Open SecretClock</Link>
    </main>
  );
}

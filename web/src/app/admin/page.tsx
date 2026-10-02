import Link from "next/link";
import { cookies } from "next/headers";
import { adminCookieName, verifyAdminSession } from "@/lib/admin-auth";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function AdminPage({ searchParams }: Props) {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminCookieName)?.value ?? "";
  const secret = process.env.SESSION_SECRET ?? "";
  const signedIn = verifyAdminSession(token, secret);
  const { error } = await searchParams;

  return (
    <main className="operator-page">
      <h1>MEDOT operator</h1>
      {signedIn ? (
        <>
          <p>Use sample strips and test instructions for this prototype.</p>
          <Link href="/admin/new">Provision a MEDOT tag</Link>
          <p><Link href="/admin/tags">Resume or revoke a recent tag</Link></p>
        </>
      ) : (
        <>
          <p>Enter the demo operator password to provision tags.</p>
          {error && <p role="alert">Login failed. Check the password.</p>}
          <form method="post" action="/api/admin/login">
            <label htmlFor="password">Operator password</label>
            <input id="password" name="password" type="password" required />
            <button type="submit">Sign in</button>
          </form>
        </>
      )}
    </main>
  );
}

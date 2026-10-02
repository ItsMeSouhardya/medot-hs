export async function POST() {
  return Response.json({ error: "PASSWORD_LOGIN_REMOVED", signInUrl: "/sign-in" }, {
    status: 410,
    headers: { "Cache-Control": "no-store" },
  });
}

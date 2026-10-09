import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// This is the OAuth callback route that Supabase redirects back to after Google login.
// It exchanges the temporary `code` for a persistent user session and preserves the `next` target (e.g. /join?code=...).
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  let next = requestUrl.searchParams.get("next") ?? "/dashboard";

  // Security: Prevent open redirect vulnerabilities
  if (!next.startsWith("/")) {
    next = "/dashboard";
  }

  // Sanitize next if it accidentally contains an OAuth UUID code as join code
  if (next.startsWith("/join?code=") || next.startsWith("/join?joinCode=")) {
    const nextUrlObj = new URL(next, requestUrl.origin);
    const joinCode = nextUrlObj.searchParams.get("code") || nextUrlObj.searchParams.get("joinCode");
    if (joinCode && (joinCode.includes("-") || joinCode.length > 12)) {
      next = "/dashboard";
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const origin = requestUrl.origin;
  const redirectBase = !isLocalEnv && forwardedHost ? `https://${forwardedHost}` : origin;

  if (code) {
    const response = NextResponse.redirect(`${redirectBase}${next}`);
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                // Ignore in Server Component context
              }
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return response;
    } else {
      console.error("Auth callback exchange error:", error);
    }
  }

  // Return user to login with an error if exchange fails
  return NextResponse.redirect(`${redirectBase}/?error=auth_callback_failed`);
}

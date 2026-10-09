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

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const origin = requestUrl.origin;
  const redirectBase = !isLocalEnv && forwardedHost ? `https://${forwardedHost}` : origin;

  if (code) {
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
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Server component ignore
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${redirectBase}${next}`);
      // Ensure all updated session cookies are attached to the redirect response headers
      const allCookies = cookieStore.getAll();
      allCookies.forEach((c) => {
        response.cookies.set(c.name, c.value);
      });
      return response;
    } else {
      console.error("Auth callback exchange error:", error);
    }
  }

  // Return user to login with an error if exchange fails
  return NextResponse.redirect(`${redirectBase}/?error=auth_callback_failed`);
}

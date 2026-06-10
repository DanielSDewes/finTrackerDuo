import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { TERMS_VERSION } from "@/features/legal/terms-version";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith("/auth");
  const isApiRoute = pathname.startsWith("/api");
  const isReacceptPage = pathname === "/termos/aceite";
  const isPublicPage =
    pathname === "/" ||
    pathname === "/termos" ||
    isAuthPage;

  // Rotas /api são endpoints (cron, webhooks etc.) — autenticam por header
  // próprio (CRON_SECRET, signing secret, etc.). Redirecionar para a página
  // de login nesse caso quebra o cron silenciosamente: o handler nunca roda
  // e a Vercel registra um 307 para /auth/login.
  if (!user && !isPublicPage && !isApiRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Reaceite obrigatório quando a versão aceita difere da vigente. Não bloqueia
  // a própria página de aceite, rotas de auth ou de API (evita quebrar fetches).
  if (user && !isReacceptPage && !isAuthPage && !isApiRoute) {
    const acceptedVersion = (user.user_metadata as { terms_version?: string })
      ?.terms_version;
    if (acceptedVersion !== TERMS_VERSION) {
      const url = request.nextUrl.clone();
      url.pathname = "/termos/aceite";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

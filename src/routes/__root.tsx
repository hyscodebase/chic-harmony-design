import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "IntentLock — 승인한 구매만 결제되는 Guarded Checkout" },
      { name: "description", content: "IntentLock 은 자연어로 승인한 계약과 주문 원본을 서버에서 대조해, 계약을 벗어난 결제를 원천 차단합니다." },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "IntentLock — 승인한 구매만 결제되는 Guarded Checkout" },
      { property: "og:description", content: "IntentLock 은 자연어로 승인한 계약과 주문 원본을 서버에서 대조해, 계약을 벗어난 결제를 원천 차단합니다." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "IntentLock — 승인한 구매만 결제되는 Guarded Checkout" },
      { name: "twitter:description", content: "IntentLock 은 자연어로 승인한 계약과 주문 원본을 서버에서 대조해, 계약을 벗어난 결제를 원천 차단합니다." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/6bd62be5-0e20-43a9-9319-560f334a8f0e" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/6bd62be5-0e20-43a9-9319-560f334a8f0e" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSync />
      <SiteChrome />
      <Outlet />
    </QueryClientProvider>
  );
}

function AuthSync() {
  const router = useRouter();
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        router.invalidate();
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router]);
  return null;
}

function SiteChrome() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setEmail(data.user?.email ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setEmail(session?.user.email ?? null);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center bg-foreground text-background text-[10px] font-bold">
            IL
          </span>
          <span className="text-sm font-semibold tracking-tight">IntentLock</span>
          <span className="ml-2 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            샌드박스
          </span>
        </Link>
        <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
          <Link to="/checkout" className="hover:text-foreground transition-colors">
            구매
          </Link>
          <Link to="/agent" className="hover:text-foreground transition-colors">
            AI 에이전트
          </Link>
          <Link to="/purchases" className="hover:text-foreground transition-colors">
            구매 내역
          </Link>
          <Link to="/beta" className="hover:text-foreground transition-colors">
            Beta Pass
          </Link>
          <Link to="/operator" className="hover:text-foreground transition-colors">
            운영자
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-xs">
          {email ? (
            <>
              <span className="hidden text-muted-foreground md:inline">{email}</span>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
                className="rounded-full border border-border px-3 py-1.5 hover:bg-accent transition-colors"
              >
                로그아웃
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="rounded-full bg-foreground px-4 py-1.5 text-background hover:opacity-90 transition-opacity"
            >
              로그인
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

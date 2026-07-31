import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "로그인 · IntentLock" },
      { name: "description", content: "이메일로 IntentLock 에 로그인하세요." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/checkout" });
    });
  }, [navigate]);

  async function signInGoogle() {
    setLoading(true);
    setErr(null);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (result.redirected) return;
      const { data } = await supabase.auth.getUser();
      if (data.user) navigate({ to: "/checkout" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center px-6 py-12">
      <div className="w-full rounded-lg border border-border bg-card p-8">
        <h1 className="text-2xl font-semibold tracking-tight">로그인</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Google 계정으로 IntentLock 에 접속합니다.
        </p>
        <div className="mt-8 space-y-4">
          {err && (
            <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs">
              {err}
            </div>
          )}
          <button
            type="button"
            onClick={signInGoogle}
            disabled={loading}
            className="w-full rounded-md bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "처리 중…" : "Google 로 계속하기"}
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            이메일·비밀번호 로그인은 지원하지 않습니다.
          </p>
        </div>
      </div>
    </main>
  );
}
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/checkout" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setErr(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/checkout" },
        });
        if (error) throw error;
        setMsg("가입되었습니다. 로그인 상태이면 잠시 후 이동합니다.");
        const { data } = await supabase.auth.getUser();
        if (data.user) navigate({ to: "/checkout" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/checkout" });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center justify-center px-6 py-12">
      <div className="w-full rounded-lg border border-border bg-card p-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "signin" ? "로그인" : "가입"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          이메일과 비밀번호로 IntentLock 에 접속합니다.
        </p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">이메일</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">비밀번호</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          {err && (
            <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs">
              {err}
            </div>
          )}
          {msg && (
            <div className="rounded-md border border-border bg-muted px-3 py-2 text-xs">{msg}</div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-foreground py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "처리 중…" : mode === "signin" ? "로그인" : "가입하기"}
          </button>
        </form>
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          {mode === "signin" ? "가입이 필요하신가요?" : "이미 계정이 있습니다"}
        </button>
      </div>
    </main>
  );
}
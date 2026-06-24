"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMessage({ type: "error", text: error.message });
        setLoading(false);
        return;
      }
      router.push("/events");
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setMessage({ type: "error", text: error.message });
        setLoading(false);
        return;
      }
      setMessage({ type: "success", text: "Check your email to confirm your account." });
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-lg font-semibold mb-6">
          {mode === "signin" ? "Sign in" : "Create account"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full text-sm border border-zinc-200 rounded-md px-3 py-2
                         focus:outline-none focus:ring-1 focus:ring-[#2a5bd7] focus:border-[#2a5bd7]"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="w-full text-sm border border-zinc-200 rounded-md px-3 py-2
                         focus:outline-none focus:ring-1 focus:ring-[#2a5bd7] focus:border-[#2a5bd7]"
            />
          </div>

          {message && (
            <p className={`text-xs ${message.type === "error" ? "text-red-500" : "text-green-600"}`}>
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm font-medium bg-[#2a5bd7] text-white py-2 rounded-md
                       hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {loading
              ? mode === "signin" ? "Signing in…" : "Creating account…"
              : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="text-xs text-zinc-400 mt-4 text-center">
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => { setMode("signup"); setMessage(null); }}
                className="text-[#2a5bd7] hover:underline"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => { setMode("signin"); setMessage(null); }}
                className="text-[#2a5bd7] hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  );
}

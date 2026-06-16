"use client";

import { Bot, LogIn } from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { saveSession } from "@/lib/auth";
import type { AdminUser } from "@/types/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@crr.local");
  const [password, setPassword] = useState("Admin@12345");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api<{ token: string; admin: AdminUser }>("/auth/login", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email, password }),
      });

      saveSession(response.token, response.admin);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-700 text-white">
            <Bot size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-950">CRR Admin Login</h1>
            <p className="text-sm text-slate-600">Manage Meta leads and matches</p>
          </div>
        </div>

        {error ? (
          <div className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <label className="mt-6 block text-sm font-medium text-slate-700">
          Email
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            type="email"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-slate-700">
          Password
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            type="password"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800 disabled:bg-slate-400"
        >
          <LogIn size={17} />
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

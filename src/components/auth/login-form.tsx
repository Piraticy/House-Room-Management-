"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

const demoAccounts = [
  {
    label: "Admin",
    email: "admin@harborstay.app",
    password: "Admin@123",
  },
  {
    label: "Owner",
    email: "owner@harborstay.app",
    password: "Owner@123",
  },
  {
    label: "Tenant",
    email: "mina@harborstay.app",
    password: "Tenant@123",
  },
] as const;

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("admin@harborstay.app");
  const [password, setPassword] = useState("Admin@123");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setError("Incorrect email or password. Try one of the demo accounts below.");
        return;
      }

      router.push(result?.url ?? "/dashboard");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="panel-strong p-6 sm:p-8">
      <p className="eyebrow">Sign in</p>
      <h2 className="mt-2 text-2xl font-semibold text-stone-900">Open your account</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        Choose a ready account below or enter the email and password yourself.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {demoAccounts.map((account) => (
          <button
            key={account.label}
            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-teal-300 hover:text-teal-700"
            type="button"
            onClick={() => {
              setEmail(account.email);
              setPassword(account.password);
              setError("");
            }}
          >
            Use {account.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        <input
          className="field"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          className="field"
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}
        <button className="primary-button w-full" type="submit" disabled={isPending}>
          {isPending ? "Opening account..." : "Continue"}
        </button>
      </div>
    </form>
  );
}

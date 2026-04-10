import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getAuthSession, roleHomePath } from "@/lib/auth";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

const demoAccounts = [
  {
    role: "Admin",
    email: "admin@harborstay.app",
    password: "Admin@123",
  },
  {
    role: "Owner",
    email: "owner@harborstay.app",
    password: "Owner@123",
  },
  {
    role: "Tenant",
    email: "mina@harborstay.app",
    password: "Tenant@123",
  },
] as const;

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [session, params] = await Promise.all([getAuthSession(), searchParams]);

  if (session?.user?.role) {
    redirect(roleHomePath(session.user.role));
  }

  const callbackUrl = params.callbackUrl || "/dashboard";

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="panel-strong p-6 sm:p-8">
          <p className="eyebrow">Account Access</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900">
            Sign in to the right page
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">
            Admin, owner, and tenant each have a separate page, so the screen stays
            short, clear, and easier to use every day.
          </p>

          <div className="mt-6 rounded-[24px] border border-stone-200 bg-white/80 p-4">
            <p className="eyebrow">System setup</p>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              This starter system is set for Tanga Region, with rent amounts shown in
              Tanzanian shillings and reminders sent before a stay is due.
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            {demoAccounts.map((account) => (
              <div key={account.role} className="rounded-[24px] border border-stone-200 bg-white/85 p-4">
                <p className="text-sm font-semibold text-stone-900">{account.role}</p>
                <p className="mt-2 font-mono text-sm text-stone-700">{account.email}</p>
                <p className="mt-1 font-mono text-sm text-stone-500">{account.password}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <Link href="/" className="secondary-button">
              Back to home
            </Link>
          </div>
        </section>

        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </main>
  );
}

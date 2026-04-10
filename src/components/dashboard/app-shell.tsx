import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
};

type TabItem = {
  href: string;
  label: string;
};

export function AppShell({
  roleLabel,
  title,
  description,
  userName,
  currentPath,
  navItems,
  tabs,
  currentTab,
  children,
}: {
  roleLabel: string;
  title: string;
  description: string;
  userName: string;
  currentPath: string;
  navItems: readonly NavItem[];
  tabs?: readonly TabItem[];
  currentTab?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="px-4 py-5 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-5 lg:grid-cols-[255px_minmax(0,1fr)]">
        <aside className="panel-strong h-fit p-5 lg:sticky lg:top-5">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="eyebrow">
              Tanga Property Desk
            </Link>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">
              TZS
            </span>
          </div>

          <div className="mt-4 rounded-[26px] bg-stone-950 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.22em] text-stone-400">{roleLabel}</p>
            <p className="mt-2 text-xl font-semibold">{userName}</p>
            <p className="mt-2 text-sm leading-6 text-stone-300">
              Open one section at a time and keep the day-to-day work clear.
            </p>
          </div>

          <div className="mt-4 rounded-[24px] border border-stone-200 bg-white/80 p-4">
            <p className="eyebrow">System focus</p>
            <div className="mt-3 space-y-3 text-sm text-stone-600">
              <p>Tanga Region homes and rooms</p>
              <p>Rent reminders 60 days before due date</p>
            </div>
          </div>

          <nav className="mt-5 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-[20px] px-4 py-3 text-sm font-medium transition",
                  currentPath === item.href
                    ? "bg-teal-900 text-white shadow-[0_16px_40px_-24px_rgba(15,118,110,0.9)]"
                    : "bg-white/75 text-stone-700 hover:bg-white",
                )}
              >
                <span>{item.label}</span>
                <span className="text-xs uppercase tracking-[0.2em] opacity-70">Open</span>
              </Link>
            ))}
          </nav>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/" className="secondary-button">
              Home
            </Link>
            <LogoutButton />
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-5">
          <header className="panel-strong overflow-hidden p-6 sm:p-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px] xl:items-start">
              <div className="max-w-3xl">
                <p className="eyebrow">{roleLabel} area</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900">
                  {title}
                </h1>
                <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">
                  {description}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[22px] border border-stone-200 bg-white/85 p-4">
                  <p className="eyebrow">Region</p>
                  <p className="mt-2 text-lg font-semibold text-stone-900">Tanga, Tanzania</p>
                  <p className="mt-1 text-sm text-stone-500">Built for house, master bedroom, and normal room management.</p>
                </div>
                <div className="rounded-[22px] border border-stone-200 bg-white/85 p-4">
                  <p className="eyebrow">Alerts</p>
                  <p className="mt-2 text-lg font-semibold text-stone-900">60-day rent reminder</p>
                  <p className="mt-1 text-sm text-stone-500">Tenants are warned early before their stay reaches the end date.</p>
                </div>
              </div>
            </div>
          </header>

          {tabs && tabs.length > 0 ? (
            <div className="panel px-2 py-2">
              <div className="flex gap-2 overflow-x-auto">
                {tabs.map((tab) => (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    className={cn(
                      "shrink-0 rounded-full px-4 py-2.5 text-sm font-medium transition",
                      currentTab === tab.href
                        ? "bg-teal-900 text-white shadow-[0_16px_40px_-24px_rgba(15,118,110,0.9)]"
                        : "bg-white/90 text-stone-700 hover:bg-white",
                    )}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          {children}
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import {
  BellRing,
  Building2,
  Hammer,
  Wallet,
  Package2,
  Users,
  Home,
} from "lucide-react";
import { getOverviewData } from "@/lib/dashboard";
import { getAuthSession, roleHomePath } from "@/lib/auth";

export default async function HomePage() {
  const [session, stats] = await Promise.all([getAuthSession(), getOverviewData()]);
  const dashboardHref = session?.user?.role ? roleHomePath(session.user.role) : "/login";

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="panel-strong overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div>
              <p className="eyebrow">Tanga Property Desk</p>
              <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
                A practical system for managing houses and rooms in Tanga Region.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
                Keep house prices, rent income, stock items, daily costs, repairs,
                notices, and tenant stays in one clear place. Each person signs in
                only to the area meant for them.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={dashboardHref} className="primary-button">
                  {session ? "Open my work area" : "Sign in"}
                </Link>
                {!session ? (
                  <Link href="/login" className="secondary-button">
                    View account details
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard
                icon={Building2}
                label="Properties"
                value={String(stats.propertyCount)}
                detail="Homes managed in Tanga"
              />
              <MetricCard
                icon={Home}
                label="Spaces"
                value={String(stats.unitCount)}
                detail="Houses and rooms in the system"
              />
              <MetricCard
                icon={Users}
                label="Active stays"
                value={String(stats.activeTenantCount)}
                detail="Tenants currently assigned"
              />
              <MetricCard
                icon={BellRing}
                label="Occupancy"
                value={`${stats.occupancyRate}%`}
                detail={`${stats.activeTenantCount} active stays`}
              />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <FeatureCard
            icon={Package2}
            title="Admin area"
            description="Set house and room prices, assign tenants, and manage stock, costs, and repairs."
          />
          <FeatureCard
            icon={Wallet}
            title="Owner area"
            description="See rent income, follow performance, send notices, and message tenants."
          />
          <FeatureCard
            icon={Hammer}
            title="Tenant area"
            description="See room details, notices, messages, and rent reminders before due date."
          />
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/80 bg-white/80 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        <div className="rounded-2xl bg-stone-100 p-2 text-stone-700">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-stone-500">{detail}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <article className="panel p-6">
      <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
        <Icon className="size-5" />
      </div>
      <h2 className="mt-4 text-xl font-semibold text-stone-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
    </article>
  );
}

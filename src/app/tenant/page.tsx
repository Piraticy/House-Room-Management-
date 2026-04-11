import { BellRing, CalendarRange, MessageSquareMore, Wallet } from "lucide-react";
import { Role } from "@prisma/client";
import { AppShell } from "@/components/dashboard/app-shell";
import { UnitBlueprint } from "@/components/dashboard/unit-blueprint";
import { UnitFacts } from "@/components/dashboard/unit-facts";
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  getTenantDashboardData,
  paymentMethodLabel,
  unitTypeLabel,
} from "@/lib/dashboard";
import { requireRole } from "@/lib/auth";

const navItems = [
  { href: "/tenant", label: "Tenant area" },
  { href: "/owner", label: "Owner area" },
  { href: "/admin", label: "Admin area" },
];

const tenantTabs = [
  { key: "overview", label: "Overview", href: "/tenant" },
  { key: "room", label: "Room", href: "/tenant?section=room" },
  { key: "payments", label: "Payments", href: "/tenant?section=payments" },
  { key: "notices", label: "Notices", href: "/tenant?section=notices" },
  { key: "messages", label: "Messages", href: "/tenant?section=messages" },
] as const;

type TenantSection = (typeof tenantTabs)[number]["key"];

const tenantSectionMeta = {
  overview: {
    title: "Tenant dashboard",
    description: "See the most important updates first, then open your room, payments, notices, or messages when needed.",
  },
  room: {
    title: "My room",
    description: "View your assigned room, monthly rent, stay dates, and simple room details in one place.",
  },
  payments: {
    title: "My payments",
    description: "Check the payments already recorded on your stay.",
  },
  notices: {
    title: "Property notices",
    description: "Read updates from the owner or property team without extra clutter on the page.",
  },
  messages: {
    title: "Inbox",
    description: "Open direct messages from the owner and keep important information easy to find.",
  },
} as const;

type TenantPageProps = {
  searchParams: Promise<{
    section?: string;
  }>;
};

function resolveSection(section?: string) {
  return tenantTabs.some((tab) => tab.key === section)
    ? (section as TenantSection)
    : "overview";
}

export default async function TenantPage({ searchParams }: TenantPageProps) {
  const session = await requireRole(Role.TENANT);
  const [data, params] = await Promise.all([getTenantDashboardData(session.user.id), searchParams]);
  const section = resolveSection(params.section);
  const currentTab = tenantTabs.find((tab) => tab.key === section)?.href ?? "/tenant";
  const sectionMeta = tenantSectionMeta[section];

  return (
    <AppShell
      roleLabel="Tenant"
      userName={session.user.name ?? "Tenant"}
      currentPath="/tenant"
      navItems={navItems}
      tabs={tenantTabs}
      currentTab={currentTab}
      title={sectionMeta.title}
      description={sectionMeta.description}
    >
      {section === "overview" ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-4">
          <StatCard icon={CalendarRange} label="Active stay" value={String(data.stats.activeStayCount)} detail="Current room record" />
          <StatCard icon={BellRing} label="Due alerts" value={String(data.stats.nextDueCount)} detail="Near end date" />
          <StatCard icon={MessageSquareMore} label="Messages" value={String(data.stats.inboxCount)} detail="Owner updates" />
          <StatCard icon={Wallet} label="Payments" value={formatCompactCurrency(data.stats.paidAmount)} detail="Recorded on your stay" />
        </section>
      ) : null}

      {section === "overview" ? <TenantOverview data={data} /> : null}
      {section === "room" ? <TenantRoom data={data} /> : null}
      {section === "payments" ? <TenantPayments data={data} /> : null}
      {section === "notices" ? <TenantNotices data={data} /> : null}
      {section === "messages" ? <TenantMessages data={data} /> : null}
    </AppShell>
  );
}

function TenantOverview({ data }: { data: Awaited<ReturnType<typeof getTenantDashboardData>> }) {
  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <div className="panel p-6">
        <p className="eyebrow">Room summary</p>
        {data.currentAssignment ? (
          <div className="mt-4 rounded-[24px] bg-white/85 p-4">
            <p className="font-semibold text-stone-900">{data.currentAssignment.unit.name}</p>
            <p className="mt-1 text-sm text-stone-500">
              {data.currentAssignment.unit.property.name} · {formatCurrency(data.currentAssignment.unit.monthlyRent)} per month
            </p>
            <p className="mt-3 text-sm text-stone-600">
              {formatDate(data.currentAssignment.startDate)} to {formatDate(data.currentAssignment.endDate)}
            </p>
          </div>
        ) : null}
      </div>

      <div className="panel p-6">
        <p className="eyebrow">Due soon</p>
        <div className="mt-4 space-y-3">
          {data.dueSoonAlerts.length > 0 ? (
            data.dueSoonAlerts.map((alert) => (
              <div key={alert.id} className="rounded-[22px] border border-amber-200 bg-amber-50/80 p-4">
                <p className="font-semibold text-amber-900">{alert.unitName}</p>
                <p className="mt-1 text-sm text-amber-800">
                  Due on {formatDate(alert.dueDate)}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-stone-300 bg-white/70 p-4 text-sm text-stone-500">
              No due-soon reminder right now.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TenantRoom({ data }: { data: Awaited<ReturnType<typeof getTenantDashboardData>> }) {
  return (
    <section className="panel p-6">
      <p className="eyebrow">My room</p>
      {data.currentAssignment ? (
        <div className="mt-4 overflow-hidden rounded-[26px] border border-stone-200 bg-white/85">
          <div className="p-5">
            <UnitBlueprint type={data.currentAssignment.unit.type} />
          </div>
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                {unitTypeLabel(data.currentAssignment.unit.type)}
              </span>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-700">
                {data.currentAssignment.status}
              </span>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">{data.currentAssignment.unit.name}</h2>
            <UnitFacts
              type={data.currentAssignment.unit.type}
              propertyName={data.currentAssignment.unit.property.name}
              floorLabel={data.currentAssignment.unit.floorLabel}
              finalLabel={formatCurrency(data.currentAssignment.unit.monthlyRent)}
              finalIcon={Wallet}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function TenantPayments({ data }: { data: Awaited<ReturnType<typeof getTenantDashboardData>> }) {
  return (
    <section className="panel p-6">
      <p className="eyebrow">Payments</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {data.payments.map((payment) => (
          <div key={payment.id} className="rounded-[22px] bg-white/85 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-stone-900">{formatCurrency(payment.amount)}</p>
                <p className="mt-1 text-sm text-stone-500">
                  {payment.property.name} · {formatDate(payment.paidOn)}
                </p>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-700">
                {paymentMethodLabel(payment.paymentMethod)}
              </span>
            </div>
            <p className="mt-3 text-sm text-stone-600">{payment.notes ?? "Payment saved in the system."}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TenantNotices({ data }: { data: Awaited<ReturnType<typeof getTenantDashboardData>> }) {
  return (
    <section className="panel p-6">
      <p className="eyebrow">Notices</p>
      <div className="mt-4 space-y-3">
        {data.announcements.map((announcement) => (
          <div key={announcement.id} className="rounded-[22px] bg-white/85 p-4">
            <p className="font-semibold text-stone-900">{announcement.title}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-500">
              {announcement.property.name} · {formatDate(announcement.createdAt)}
            </p>
            <p className="mt-3 text-sm leading-6 text-stone-600">{announcement.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TenantMessages({ data }: { data: Awaited<ReturnType<typeof getTenantDashboardData>> }) {
  return (
    <section className="panel p-6">
      <p className="eyebrow">Messages</p>
      <div className="mt-4 space-y-3">
        {data.messages.map((message) => (
          <div
            key={message.id}
            className="rounded-[22px] bg-[linear-gradient(135deg,#0f172a,#1e3a8a)] p-4 text-white"
          >
            <p className="font-semibold">{message.subject}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-300">
              From {message.sender.name} · {formatDate(message.createdAt)}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-100/90">{message.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatCard({
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
    <div className="panel p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-stone-500">{label}</p>
        <div className="rounded-2xl bg-sky-50 p-2 text-sky-700">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-3 min-w-0 text-[clamp(1.8rem,2.3vw,2.6rem)] font-semibold leading-none tracking-tight text-stone-900">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-stone-500">{detail}</p>
    </div>
  );
}

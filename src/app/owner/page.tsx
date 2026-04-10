import {
  BellRing,
  CircleDollarSign,
  Landmark,
  MessageSquareMore,
  Wallet,
} from "lucide-react";
import { Audience, PaymentMethod, Role, UnitType } from "@prisma/client";
import { publishAnnouncement, recordPayment, sendMessage } from "@/app/actions";
import { AppShell } from "@/components/dashboard/app-shell";
import { UnitBlueprint } from "@/components/dashboard/unit-blueprint";
import {
  formatCurrency,
  formatDate,
  getOwnerDashboardData,
  paymentMethodLabel,
  unitTypeLabel,
  unitUseLabel,
} from "@/lib/dashboard";
import { requireRole } from "@/lib/auth";

const navItems = [
  { href: "/owner", label: "Owner area" },
  { href: "/admin", label: "Admin area" },
  { href: "/tenant", label: "Tenant area" },
];

const ownerTabs = [
  { key: "overview", label: "Overview", href: "/owner" },
  { key: "income", label: "Income", href: "/owner?section=income" },
  { key: "rooms", label: "Rooms", href: "/owner?section=rooms" },
  { key: "notices", label: "Notices", href: "/owner?section=notices" },
  { key: "messages", label: "Messages", href: "/owner?section=messages" },
] as const;

type OwnerSection = (typeof ownerTabs)[number]["key"];

const ownerSectionMeta = {
  overview: {
    title: "Owner dashboard",
    description: "See the money picture first, then open the section you need for rooms, notices, or tenant messages.",
  },
  income: {
    title: "Income and performance",
    description: "Review payment records and keep a simple view of rent income for your properties.",
  },
  rooms: {
    title: "Rooms at a glance",
    description: "Check current rooms, prices, and occupancy without going through the full admin setup.",
  },
  notices: {
    title: "Notices",
    description: "Post clear updates to tenants or everyone connected to the property.",
  },
  messages: {
    title: "Tenant messages",
    description: "Send direct messages to residents and keep important conversations in one place.",
  },
} as const;

type OwnerPageProps = {
  searchParams: Promise<{
    section?: string;
  }>;
};

function resolveSection(section?: string) {
  return ownerTabs.some((tab) => tab.key === section)
    ? (section as OwnerSection)
    : "overview";
}

export default async function OwnerPage({ searchParams }: OwnerPageProps) {
  const session = await requireRole(Role.OWNER);
  const [data, params] = await Promise.all([getOwnerDashboardData(session.user.id), searchParams]);
  const section = resolveSection(params.section);
  const currentTab = ownerTabs.find((tab) => tab.key === section)?.href ?? "/owner";
  const sectionMeta = ownerSectionMeta[section];

  return (
    <AppShell
      roleLabel="Owner"
      userName={session.user.name ?? "Owner"}
      currentPath="/owner"
      navItems={navItems}
      tabs={ownerTabs}
      currentTab={currentTab}
      title={sectionMeta.title}
      description={sectionMeta.description}
    >
      {section === "overview" ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard icon={CircleDollarSign} label="Income" value={formatCurrency(data.stats.totalIncome)} detail="Payments received" />
          <StatCard icon={Wallet} label="Costs" value={formatCurrency(data.stats.totalExpenses)} detail="Costs entered" />
          <StatCard icon={Landmark} label="Net" value={formatCurrency(data.stats.netIncome)} detail="After costs" />
          <StatCard icon={BellRing} label="Due soon" value={String(data.dueSoonAlerts.length)} detail="Stays close to end date" />
          <StatCard icon={MessageSquareMore} label="Tenants" value={String(data.stats.tenantCount)} detail="Active residents" />
        </section>
      ) : null}

      {section === "overview" ? <OwnerOverview data={data} /> : null}
      {section === "income" ? <OwnerIncome data={data} /> : null}
      {section === "rooms" ? <OwnerRooms data={data} /> : null}
      {section === "notices" ? <OwnerNotices data={data} /> : null}
      {section === "messages" ? <OwnerMessages data={data} /> : null}
    </AppShell>
  );
}

function OwnerOverview({ data }: { data: Awaited<ReturnType<typeof getOwnerDashboardData>> }) {
  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <div className="panel p-6">
        <p className="eyebrow">Recent income</p>
        <div className="mt-4 space-y-3">
          {data.payments.slice(0, 5).map((payment) => (
            <div key={payment.id} className="rounded-[22px] bg-white/85 p-4">
              <p className="font-semibold text-stone-900">{formatCurrency(payment.amount)}</p>
              <p className="mt-1 text-sm text-stone-500">
                {payment.property.name} · {formatDate(payment.paidOn)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="panel p-6">
        <p className="eyebrow">Renewal watch</p>
        <div className="mt-4 space-y-3">
          {data.dueSoonAlerts.map((alert) => (
            <div key={alert.id} className="rounded-[22px] border border-amber-200 bg-amber-50/80 p-4">
              <p className="font-semibold text-amber-900">{alert.tenantName}</p>
              <p className="mt-1 text-sm text-amber-800">
                {alert.unitName} ends on {formatDate(alert.dueDate)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OwnerIncome({ data }: { data: Awaited<ReturnType<typeof getOwnerDashboardData>> }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="panel p-6">
        <p className="eyebrow">Income</p>
        <h2 className="mt-2 text-2xl font-semibold">Record payment</h2>
        <form action={recordPayment} className="mt-5 space-y-3">
          <select className="field" name="propertyId" defaultValue={data.properties[0]?.id ?? ""}>
            {data.properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" type="number" min="1" name="amount" placeholder="Amount in TZS" />
            <input className="field" type="date" name="paidOn" />
          </div>
          <select className="field" name="paymentMethod" defaultValue={PaymentMethod.MOBILE_MONEY}>
            <option value={PaymentMethod.CASH}>Cash</option>
            <option value={PaymentMethod.MOBILE_MONEY}>Mobile money</option>
            <option value={PaymentMethod.BANK_TRANSFER}>Bank transfer</option>
          </select>
          <input className="field" name="reference" placeholder="Reference number" />
          <textarea className="field min-h-20" name="notes" placeholder="Payment notes" />
          <button className="primary-button w-full" type="submit">
            Save payment
          </button>
        </form>
      </div>

      <div className="panel p-6">
        <div className="grid gap-4 lg:grid-cols-2">
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OwnerRooms({ data }: { data: Awaited<ReturnType<typeof getOwnerDashboardData>> }) {
  const houses = data.properties.flatMap((property) =>
    property.units
      .filter((unit) => unit.type === UnitType.HOUSE)
      .map((unit) => ({ ...unit, propertyName: property.name })),
  );
  const rooms = data.properties.flatMap((property) =>
    property.units
      .filter((unit) => unit.type !== UnitType.HOUSE)
      .map((unit) => ({ ...unit, propertyName: property.name })),
  );

  return (
    <section className="space-y-6">
      <div className="panel p-6">
        <p className="eyebrow">Houses</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {houses.map((unit) => (
            <OwnerUnitCard key={unit.id} unit={unit} propertyName={unit.propertyName} />
          ))}
        </div>
      </div>

      <div className="panel p-6">
        <p className="eyebrow">Rooms</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {rooms.map((unit) => (
            <OwnerUnitCard key={unit.id} unit={unit} propertyName={unit.propertyName} />
          ))}
        </div>
      </div>
    </section>
  );
}

function OwnerUnitCard({
  unit,
  propertyName,
}: {
  unit: {
    id: string;
    name: string;
    type: UnitType;
    monthlyRent: number;
    status: string;
    floorLabel: string | null;
    furnishings: string | null;
  };
  propertyName: string;
}) {
  return (
    <div className="rounded-[24px] border border-stone-200 bg-white/85 p-4">
      <UnitBlueprint type={unit.type} />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">
          {unitTypeLabel(unit.type)}
        </span>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-700">
          {unit.status.replaceAll("_", " ").toLowerCase()}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold">{unit.name}</h3>
      <p className="mt-1 text-sm text-stone-500">
        {propertyName} · {formatCurrency(unit.monthlyRent)}
      </p>
      <p className="mt-2 text-sm font-medium text-stone-700">
        {unitUseLabel(unit.type)}
        {unit.floorLabel ? ` · ${unit.floorLabel}` : ""}
      </p>
      {unit.furnishings ? (
        <p className="mt-3 text-sm leading-6 text-stone-600">{unit.furnishings}</p>
      ) : null}
    </div>
  );
}

function OwnerNotices({ data }: { data: Awaited<ReturnType<typeof getOwnerDashboardData>> }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="panel p-6">
        <p className="eyebrow">Notices</p>
        <h2 className="mt-2 text-2xl font-semibold">Post notice</h2>
        <form action={publishAnnouncement} className="mt-5 space-y-3">
          <select className="field" name="propertyId" defaultValue={data.properties[0]?.id ?? ""}>
            {data.properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <input className="field" name="title" placeholder="Notice title" />
          <select className="field" name="audience" defaultValue={Audience.TENANTS}>
            <option value={Audience.TENANTS}>Tenants</option>
            <option value={Audience.EVERYONE}>Everyone</option>
            <option value={Audience.OWNER_ONLY}>Owner only</option>
          </select>
          <textarea className="field min-h-24" name="body" placeholder="Write notice here" />
          <button className="primary-button w-full" type="submit">
            Post notice
          </button>
        </form>
      </div>

      <div className="panel p-6">
        <div className="space-y-3">
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
      </div>
    </section>
  );
}

function OwnerMessages({ data }: { data: Awaited<ReturnType<typeof getOwnerDashboardData>> }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="panel p-6">
        <p className="eyebrow">Messages</p>
        <h2 className="mt-2 text-2xl font-semibold">Send tenant message</h2>
        <form action={sendMessage} className="mt-5 space-y-3">
          <select className="field" name="propertyId" defaultValue={data.properties[0]?.id ?? ""}>
            {data.properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <select className="field" name="recipientId" defaultValue="">
            <option value="" disabled>
              Choose tenant
            </option>
            {data.tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
          <input className="field" name="subject" placeholder="Message title" />
          <textarea className="field min-h-24" name="body" placeholder="Write message here" />
          <button className="primary-button w-full" type="submit">
            Send message
          </button>
        </form>
      </div>

      <div className="panel p-6">
        <div className="space-y-3">
          {data.messages.map((message) => (
            <div key={message.id} className="rounded-[22px] bg-stone-950 p-4 text-white">
              <p className="font-semibold">{message.subject}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-400">
                To {message.recipient.name} · {formatDate(message.createdAt)}
              </p>
              <p className="mt-3 text-sm leading-6 text-stone-300">{message.body}</p>
            </div>
          ))}
        </div>
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
        <div className="rounded-2xl bg-stone-100 p-2 text-stone-700">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-stone-500">{detail}</p>
    </div>
  );
}

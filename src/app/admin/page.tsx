import {
  BadgeDollarSign,
  BellRing,
  CircleDollarSign,
  DoorClosed,
  Hammer,
  House,
  Plus,
  Package2,
  ShowerHead,
  Wallet,
} from "lucide-react";
import { PaymentMethod, RepairStatus, Role, UnitType } from "@prisma/client";
import {
  createExpense,
  createInventoryItem,
  createLeaseAssignment,
  createRepairLog,
  createUnit,
  recordPayment,
  updateLeaseEndDate,
  updateUnitPricing,
} from "@/app/actions";
import { AppShell } from "@/components/dashboard/app-shell";
import { UnitBlueprint } from "@/components/dashboard/unit-blueprint";
import { UnitFacts } from "@/components/dashboard/unit-facts";
import {
  expenseCategoryLabel,
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  getAdminDashboardData,
  inventoryStatusLabel,
  paymentMethodLabel,
  repairStatusLabel,
  unitTypeLabel,
} from "@/lib/dashboard";
import { requireRole } from "@/lib/auth";

const navItems = [
  { href: "/admin", label: "Admin area" },
  { href: "/owner", label: "Owner area" },
  { href: "/tenant", label: "Tenant area" },
];

const adminTabs = [
  { key: "overview", label: "Overview", href: "/admin" },
  { key: "houses", label: "Houses", href: "/admin?section=houses" },
  { key: "rooms", label: "Rooms", href: "/admin?section=rooms" },
  { key: "assignments", label: "Assignments", href: "/admin?section=assignments" },
  { key: "income", label: "Income", href: "/admin?section=income" },
  { key: "inventory", label: "Inventory", href: "/admin?section=inventory" },
  { key: "expenses", label: "Expenses", href: "/admin?section=expenses" },
  { key: "repairs", label: "Repairs", href: "/admin?section=repairs" },
] as const;

type AdminSection = (typeof adminTabs)[number]["key"];

const adminSectionMeta = {
  overview: {
    title: "Admin dashboard",
    description: "Start with the daily picture, then open the section you need for rooms, rent, stock, costs, or repairs.",
  },
  houses: {
    title: "Houses",
    description: "Manage house units separately, keep the setup short, and update prices without opening the room page.",
  },
  rooms: {
    title: "Rooms",
    description: "Manage master bedrooms and normal rooms in a shorter layout with simple blueprint plans.",
  },
  assignments: {
    title: "Tenant stays",
    description: "Assign rooms, set move-in and leave dates, and control how long each tenant stays.",
  },
  income: {
    title: "Rent income",
    description: "Save rent payments and review the latest income records for each property.",
  },
  inventory: {
    title: "Stock and supplies",
    description: "Track items kept at the property so day-to-day materials are easy to follow.",
  },
  expenses: {
    title: "Costs",
    description: "Save utility, repair, and other spending records to keep the money picture clear.",
  },
  repairs: {
    title: "Repair history",
    description: "Keep a simple record of reported issues, status changes, technicians, and repair costs.",
  },
} as const;

type AdminPageProps = {
  searchParams: Promise<{
    section?: string;
  }>;
};

function resolveSection(section?: string) {
  return adminTabs.some((tab) => tab.key === section)
    ? (section as AdminSection)
    : "overview";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const [session, data, params] = await Promise.all([
    requireRole(Role.ADMIN),
    getAdminDashboardData(),
    searchParams,
  ]);
  const section = resolveSection(params.section);
  const currentTab = adminTabs.find((tab) => tab.key === section)?.href ?? "/admin";
  const sectionMeta = adminSectionMeta[section];

  return (
    <AppShell
      roleLabel="Admin"
      userName={session.user.name ?? "Admin"}
      currentPath="/admin"
      navItems={navItems}
      tabs={adminTabs}
      currentTab={currentTab}
      title={sectionMeta.title}
      description={sectionMeta.description}
    >
      {section === "overview" ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          <StatCard
            icon={CircleDollarSign}
            label="Income"
            value={formatCompactCurrency(data.stats.totalIncome)}
            detail="Payments entered"
          />
          <StatCard
            icon={Wallet}
            label="Expenses"
            value={formatCompactCurrency(data.stats.totalExpenses)}
            detail="Recorded costs"
          />
          <StatCard
            icon={BellRing}
            label="Net"
            value={formatCompactCurrency(data.stats.netIncome)}
            detail="Income after costs"
          />
          <StatCard
            icon={Package2}
            label="Vacant rooms"
            value={String(data.stats.vacantUnitCount)}
            detail="Available now"
          />
          <StatCard
            icon={Hammer}
            label="Open repairs"
            value={String(data.stats.openRepairCount)}
            detail="Need follow-up"
          />
        </section>
      ) : null}

      {section === "overview" ? <OverviewSection data={data} /> : null}
      {section === "houses" ? <HousesSection data={data} /> : null}
      {section === "rooms" ? <RoomsSection data={data} /> : null}
      {section === "assignments" ? <AssignmentsSection data={data} /> : null}
      {section === "income" ? <IncomeSection data={data} /> : null}
      {section === "inventory" ? <InventorySection data={data} /> : null}
      {section === "expenses" ? <ExpensesSection data={data} /> : null}
      {section === "repairs" ? <RepairsSection data={data} /> : null}
    </AppShell>
  );
}

function OverviewSection({ data }: { data: Awaited<ReturnType<typeof getAdminDashboardData>> }) {
  return (
    <section className="grid gap-6 xl:grid-cols-2">
      <div className="panel p-6">
        <p className="eyebrow">Recent income</p>
        <div className="mt-4 space-y-3">
          {data.payments.slice(0, 5).map((payment) => (
            <div key={payment.id} className="rounded-[22px] bg-white/85 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-900">{formatCurrency(payment.amount)}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    {payment.property.name} · {payment.assignment?.tenant.name ?? "General payment"}
                  </p>
                </div>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-700">
                  {paymentMethodLabel(payment.paymentMethod)}
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-600">{formatDate(payment.paidOn)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="panel p-6">
        <p className="eyebrow">Need attention</p>
        <div className="mt-4 space-y-3">
          {data.dueSoonAlerts.slice(0, 3).map((alert) => (
            <div key={alert.id} className="rounded-[22px] border border-amber-200 bg-amber-50/80 p-4">
              <p className="font-semibold text-amber-900">{alert.tenantName}</p>
              <p className="mt-1 text-sm text-amber-800">
                {alert.unitName} ends on {formatDate(alert.dueDate)}
              </p>
            </div>
          ))}
          {data.repairLogs.slice(0, 3).map((repair) => (
            <div key={repair.id} className="rounded-[22px] bg-white/85 p-4">
              <p className="font-semibold text-stone-900">{repair.issueTitle}</p>
              <p className="mt-1 text-sm text-stone-500">
                {repair.property.name}
                {repair.unit ? ` · ${repair.unit.name}` : ""}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-stone-500">
                {repairStatusLabel(repair.status)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HousesSection({ data }: { data: Awaited<ReturnType<typeof getAdminDashboardData>> }) {
  const houses = data.properties.flatMap((property) =>
    property.units
      .filter((unit) => unit.type === UnitType.HOUSE)
      .map((unit) => ({
        ...unit,
        propertyName: property.name,
      })),
  );

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="panel p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">House list</p>
            <h2 className="mt-2 text-2xl font-semibold">Houses in the system</h2>
          </div>
          <span className="rounded-full bg-sky-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white">
            Blueprint
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {houses.map((unit) => (
            <SimpleUnitCard
              key={unit.id}
              unit={unit}
              propertyName={unit.propertyName}
            />
          ))}
        </div>
      </div>

      <div className="panel p-6">
        <p className="eyebrow">Add house</p>
        <h2 className="mt-2 text-2xl font-semibold">Create house</h2>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          Keep it simple. Add the name, monthly price, and a short location note.
        </p>
        <form action={createUnit} className="mt-5 space-y-3">
          <input type="hidden" name="type" value={UnitType.HOUSE} />
          <select className="field" name="propertyId" defaultValue={data.properties[0]?.id ?? ""}>
            {data.properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <input className="field" name="name" placeholder="House name" />
          <input className="field" type="number" min="1" name="monthlyRent" placeholder="Monthly price in TZS" />
          <input className="field" name="floorLabel" placeholder="Block or location note" />
          <textarea className="field min-h-24" name="notes" placeholder="Short note about the house" />
          <button className="primary-button w-full" type="submit">
            <Plus className="mr-2 size-4" />
            Add house
          </button>
        </form>
      </div>
    </section>
  );
}

function RoomsSection({ data }: { data: Awaited<ReturnType<typeof getAdminDashboardData>> }) {
  const rooms = data.properties.flatMap((property) =>
    property.units
      .filter((unit) => unit.type !== UnitType.HOUSE)
      .map((unit) => ({
        ...unit,
        propertyName: property.name,
      })),
  );

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="panel p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">Room list</p>
            <h2 className="mt-2 text-2xl font-semibold">Master bedrooms and normal rooms</h2>
          </div>
          <span className="rounded-full bg-sky-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white">
            Blueprint
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {rooms.map((unit) => (
            <SimpleUnitCard
              key={unit.id}
              unit={unit}
              propertyName={unit.propertyName}
            />
          ))}
        </div>
      </div>

      <div className="panel p-6">
        <p className="eyebrow">Add room</p>
        <h2 className="mt-2 text-2xl font-semibold">Create room</h2>
        <p className="mt-2 text-sm leading-6 text-stone-500">
          Master bedroom comes with attached washroom automatically. Normal room stays as room only.
        </p>
        <form action={createUnit} className="mt-5 space-y-3">
          <select className="field" name="propertyId" defaultValue={data.properties[0]?.id ?? ""}>
            {data.properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" name="name" placeholder="Room name" />
            <select className="field" name="type" defaultValue={UnitType.NORMAL_ROOM}>
              <option value={UnitType.MASTER_BEDROOM}>Master Bedroom</option>
              <option value={UnitType.NORMAL_ROOM}>Normal Room</option>
            </select>
          </div>
          <input className="field" type="number" min="1" name="monthlyRent" placeholder="Monthly price in TZS" />
          <input className="field" name="floorLabel" placeholder="Floor or block" />
          <textarea className="field min-h-24" name="notes" placeholder="Short note about the room" />
          <button className="primary-button w-full" type="submit">
            <Plus className="mr-2 size-4" />
            Add room
          </button>
        </form>
      </div>
    </section>
  );
}

function AssignmentsSection({ data }: { data: Awaited<ReturnType<typeof getAdminDashboardData>> }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="panel p-6">
        <p className="eyebrow">Stay control</p>
        <h2 className="mt-2 text-2xl font-semibold">Assignments and dates</h2>

        <form action={createLeaseAssignment} className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
          <div className="space-y-3">
            <select className="field" name="unitId" defaultValue="">
              <option value="" disabled>
                Choose vacant room
              </option>
              {data.vacantUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.label}
                </option>
              ))}
            </select>
            <select className="field" name="tenantId" defaultValue="">
              <option value="" disabled>
                Choose tenant
              </option>
              {data.tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="field" type="date" name="startDate" />
              <input className="field" type="date" name="endDate" />
            </div>
            <input className="field" type="number" min="0" name="securityDeposit" placeholder="Deposit in TZS" />
            <textarea className="field min-h-24" name="notes" placeholder="Notes about move-in or agreement" />
            <button className="primary-button w-full" type="submit">
              Save assignment
            </button>
          </div>
        </form>
      </div>

      <div className="panel p-6">
        <div className="space-y-4">
          {data.assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-[24px] border border-stone-200 bg-white/85 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
                  {assignment.status}
                </span>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-700">
                  {unitTypeLabel(assignment.unit.type)}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-semibold">
                {assignment.tenant.name} · {assignment.unit.name}
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                {assignment.unit.property.name} · {formatDate(assignment.startDate)} to {formatDate(assignment.endDate)}
              </p>
              <form action={updateLeaseEndDate} className="mt-4 flex flex-col gap-3 sm:flex-row">
                <input type="hidden" name="assignmentId" value={assignment.id} />
                <input className="field" type="date" name="endDate" defaultValue={assignment.endDate.toISOString().slice(0, 10)} />
                <button className="secondary-button sm:min-w-40" type="submit">
                  Update leave date
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function IncomeSection({ data }: { data: Awaited<ReturnType<typeof getAdminDashboardData>> }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="panel p-6">
        <p className="eyebrow">Income tracker</p>
        <h2 className="mt-2 text-2xl font-semibold">Record payment</h2>
        <form action={recordPayment} className="mt-5 space-y-3">
          <select className="field" name="propertyId" defaultValue={data.properties[0]?.id ?? ""}>
            {data.properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <select className="field" name="assignmentId" defaultValue="">
            <option value="">General payment</option>
            {data.paymentReadyAssignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.label}
              </option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" type="number" min="1" name="amount" placeholder="Amount in TZS" />
            <input className="field" type="date" name="paidOn" />
          </div>
          <select className="field" name="paymentMethod" defaultValue={PaymentMethod.CASH}>
            <option value={PaymentMethod.CASH}>Cash</option>
            <option value={PaymentMethod.MOBILE_MONEY}>Mobile money</option>
            <option value={PaymentMethod.BANK_TRANSFER}>Bank transfer</option>
          </select>
          <input className="field" name="reference" placeholder="Reference or control number" />
          <textarea className="field min-h-24" name="notes" placeholder="Payment notes" />
          <button className="primary-button w-full" type="submit">
            Save payment
          </button>
        </form>
      </div>

      <div className="panel p-6">
        <p className="eyebrow">Payment history</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {data.payments.map((payment) => (
            <div key={payment.id} className="rounded-[22px] bg-white/85 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-stone-900">{formatCurrency(payment.amount)}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    {payment.property.name} · {payment.assignment?.tenant.name ?? "General payment"}
                  </p>
                </div>
                <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-700">
                  {paymentMethodLabel(payment.paymentMethod)}
                </span>
              </div>
              <p className="mt-3 text-sm text-stone-600">
                {formatDate(payment.paidOn)} · recorded by {payment.recordedBy.name}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function InventorySection({ data }: { data: Awaited<ReturnType<typeof getAdminDashboardData>> }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="panel p-6">
        <p className="eyebrow">Inventory</p>
        <h2 className="mt-2 text-2xl font-semibold">Save stock item</h2>
        <form action={createInventoryItem} className="mt-4 space-y-3">
          <select className="field" name="propertyId" defaultValue={data.properties[0]?.id ?? ""}>
            {data.properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" name="name" placeholder="Item name" />
            <input className="field" type="number" min="1" name="quantity" placeholder="Quantity" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" type="number" min="0" name="unitCost" placeholder="Unit cost in TZS" />
            <input className="field" name="locationLabel" placeholder="Store location" />
          </div>
          <select className="field" name="status" defaultValue="IN_STOCK">
            <option value="IN_STOCK">In stock</option>
            <option value="LOW_STOCK">Low stock</option>
            <option value="USED_UP">Used up</option>
          </select>
          <textarea className="field min-h-20" name="notes" placeholder="Item notes" />
          <button className="primary-button w-full" type="submit">
            Save item
          </button>
        </form>
      </div>

      <div className="panel p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          {data.inventoryItems.map((item) => (
            <div key={item.id} className="rounded-[22px] bg-white/85 p-4">
              <p className="font-semibold text-stone-900">{item.name}</p>
              <p className="mt-1 text-sm text-stone-500">
                {item.property.name} · {item.quantity} pcs · {formatCurrency(item.unitCost)}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-stone-500">
                {inventoryStatusLabel(item.status)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExpensesSection({ data }: { data: Awaited<ReturnType<typeof getAdminDashboardData>> }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="panel p-6">
        <p className="eyebrow">Expenses</p>
        <h2 className="mt-2 text-2xl font-semibold">Save cost record</h2>
        <form action={createExpense} className="mt-4 space-y-3">
          <select className="field" name="propertyId" defaultValue={data.properties[0]?.id ?? ""}>
            {data.properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <input className="field" name="title" placeholder="Expense title" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" type="number" min="1" name="amount" placeholder="Amount in TZS" />
            <input className="field" type="date" name="spentOn" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="field" name="category" defaultValue="OTHER">
              <option value="UTILITIES">Utilities</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="REPAIR">Repair</option>
              <option value="STAFF">Staff</option>
              <option value="SUPPLIES">Supplies</option>
              <option value="OTHER">Other</option>
            </select>
            <input className="field" name="vendor" placeholder="Vendor or payee" />
          </div>
          <textarea className="field min-h-20" name="notes" placeholder="Expense notes" />
          <button className="primary-button w-full" type="submit">
            Save expense
          </button>
        </form>
      </div>

      <div className="panel p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          {data.expenses.map((expense) => (
            <div key={expense.id} className="rounded-[22px] bg-white/85 p-4">
              <p className="font-semibold text-stone-900">{expense.title}</p>
              <p className="mt-1 text-sm text-stone-500">
                {expense.property.name} · {formatCurrency(expense.amount)}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-stone-500">
                {expenseCategoryLabel(expense.category)} · {formatDate(expense.spentOn)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function RepairsSection({ data }: { data: Awaited<ReturnType<typeof getAdminDashboardData>> }) {
  return (
    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <div className="panel p-6">
        <p className="eyebrow">Repairs</p>
        <h2 className="mt-2 text-2xl font-semibold">Save repair record</h2>
        <form action={createRepairLog} className="mt-4 space-y-3">
          <select className="field" name="propertyId" defaultValue={data.properties[0]?.id ?? ""}>
            {data.properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.name}
              </option>
            ))}
          </select>
          <select className="field" name="unitId" defaultValue="">
            <option value="">Whole property</option>
            {data.properties.flatMap((property) =>
              property.units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {property.name} · {unit.name}
                </option>
              )),
            )}
          </select>
          <input className="field" name="issueTitle" placeholder="Repair title" />
          <textarea className="field min-h-24" name="details" placeholder="Repair details" />
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="field" name="status" defaultValue={RepairStatus.OPEN}>
              <option value={RepairStatus.OPEN}>Open</option>
              <option value={RepairStatus.IN_PROGRESS}>In progress</option>
              <option value={RepairStatus.RESOLVED}>Resolved</option>
            </select>
            <input className="field" type="date" name="reportedOn" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" type="number" min="0" name="estimatedCost" placeholder="Estimated cost" />
            <input className="field" type="number" min="0" name="actualCost" placeholder="Actual cost" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className="field" name="technician" placeholder="Technician" />
            <input className="field" type="date" name="resolvedOn" />
          </div>
          <button className="primary-button w-full" type="submit">
            Save repair record
          </button>
        </form>
      </div>

      <div className="panel p-6">
        <div className="grid gap-4 lg:grid-cols-2">
          {data.repairLogs.map((repair) => (
            <div key={repair.id} className="rounded-[22px] bg-white/85 p-4">
              <p className="font-semibold text-stone-900">{repair.issueTitle}</p>
              <p className="mt-1 text-sm text-stone-500">
                {repair.property.name}
                {repair.unit ? ` · ${repair.unit.name}` : ""}
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.2em] text-stone-500">
                {repairStatusLabel(repair.status)} · {formatDate(repair.reportedOn)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function SimpleUnitCard({
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
    sizeLabel: string | null;
    furnishings: string | null;
    leaseAssignments: Array<{
      tenant: { name: string };
      endDate: Date;
    }>;
  };
  propertyName: string;
}) {
  const activeLease = unit.leaseAssignments[0];

  return (
    <article className="rounded-[24px] border border-stone-200 bg-white/90 p-4">
      <UnitBlueprint type={unit.type} />
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700">
          {unitTypeLabel(unit.type)}
        </span>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-700">
          {formatUnitStatus(unit.status)}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold text-stone-900">{unit.name}</h3>
      <UnitFacts
        type={unit.type}
        propertyName={propertyName}
        floorLabel={unit.floorLabel}
        finalLabel={
          activeLease
            ? `${activeLease.tenant.name} until ${formatDate(activeLease.endDate)}`
            : "Vacant now"
        }
      />
      <div className="mt-4 rounded-[20px] bg-stone-50 p-4">
        <p className="text-xs uppercase tracking-[0.22em] text-stone-500">Monthly price</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-2xl font-semibold text-stone-900">{formatCurrency(unit.monthlyRent)}</p>
          <div className="rounded-2xl bg-white p-2 text-sky-700 shadow-sm">
            {unit.type === UnitType.HOUSE ? (
              <House className="size-4" />
            ) : unit.type === UnitType.MASTER_BEDROOM ? (
              <ShowerHead className="size-4" />
            ) : (
              <DoorClosed className="size-4" />
            )}
          </div>
        </div>
        <form action={updateUnitPricing} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <input type="hidden" name="unitId" value={unit.id} />
          <input className="field" type="number" min="1" name="monthlyRent" defaultValue={unit.monthlyRent} />
          <button className="primary-button sm:min-w-32" type="submit">
            <BadgeDollarSign className="mr-2 size-4" />
            Save
          </button>
        </form>
      </div>
    </article>
  );
}

function formatUnitStatus(status: string) {
  return status.replaceAll("_", " ").toLowerCase();
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

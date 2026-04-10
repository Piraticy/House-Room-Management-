import Link from "next/link";
import {
  BellRing,
  Building2,
  CalendarRange,
  CircleDollarSign,
  DoorOpen,
  Home,
  Megaphone,
  MessageSquareMore,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import { Audience, LeaseStatus, Role } from "@prisma/client";
import {
  createLeaseAssignment,
  publishAnnouncement,
  sendMessage,
  updateLeaseEndDate,
  updateUnitPricing,
} from "@/app/actions";
import {
  formatCurrency,
  formatDate,
  getDashboardData,
  unitTypeLabel,
} from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    role?: string;
    viewer?: string;
  }>;
};

const roleOptions = [
  {
    key: Role.ADMIN,
    label: "Admin",
    summary: "Assign rooms, set pricing, and control stay dates.",
    icon: ShieldCheck,
  },
  {
    key: Role.OWNER,
    label: "Owner",
    summary: "Share announcements and message tenants directly.",
    icon: Megaphone,
  },
  {
    key: Role.TENANT,
    label: "Tenant",
    summary: "Track your room, notifications, and inbox.",
    icon: BellRing,
  },
] as const;

function normalizeRole(value?: string) {
  if (value?.toUpperCase() === Role.OWNER) {
    return Role.OWNER;
  }

  if (value?.toUpperCase() === Role.TENANT) {
    return Role.TENANT;
  }

  return Role.ADMIN;
}

function buildRoleHref(role: Role, viewer?: string) {
  const params = new URLSearchParams();
  params.set("role", role.toLowerCase());

  if (viewer) {
    params.set("viewer", viewer);
  }

  return `/?${params.toString()}`;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const dashboard = await getDashboardData();
  const currentRole = normalizeRole(params.role);
  const viewers = dashboard.usersByRole[currentRole];
  const currentViewer = viewers.find((viewer) => viewer.id === params.viewer) ?? viewers[0];

  const tenantAlerts =
    currentRole === Role.TENANT && currentViewer
      ? dashboard.dueSoonAlerts.filter((alert) => alert.tenantId === currentViewer.id)
      : dashboard.dueSoonAlerts;

  const visibleMessages =
    currentRole === Role.TENANT && currentViewer
      ? dashboard.messages.filter((message) => message.recipientId === currentViewer.id)
      : currentRole === Role.OWNER && currentViewer
        ? dashboard.messages.filter((message) => message.senderId === currentViewer.id)
        : dashboard.messages;

  const visibleAnnouncements =
    currentRole === Role.TENANT
      ? dashboard.announcements.filter(
          (announcement) => announcement.audience !== Audience.OWNER_ONLY,
        )
      : dashboard.announcements;

  const vacantUnits = dashboard.properties.flatMap((property) =>
    property.units
      .filter((unit) => unit.leaseAssignments.length === 0)
      .map((unit) => ({
        id: unit.id,
        label: `${property.name} · ${unit.name}`,
      })),
  );
  const currentTenantAssignment =
    currentRole === Role.TENANT && currentViewer
      ? dashboard.assignments.find(
          (assignment) =>
            assignment.tenantId === currentViewer.id &&
            (assignment.status === LeaseStatus.ACTIVE ||
              assignment.status === LeaseStatus.UPCOMING),
        )
      : null;

  return (
    <main className="relative overflow-hidden px-4 py-6 text-stone-900 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="panel-strong relative overflow-hidden p-6 sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-2/5 bg-[radial-gradient(circle_at_top,rgba(15,118,110,0.22),transparent_58%),radial-gradient(circle_at_bottom,rgba(245,158,11,0.18),transparent_48%)] lg:block" />
          <div className="relative flex flex-col gap-8">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="eyebrow">Harbor Stay Control Center</p>
                <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
                  A connected rent management starter for houses, master bedrooms,
                  and normal rooms.
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600 sm:text-lg">
                  This starter app lets admins assign stays and update pricing,
                  gives owners a direct communication channel to tenants, and
                  surfaces in-app due alerts two months before rent expires.
                </p>
              </div>

              <div className="grid min-w-full gap-3 sm:grid-cols-2 lg:min-w-[320px] lg:max-w-sm">
                <MetricCard
                  icon={Building2}
                  label="Properties"
                  value={String(dashboard.stats.propertyCount)}
                  detail="Ready for owner oversight"
                />
                <MetricCard
                  icon={DoorOpen}
                  label="Occupancy"
                  value={`${dashboard.stats.occupancyRate}%`}
                  detail={`${dashboard.stats.occupiedCount}/${dashboard.stats.unitCount} spaces filled`}
                />
                <MetricCard
                  icon={CircleDollarSign}
                  label="Monthly rent"
                  value={formatCurrency(dashboard.stats.totalMonthlyRevenue)}
                  detail="Current active income"
                />
                <MetricCard
                  icon={BellRing}
                  label="Due soon"
                  value={String(dashboard.stats.dueSoonCount)}
                  detail="Notifications inside 60 days"
                />
              </div>
            </div>

            <div className="panel grid gap-4 p-4 sm:p-5 lg:grid-cols-[1.5fr_1fr]">
              <div>
                <p className="eyebrow">Demo Access</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  {roleOptions.map((role) => {
                    const Icon = role.icon;
                    const isActive = currentRole === role.key;
                    return (
                      <Link
                        key={role.key}
                        href={buildRoleHref(role.key, dashboard.usersByRole[role.key][0]?.id)}
                        className={cn(
                          "flex min-w-[190px] flex-1 items-start gap-3 rounded-[24px] border px-4 py-4 transition",
                          isActive
                            ? "border-teal-700 bg-teal-900 text-white shadow-lg shadow-teal-900/20"
                            : "border-stone-200 bg-white/75 text-stone-800 hover:border-stone-300 hover:bg-white",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 rounded-2xl p-2",
                            isActive ? "bg-white/15" : "bg-stone-100",
                          )}
                        >
                          <Icon className="size-4" />
                        </span>
                        <span className="block">
                          <span className="block text-sm font-semibold">{role.label}</span>
                          <span
                            className={cn(
                              "mt-1 block text-sm leading-6",
                              isActive ? "text-white/80" : "text-stone-500",
                            )}
                          >
                            {role.summary}
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="eyebrow">Preview User</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {viewers.map((viewer) => (
                    <Link
                      key={viewer.id}
                      href={buildRoleHref(currentRole, viewer.id)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition",
                        currentViewer?.id === viewer.id
                          ? "border-amber-500 bg-amber-500 text-white"
                          : "border-stone-200 bg-white/80 text-stone-700 hover:border-stone-300 hover:bg-white",
                      )}
                    >
                      {viewer.name}
                    </Link>
                  ))}
                </div>
                <div className="mt-4 rounded-[24px] bg-stone-900 px-5 py-4 text-white">
                  <p className="text-sm font-medium text-stone-300">Signed in preview</p>
                  <p className="mt-2 text-xl font-semibold">
                    {currentViewer?.name ?? "No viewer available"}
                  </p>
                  <p className="mt-1 text-sm text-stone-300">
                    {currentViewer?.email ?? "Add seed data to preview a role"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.95fr]">
          <div className="panel p-6 sm:p-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">Portfolio</p>
                <h2 className="mt-2 text-2xl font-semibold">Property and room pricing</h2>
              </div>
              <div className="rounded-full border border-amber-200 bg-amber-100/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-amber-800">
                Prices editable any time
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {dashboard.properties.map((property) => (
                <article key={property.id} className="rounded-[28px] border border-stone-200/80 bg-white/85 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{property.name}</h3>
                      <p className="mt-1 text-sm text-stone-500">{property.location}</p>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
                        {property.description}
                      </p>
                    </div>
                    <div className="rounded-[24px] bg-stone-900 px-4 py-3 text-white">
                      <p className="text-xs uppercase tracking-[0.24em] text-stone-300">Owner</p>
                      <p className="mt-1 font-semibold">{property.owner.name}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4">
                    {property.units.map((unit) => {
                      const activeLease = unit.leaseAssignments[0];

                      return (
                        <div
                          key={unit.id}
                          className="grid gap-4 rounded-[24px] border border-stone-200/70 bg-stone-50/80 p-4 lg:grid-cols-[1.1fr_0.9fr]"
                        >
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
                                {unitTypeLabel(unit.type)}
                              </span>
                              <span className="rounded-full bg-stone-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white">
                                {unit.status}
                              </span>
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold">{unit.name}</h4>
                              <p className="text-sm text-stone-500">
                                {unit.floorLabel ?? "Flexible floor"} · Capacity {unit.capacity} ·{" "}
                                {unit.isPrivateBath ? "Private bath" : "Shared bath"}
                              </p>
                            </div>
                            <p className="text-sm leading-6 text-stone-600">
                              {activeLease
                                ? `${activeLease.tenant.name} is ${
                                    activeLease.startDate > new Date() ? "scheduled" : "staying"
                                  } here until ${formatDate(activeLease.endDate)}.`
                                : "Vacant and ready for a new assignment."}
                            </p>
                          </div>

                          <div className="rounded-[22px] bg-white p-4 shadow-sm">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                                  Monthly rent
                                </p>
                                <p className="mt-2 text-2xl font-semibold text-stone-900">
                                  {formatCurrency(unit.monthlyRent)}
                                </p>
                              </div>
                              <div className="rounded-2xl bg-amber-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                                Admin editable
                              </div>
                            </div>

                            {currentRole === Role.ADMIN ? (
                              <form action={updateUnitPricing} className="mt-4 flex flex-col gap-3 sm:flex-row">
                                <input type="hidden" name="unitId" value={unit.id} />
                                <input
                                  className="field"
                                  type="number"
                                  min="1"
                                  name="monthlyRent"
                                  defaultValue={unit.monthlyRent}
                                  aria-label={`Update monthly rent for ${unit.name}`}
                                />
                                <button className="primary-button sm:min-w-36" type="submit">
                                  Save price
                                </button>
                              </form>
                            ) : (
                              <p className="mt-4 text-sm text-stone-500">
                                Admin can update pricing here when market rates change.
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {currentTenantAssignment ? (
              <div className="panel p-6">
                <p className="eyebrow">Tenant Stay</p>
                <h2 className="mt-2 text-2xl font-semibold">Your assigned space</h2>
                <div className="mt-5 rounded-[24px] bg-stone-950 p-5 text-white">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-200">
                      {currentTenantAssignment.status}
                    </span>
                    <span className="rounded-full bg-amber-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300">
                      {unitTypeLabel(currentTenantAssignment.unit.type)}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold">
                    {currentTenantAssignment.unit.name}
                  </h3>
                  <p className="mt-2 text-sm text-stone-300">
                    {currentTenantAssignment.unit.property.name} ·{" "}
                    {formatCurrency(currentTenantAssignment.unit.monthlyRent)} monthly
                  </p>
                  <p className="mt-4 text-sm leading-6 text-stone-300">
                    Stay window: {formatDate(currentTenantAssignment.startDate)} to{" "}
                    {formatDate(currentTenantAssignment.endDate)}.
                  </p>
                </div>
              </div>
            ) : null}

            <div className="panel p-6">
              <p className="eyebrow">Notification Center</p>
              <div className="mt-3 flex items-start gap-3">
                <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                  <BellRing className="size-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Rent due alerts</h2>
                  <p className="mt-2 text-sm leading-6 text-stone-600">
                    Tenants receive in-app reminders once a stay is within 60 days of its end date.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {tenantAlerts.length > 0 ? (
                  tenantAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-[22px] border border-amber-200 bg-amber-50/80 p-4"
                    >
                      <p className="text-sm font-semibold text-amber-900">
                        {currentRole === Role.TENANT ? "Your stay" : alert.tenantName}
                      </p>
                      <p className="mt-1 text-sm text-amber-800">
                        {alert.unitName} at {alert.propertyName} is due on {formatDate(alert.dueDate)}.
                      </p>
                      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
                        {alert.daysRemaining} days remaining
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-dashed border-stone-300 bg-white/70 p-4 text-sm text-stone-500">
                    No due-soon notifications in the next two months.
                  </div>
                )}
              </div>
            </div>

            <div className="panel p-6">
              <p className="eyebrow">Recent Feed</p>
              <h2 className="mt-2 text-2xl font-semibold">Owner updates and inbox</h2>

              <div className="mt-5 space-y-3">
                {visibleAnnouncements.map((announcement) => (
                  <div key={announcement.id} className="rounded-[22px] bg-white/80 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-900">{announcement.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
                          {announcement.author.name} · {formatDate(announcement.createdAt)}
                        </p>
                      </div>
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-600">
                        {announcement.audience}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-stone-600">{announcement.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-[24px] border border-stone-200/80 bg-stone-950 p-5 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-stone-400">Messages</p>
                <div className="mt-4 space-y-3">
                  {visibleMessages.length > 0 ? (
                    visibleMessages.slice(0, 4).map((message) => (
                      <div key={message.id} className="rounded-[20px] bg-white/8 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold">{message.subject}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-stone-400">
                              {message.sender.name} to {message.recipient.name}
                            </p>
                          </div>
                          <span className="text-xs text-stone-400">
                            {formatDate(message.createdAt)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-stone-300">{message.body}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-[20px] bg-white/8 p-4 text-sm text-stone-300">
                      No messages yet for this preview.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="panel p-6 xl:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">Admin Workspace</p>
                <h2 className="mt-2 text-2xl font-semibold">Assign units and control stay length</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                  Admin is the only role that can assign a tenant to a house, master bedroom,
                  or normal room and decide how long the stay will run.
                </p>
              </div>
              <div className="rounded-[22px] bg-teal-900 px-4 py-3 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-teal-100/70">Active stays</p>
                <p className="mt-1 text-2xl font-semibold">{dashboard.activeAssignments.length}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              {currentRole === Role.ADMIN ? (
                <form action={createLeaseAssignment} className="rounded-[28px] bg-stone-950 p-5 text-white">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-400">
                    New assignment
                  </p>
                  <input
                    type="hidden"
                    name="assignedById"
                    value={dashboard.usersByRole.ADMIN[0]?.id ?? ""}
                  />
                  <div className="mt-4 space-y-3">
                    <select className="field bg-white text-stone-900" name="unitId" defaultValue="">
                      <option value="" disabled>
                        Select vacant house or room
                      </option>
                      {vacantUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.label}
                        </option>
                      ))}
                    </select>

                    <select className="field bg-white text-stone-900" name="tenantId" defaultValue="">
                      <option value="" disabled>
                        Select tenant
                      </option>
                      {dashboard.usersByRole.TENANT.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </option>
                      ))}
                    </select>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <input className="field bg-white text-stone-900" type="date" name="startDate" />
                      <input className="field bg-white text-stone-900" type="date" name="endDate" />
                    </div>

                    <input
                      className="field bg-white text-stone-900"
                      type="number"
                      min="0"
                      name="securityDeposit"
                      placeholder="Security deposit"
                    />
                    <textarea
                      className="field min-h-28 bg-white text-stone-900"
                      name="notes"
                      placeholder="Move-in notes, payment confirmation, or special instructions"
                    />
                    <button className="primary-button w-full" type="submit">
                      Assign stay
                    </button>
                  </div>
                </form>
              ) : (
                <div className="rounded-[28px] bg-stone-950 p-5 text-white">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-400">
                    Admin-only controls
                  </p>
                  <h3 className="mt-4 text-2xl font-semibold">Assignment tools are locked</h3>
                  <p className="mt-3 text-sm leading-6 text-stone-300">
                    Switch to the Admin preview to assign a tenant, choose their room,
                    and decide how long they will stay.
                  </p>
                </div>
              )}

              <div className="space-y-4">
                {dashboard.assignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-[26px] border border-stone-200/80 bg-white/90 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">
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
                          {assignment.unit.property.name} · assigned by {assignment.assignedBy.name}
                        </p>
                        <p className="mt-3 text-sm leading-6 text-stone-600">
                          {formatDate(assignment.startDate)} to {formatDate(assignment.endDate)} ·
                          Deposit {formatCurrency(assignment.securityDeposit)}
                        </p>
                      </div>

                      {currentRole === Role.ADMIN ? (
                        <form action={updateLeaseEndDate} className="w-full max-w-xs rounded-[22px] bg-stone-50 p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                            Update leave date
                          </p>
                          <input type="hidden" name="assignmentId" value={assignment.id} />
                          <input
                            className="field mt-3"
                            type="date"
                            name="endDate"
                            defaultValue={assignment.endDate.toISOString().slice(0, 10)}
                          />
                          <button className="secondary-button mt-3 w-full" type="submit">
                            Save stay length
                          </button>
                        </form>
                      ) : (
                        <div className="w-full max-w-xs rounded-[22px] bg-stone-50 p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-stone-500">
                            Admin-only update
                          </p>
                          <p className="mt-3 text-sm leading-6 text-stone-600">
                            Stay length changes are restricted to the admin dashboard.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel p-6">
            <p className="eyebrow">Communication Center</p>
            <h2 className="mt-2 text-2xl font-semibold">Owner to tenant connection</h2>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              Owners can post announcements to all tenants and send direct messages for rent,
              maintenance, and move-in support.
            </p>

            <div className="mt-6 space-y-5">
              {currentRole === Role.OWNER ? (
                <>
                  <form action={publishAnnouncement} className="rounded-[24px] bg-white/90 p-4">
                    <p className="text-sm font-semibold">Share announcement</p>
                    <input
                      type="hidden"
                      name="authorId"
                      value={dashboard.usersByRole.OWNER[0]?.id ?? ""}
                    />
                    <input
                      type="hidden"
                      name="propertyId"
                      value={dashboard.properties[0]?.id ?? ""}
                    />
                    <div className="mt-3 space-y-3">
                      <input className="field" name="title" placeholder="Announcement title" />
                      <select className="field" name="audience" defaultValue="TENANTS">
                        <option value="TENANTS">Tenants</option>
                        <option value="OWNER_ONLY">Owner only</option>
                      </select>
                      <textarea
                        className="field min-h-28"
                        name="body"
                        placeholder="Write an update about rent reminders, maintenance, or house rules"
                      />
                      <button className="primary-button w-full" type="submit">
                        Publish announcement
                      </button>
                    </div>
                  </form>

                  <form action={sendMessage} className="rounded-[24px] bg-stone-950 p-4 text-white">
                    <p className="text-sm font-semibold">Send direct tenant message</p>
                    <input
                      type="hidden"
                      name="senderId"
                      value={dashboard.usersByRole.OWNER[0]?.id ?? ""}
                    />
                    <input
                      type="hidden"
                      name="propertyId"
                      value={dashboard.properties[0]?.id ?? ""}
                    />
                    <div className="mt-3 space-y-3">
                      <select className="field bg-white text-stone-900" name="recipientId" defaultValue="">
                        <option value="" disabled>
                          Choose tenant
                        </option>
                        {dashboard.usersByRole.TENANT.map((tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name}
                          </option>
                        ))}
                      </select>
                      <input
                        className="field bg-white text-stone-900"
                        name="subject"
                        placeholder="Message subject"
                      />
                      <textarea
                        className="field min-h-28 bg-white text-stone-900"
                        name="body"
                        placeholder="Type the message the tenant should receive in the app"
                      />
                      <button className="primary-button w-full" type="submit">
                        Send message
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="rounded-[24px] bg-stone-950 p-5 text-white">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-stone-400">
                    Owner-only communication
                  </p>
                  <p className="mt-3 text-sm leading-6 text-stone-300">
                    Switch to the Owner preview to publish announcements or send a tenant
                    message through the app.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <HighlightCard
            icon={Home}
            title="House, Master, Normal"
            description="Each unit type carries its own editable rent and assignment flow."
          />
          <HighlightCard
            icon={UserRoundCheck}
            title="Admin controls stays"
            description="Only admins assign houses or rooms and decide start and end dates."
          />
          <HighlightCard
            icon={MessageSquareMore}
            title="Owner communication"
            description="Owners post updates and message tenants from one connected feed."
          />
          <HighlightCard
            icon={CalendarRange}
            title="Two-month alerts"
            description="Tenants see due reminders in-app before the rent period expires."
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

function HighlightCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <article className="panel p-5">
      <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
    </article>
  );
}

import { LeaseStatus, Role, UnitType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function daysUntil(targetDate: Date) {
  const now = new Date();
  const difference = targetDate.getTime() - now.getTime();
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

export function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

export function formatDate(date: Date) {
  return dateFormatter.format(date);
}

export function unitTypeLabel(unitType: UnitType) {
  switch (unitType) {
    case UnitType.HOUSE:
      return "House";
    case UnitType.MASTER_BEDROOM:
      return "Master Bedroom";
    case UnitType.NORMAL_ROOM:
      return "Normal Room";
    default:
      return unitType;
  }
}

export async function getDashboardData() {
  const [users, properties, assignments, announcements, messages] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.property.findMany({
      include: {
        owner: true,
        units: {
          include: {
            leaseAssignments: {
              where: {
                status: {
                  in: [LeaseStatus.ACTIVE, LeaseStatus.UPCOMING],
                },
              },
              orderBy: {
                endDate: "asc",
              },
              take: 1,
              include: {
                tenant: true,
              },
            },
          },
          orderBy: {
            monthlyRent: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
    prisma.leaseAssignment.findMany({
      include: {
        tenant: true,
        assignedBy: true,
        unit: {
          include: {
            property: true,
          },
        },
      },
      orderBy: {
        endDate: "asc",
      },
    }),
    prisma.announcement.findMany({
      include: {
        author: true,
        property: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 6,
    }),
    prisma.message.findMany({
      include: {
        sender: true,
        recipient: true,
        property: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
  ]);

  const usersByRole = {
    ADMIN: users.filter((user) => user.role === Role.ADMIN),
    OWNER: users.filter((user) => user.role === Role.OWNER),
    TENANT: users.filter((user) => user.role === Role.TENANT),
  } as const;

  const activeAssignments = assignments.filter(
    (assignment) => assignment.status === LeaseStatus.ACTIVE,
  );
  const upcomingAssignments = assignments.filter(
    (assignment) => assignment.status === LeaseStatus.UPCOMING,
  );

  const dueSoonAlerts = activeAssignments
    .map((assignment) => {
      const daysRemaining = daysUntil(assignment.endDate);
      return {
        id: assignment.id,
        tenantId: assignment.tenantId,
        tenantName: assignment.tenant.name,
        unitName: assignment.unit.name,
        propertyName: assignment.unit.property.name,
        dueDate: assignment.endDate,
        daysRemaining,
      };
    })
    .filter((alert) => alert.daysRemaining >= 0 && alert.daysRemaining <= 60);

  const totalMonthlyRevenue = activeAssignments.reduce(
    (sum, assignment) => sum + assignment.unit.monthlyRent,
    0,
  );

  const unitCount = properties.reduce((sum, property) => sum + property.units.length, 0);
  const occupiedCount = properties.reduce(
    (sum, property) =>
      sum + property.units.filter((unit) => unit.leaseAssignments.length > 0).length,
    0,
  );

  return {
    users,
    usersByRole,
    properties,
    assignments,
    activeAssignments,
    upcomingAssignments,
    announcements,
    messages,
    dueSoonAlerts,
    stats: {
      propertyCount: properties.length,
      unitCount,
      occupiedCount,
      occupancyRate: unitCount === 0 ? 0 : Math.round((occupiedCount / unitCount) * 100),
      totalMonthlyRevenue,
      dueSoonCount: dueSoonAlerts.length,
      activeTenantCount: activeAssignments.length,
    },
  };
}

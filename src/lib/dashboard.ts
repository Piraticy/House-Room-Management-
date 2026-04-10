import {
  Audience,
  ExpenseCategory,
  InventoryStatus,
  LeaseStatus,
  PaymentMethod,
  RepairStatus,
  Role,
  UnitType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

const currencyFormatter = new Intl.NumberFormat("sw-TZ", {
  style: "currency",
  currency: "TZS",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("en-TZ", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const activeAssignmentStatuses = [LeaseStatus.ACTIVE, LeaseStatus.UPCOMING];

function daysUntil(targetDate: Date) {
  const now = new Date();
  const difference = targetDate.getTime() - now.getTime();
  return Math.ceil(difference / (1000 * 60 * 60 * 24));
}

function buildDueSoonAlerts<
  T extends {
    id: string;
    tenantId: string;
    endDate: Date;
    tenant: { name: string };
    unit: { name: string; property: { name: string } };
  },
>(assignments: T[]) {
  return assignments
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
}

async function getPropertyPortfolio(where?: { ownerId?: string }) {
  return prisma.property.findMany({
    where,
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      units: {
        include: {
          leaseAssignments: {
            where: {
              status: {
                in: activeAssignmentStatuses,
              },
            },
            include: {
              tenant: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: {
              endDate: "asc",
            },
            take: 1,
          },
        },
        orderBy: [{ type: "asc" }, { monthlyRent: "desc" }],
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

async function getAssignments(where?: {
  tenantId?: string;
  unit?: {
    property?: {
      ownerId?: string;
    };
  };
  status?: {
    in: LeaseStatus[];
  };
}) {
  return prisma.leaseAssignment.findMany({
    where,
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      assignedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      unit: {
        include: {
          property: {
            include: {
              owner: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      payments: true,
    },
    orderBy: {
      endDate: "asc",
    },
  });
}

async function getPayments(where?: {
  property?: {
    ownerId?: string;
  };
  propertyId?: {
    in: string[];
  };
}) {
  return prisma.payment.findMany({
    where,
    include: {
      property: true,
      assignment: {
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
            },
          },
          unit: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      recordedBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      paidOn: "desc",
    },
  });
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

export function unitUseLabel(unitType: UnitType) {
  switch (unitType) {
    case UnitType.HOUSE:
      return "Whole house";
    case UnitType.MASTER_BEDROOM:
      return "Attached washroom";
    case UnitType.NORMAL_ROOM:
    default:
      return "Room only";
  }
}

export function unitSetupLabel(unitType: UnitType) {
  switch (unitType) {
    case UnitType.HOUSE:
      return "House plan";
    case UnitType.MASTER_BEDROOM:
      return "Master room plan";
    case UnitType.NORMAL_ROOM:
    default:
      return "Room plan";
  }
}

export function paymentMethodLabel(method: PaymentMethod) {
  switch (method) {
    case PaymentMethod.MOBILE_MONEY:
      return "Mobile money";
    case PaymentMethod.BANK_TRANSFER:
      return "Bank transfer";
    case PaymentMethod.CASH:
    default:
      return "Cash";
  }
}

export function inventoryStatusLabel(status: InventoryStatus) {
  switch (status) {
    case InventoryStatus.IN_STOCK:
      return "In stock";
    case InventoryStatus.LOW_STOCK:
      return "Low stock";
    case InventoryStatus.USED_UP:
      return "Used up";
    default:
      return status;
  }
}

export function expenseCategoryLabel(category: ExpenseCategory) {
  switch (category) {
    case ExpenseCategory.UTILITIES:
      return "Utilities";
    case ExpenseCategory.MAINTENANCE:
      return "Maintenance";
    case ExpenseCategory.REPAIR:
      return "Repair";
    case ExpenseCategory.STAFF:
      return "Staff";
    case ExpenseCategory.SUPPLIES:
      return "Supplies";
    case ExpenseCategory.OTHER:
    default:
      return "Other";
  }
}

export function repairStatusLabel(status: RepairStatus) {
  switch (status) {
    case RepairStatus.OPEN:
      return "Open";
    case RepairStatus.IN_PROGRESS:
      return "In progress";
    case RepairStatus.RESOLVED:
      return "Resolved";
    default:
      return status;
  }
}

export async function getOverviewData() {
  const [properties, assignments, payments, expenses] = await Promise.all([
    getPropertyPortfolio(),
    getAssignments({
      status: {
        in: activeAssignmentStatuses,
      },
    }),
    getPayments(),
    prisma.expense.findMany(),
  ]);

  const unitCount = properties.reduce((sum, property) => sum + property.units.length, 0);
  const occupiedCount = properties.reduce(
    (sum, property) =>
      sum + property.units.filter((unit) => unit.leaseAssignments.length > 0).length,
    0,
  );
  const totalIncome = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return {
    propertyCount: properties.length,
    unitCount,
    occupancyRate: unitCount === 0 ? 0 : Math.round((occupiedCount / unitCount) * 100),
    totalIncome,
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
    activeTenantCount: assignments.filter(
      (assignment) => assignment.status === LeaseStatus.ACTIVE,
    ).length,
  };
}

export async function getAdminDashboardData() {
  const [properties, assignments, tenants, payments, inventoryItems, expenses, repairLogs] =
    await Promise.all([
      getPropertyPortfolio(),
      getAssignments(),
      prisma.user.findMany({
        where: {
          role: Role.TENANT,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
      getPayments(),
      prisma.inventoryItem.findMany({
        include: {
          property: true,
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      }),
      prisma.expense.findMany({
        include: {
          property: true,
        },
        orderBy: {
          spentOn: "desc",
        },
      }),
      prisma.repairLog.findMany({
        include: {
          property: true,
          unit: true,
        },
        orderBy: {
          reportedOn: "desc",
        },
      }),
    ]);

  const activeAssignments = assignments.filter(
    (assignment) => assignment.status === LeaseStatus.ACTIVE,
  );
  const totalIncome = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return {
    properties,
    assignments,
    tenants,
    payments,
    inventoryItems,
    expenses,
    repairLogs,
    vacantUnits: properties.flatMap((property) =>
      property.units
        .filter((unit) => unit.leaseAssignments.length === 0)
        .map((unit) => ({
          id: unit.id,
          label: `${property.name} · ${unit.name}`,
        })),
    ),
    paymentReadyAssignments: activeAssignments.map((assignment) => ({
      id: assignment.id,
      label: `${assignment.tenant.name} · ${assignment.unit.name}`,
      propertyId: assignment.unit.property.id,
    })),
    dueSoonAlerts: buildDueSoonAlerts(activeAssignments),
    stats: {
      propertyCount: properties.length,
      activeLeaseCount: activeAssignments.length,
      vacantUnitCount: properties.flatMap((property) => property.units).filter(
        (unit) => unit.leaseAssignments.length === 0,
      ).length,
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
      openRepairCount: repairLogs.filter((repair) => repair.status !== RepairStatus.RESOLVED)
        .length,
    },
  };
}

export async function getOwnerDashboardData(ownerId: string) {
  const [properties, assignments, announcements, messages, tenants, payments, expenses] =
    await Promise.all([
      getPropertyPortfolio({ ownerId }),
      getAssignments({
        unit: {
          property: {
            ownerId,
          },
        },
      }),
      prisma.announcement.findMany({
        where: {
          property: {
            ownerId,
          },
        },
        include: {
          property: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      }),
      prisma.message.findMany({
        where: {
          senderId: ownerId,
        },
        include: {
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          property: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 8,
      }),
      prisma.user.findMany({
        where: {
          role: Role.TENANT,
          tenantAssignments: {
            some: {
              unit: {
                property: {
                  ownerId,
                },
              },
              status: {
                in: activeAssignmentStatuses,
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: {
          name: "asc",
        },
      }),
      getPayments({
        property: {
          ownerId,
        },
      }),
      prisma.expense.findMany({
        where: {
          property: {
            ownerId,
          },
        },
      }),
    ]);

  const activeAssignments = assignments.filter(
    (assignment) => assignment.status === LeaseStatus.ACTIVE,
  );
  const totalIncome = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return {
    properties,
    announcements,
    messages,
    tenants,
    payments,
    dueSoonAlerts: buildDueSoonAlerts(activeAssignments),
    stats: {
      propertyCount: properties.length,
      tenantCount: activeAssignments.length,
      announcementCount: announcements.length,
      totalIncome,
      totalExpenses,
      netIncome: totalIncome - totalExpenses,
    },
  };
}

export async function getTenantDashboardData(tenantId: string) {
  const assignments = await getAssignments({
    tenantId,
    status: {
      in: activeAssignmentStatuses,
    },
  });

  const propertyIds = Array.from(
    new Set(assignments.map((assignment) => assignment.unit.property.id)),
  );
  const currentAssignment =
    assignments.find((assignment) => assignment.status === LeaseStatus.ACTIVE) ??
    assignments.find((assignment) => assignment.status === LeaseStatus.UPCOMING) ??
    null;

  const [announcements, messages, payments] = await Promise.all([
    prisma.announcement.findMany({
      where: {
        propertyId: {
          in: propertyIds.length > 0 ? propertyIds : ["missing-property"],
        },
        audience: {
          in: [Audience.TENANTS, Audience.EVERYONE],
        },
      },
      include: {
        property: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
    prisma.message.findMany({
      where: {
        recipientId: tenantId,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        property: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 8,
    }),
    prisma.payment.findMany({
      where: {
        assignment: {
          tenantId,
        },
      },
      include: {
        property: true,
      },
      orderBy: {
        paidOn: "desc",
      },
      take: 6,
    }),
  ]);

  const dueSoonAlerts = buildDueSoonAlerts(
    assignments.filter((assignment) => assignment.status === LeaseStatus.ACTIVE),
  );

  return {
    currentAssignment,
    announcements,
    messages,
    payments,
    dueSoonAlerts,
    stats: {
      inboxCount: messages.length,
      announcementCount: announcements.length,
      activeStayCount: assignments.filter(
        (assignment) => assignment.status === LeaseStatus.ACTIVE,
      ).length,
      nextDueCount: dueSoonAlerts.length,
      paidAmount: payments.reduce((sum, payment) => sum + payment.amount, 0),
    },
  };
}

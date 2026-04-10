"use server";

import {
  Audience,
  ExpenseCategory,
  InventoryStatus,
  LeaseStatus,
  PaymentMethod,
  RepairStatus,
  Role,
  UnitStatus,
  UnitType,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

function asString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: FormDataEntryValue | null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function asDate(value: FormDataEntryValue | null) {
  const textValue = asString(value);
  const parsedDate = new Date(textValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function resolveLeaseStatus(startDate: Date, endDate: Date) {
  const now = new Date();

  if (endDate < now) {
    return LeaseStatus.COMPLETED;
  }

  if (startDate > now) {
    return LeaseStatus.UPCOMING;
  }

  return LeaseStatus.ACTIVE;
}

function resolveUnitType(value: string) {
  if (value === UnitType.HOUSE) return UnitType.HOUSE;
  if (value === UnitType.MASTER_BEDROOM) return UnitType.MASTER_BEDROOM;
  return UnitType.NORMAL_ROOM;
}

function resolvePaymentMethod(value: string) {
  if (value === PaymentMethod.BANK_TRANSFER) return PaymentMethod.BANK_TRANSFER;
  if (value === PaymentMethod.MOBILE_MONEY) return PaymentMethod.MOBILE_MONEY;
  return PaymentMethod.CASH;
}

function resolveInventoryStatus(value: string) {
  if (value === InventoryStatus.LOW_STOCK) return InventoryStatus.LOW_STOCK;
  if (value === InventoryStatus.USED_UP) return InventoryStatus.USED_UP;
  return InventoryStatus.IN_STOCK;
}

function resolveExpenseCategory(value: string) {
  if (value === ExpenseCategory.UTILITIES) return ExpenseCategory.UTILITIES;
  if (value === ExpenseCategory.MAINTENANCE) return ExpenseCategory.MAINTENANCE;
  if (value === ExpenseCategory.REPAIR) return ExpenseCategory.REPAIR;
  if (value === ExpenseCategory.STAFF) return ExpenseCategory.STAFF;
  if (value === ExpenseCategory.SUPPLIES) return ExpenseCategory.SUPPLIES;
  return ExpenseCategory.OTHER;
}

function resolveRepairStatus(value: string) {
  if (value === RepairStatus.IN_PROGRESS) return RepairStatus.IN_PROGRESS;
  if (value === RepairStatus.RESOLVED) return RepairStatus.RESOLVED;
  return RepairStatus.OPEN;
}

function defaultCapacityForType(type: UnitType) {
  if (type === UnitType.HOUSE) return 4;
  if (type === UnitType.MASTER_BEDROOM) return 2;
  return 1;
}

function defaultSizeLabelForType(type: UnitType) {
  if (type === UnitType.HOUSE) return "Whole house";
  if (type === UnitType.MASTER_BEDROOM) return "Attached washroom";
  return "Room only";
}

function defaultVisualLabelForType(type: UnitType) {
  if (type === UnitType.HOUSE) return "House plan";
  if (type === UnitType.MASTER_BEDROOM) return "Master room plan";
  return "Room plan";
}

function defaultThemeForType(type: UnitType) {
  if (type === UnitType.HOUSE) {
    return { themeColor: "#0d3b66", accentColor: "#38bdf8" };
  }

  if (type === UnitType.MASTER_BEDROOM) {
    return { themeColor: "#0f4c81", accentColor: "#7dd3fc" };
  }

  return { themeColor: "#123a63", accentColor: "#93c5fd" };
}

async function syncUnitOccupancy(unitId: string) {
  const assignmentCount = await prisma.leaseAssignment.count({
    where: {
      unitId,
      status: {
        in: [LeaseStatus.ACTIVE, LeaseStatus.UPCOMING],
      },
    },
  });

  await prisma.unit.update({
    where: { id: unitId },
    data: {
      status: assignmentCount > 0 ? UnitStatus.OCCUPIED : UnitStatus.VACANT,
    },
  });
}

function revalidateApp() {
  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/owner");
  revalidatePath("/tenant");
}

async function canAccessProperty(propertyId: string, userId: string, role: Role) {
  if (role === Role.ADMIN) {
    return prisma.property.findFirst({
      where: { id: propertyId },
      select: { id: true },
    });
  }

  return prisma.property.findFirst({
    where: {
      id: propertyId,
      ownerId: userId,
    },
    select: { id: true },
  });
}

export async function updateUnitPricing(formData: FormData) {
  await requireRole(Role.ADMIN);

  const unitId = asString(formData.get("unitId"));
  const monthlyRent = asNumber(formData.get("monthlyRent"));

  if (!unitId || monthlyRent <= 0) {
    return;
  }

  await prisma.unit.update({
    where: { id: unitId },
    data: { monthlyRent },
  });

  revalidateApp();
}

export async function createUnit(formData: FormData) {
  await requireRole(Role.ADMIN);

  const propertyId = asString(formData.get("propertyId"));
  const name = asString(formData.get("name"));
  const type = resolveUnitType(asString(formData.get("type")));
  const monthlyRent = asNumber(formData.get("monthlyRent"));
  const capacity = asNumber(formData.get("capacity"));
  const floorLabel = asString(formData.get("floorLabel"));
  const notes = asString(formData.get("notes"));
  const visualLabel = asString(formData.get("visualLabel"));
  const palette = defaultThemeForType(type);
  const resolvedCapacity = capacity > 0 ? capacity : defaultCapacityForType(type);

  if (!propertyId || !name || monthlyRent <= 0) {
    return;
  }

  await prisma.unit.create({
    data: {
      propertyId,
      name,
      type,
      monthlyRent,
      capacity: resolvedCapacity,
      floorLabel: floorLabel || null,
      sizeLabel: defaultSizeLabelForType(type),
      visualLabel: visualLabel || defaultVisualLabelForType(type),
      furnishings: notes || null,
      photoUrl: null,
      themeColor: palette.themeColor,
      accentColor: palette.accentColor,
      isPrivateBath: type === UnitType.MASTER_BEDROOM,
    },
  });

  revalidateApp();
}

export async function createLeaseAssignment(formData: FormData) {
  const session = await requireRole(Role.ADMIN);
  const unitId = asString(formData.get("unitId"));
  const tenantId = asString(formData.get("tenantId"));
  const startDate = asDate(formData.get("startDate"));
  const endDate = asDate(formData.get("endDate"));
  const securityDeposit = asNumber(formData.get("securityDeposit"));
  const notes = asString(formData.get("notes"));

  if (!unitId || !tenantId || !startDate || !endDate || endDate <= startDate) {
    return;
  }

  await prisma.leaseAssignment.create({
    data: {
      unitId,
      tenantId,
      assignedById: session.user.id,
      startDate,
      endDate,
      securityDeposit,
      notes: notes || null,
      status: resolveLeaseStatus(startDate, endDate),
    },
  });

  await syncUnitOccupancy(unitId);
  revalidateApp();
}

export async function updateLeaseEndDate(formData: FormData) {
  await requireRole(Role.ADMIN);

  const assignmentId = asString(formData.get("assignmentId"));
  const endDate = asDate(formData.get("endDate"));

  if (!assignmentId || !endDate) {
    return;
  }

  const assignment = await prisma.leaseAssignment.findUnique({
    where: { id: assignmentId },
  });

  if (!assignment || endDate <= assignment.startDate) {
    return;
  }

  await prisma.leaseAssignment.update({
    where: { id: assignmentId },
    data: {
      endDate,
      status: resolveLeaseStatus(assignment.startDate, endDate),
    },
  });

  await syncUnitOccupancy(assignment.unitId);
  revalidateApp();
}

export async function recordPayment(formData: FormData) {
  const session = await requireRole([Role.ADMIN, Role.OWNER]);
  const propertyId = asString(formData.get("propertyId"));
  const assignmentId = asString(formData.get("assignmentId"));
  const amount = asNumber(formData.get("amount"));
  const paidOn = asDate(formData.get("paidOn"));
  const paymentMethod = resolvePaymentMethod(asString(formData.get("paymentMethod")));
  const reference = asString(formData.get("reference"));
  const notes = asString(formData.get("notes"));

  if (!propertyId || amount <= 0 || !paidOn) {
    return;
  }

  const property = await canAccessProperty(propertyId, session.user.id, session.user.role);

  if (!property) {
    return;
  }

  await prisma.payment.create({
    data: {
      propertyId,
      assignmentId: assignmentId || null,
      recordedById: session.user.id,
      amount,
      paidOn,
      paymentMethod,
      reference: reference || null,
      notes: notes || null,
    },
  });

  revalidateApp();
}

export async function createInventoryItem(formData: FormData) {
  const session = await requireRole(Role.ADMIN);
  const propertyId = asString(formData.get("propertyId"));
  const name = asString(formData.get("name"));
  const quantity = asNumber(formData.get("quantity"));
  const unitCost = asNumber(formData.get("unitCost"));
  const locationLabel = asString(formData.get("locationLabel"));
  const status = resolveInventoryStatus(asString(formData.get("status")));
  const notes = asString(formData.get("notes"));

  if (!propertyId || !name || quantity <= 0 || unitCost < 0) {
    return;
  }

  await prisma.inventoryItem.create({
    data: {
      propertyId,
      createdById: session.user.id,
      name,
      quantity,
      unitCost,
      locationLabel: locationLabel || null,
      status,
      notes: notes || null,
    },
  });

  revalidateApp();
}

export async function createExpense(formData: FormData) {
  const session = await requireRole(Role.ADMIN);
  const propertyId = asString(formData.get("propertyId"));
  const title = asString(formData.get("title"));
  const amount = asNumber(formData.get("amount"));
  const spentOn = asDate(formData.get("spentOn"));
  const category = resolveExpenseCategory(asString(formData.get("category")));
  const vendor = asString(formData.get("vendor"));
  const notes = asString(formData.get("notes"));

  if (!propertyId || !title || amount <= 0 || !spentOn) {
    return;
  }

  await prisma.expense.create({
    data: {
      propertyId,
      createdById: session.user.id,
      title,
      amount,
      spentOn,
      category,
      vendor: vendor || null,
      notes: notes || null,
    },
  });

  revalidateApp();
}

export async function createRepairLog(formData: FormData) {
  const session = await requireRole(Role.ADMIN);
  const propertyId = asString(formData.get("propertyId"));
  const unitId = asString(formData.get("unitId"));
  const issueTitle = asString(formData.get("issueTitle"));
  const details = asString(formData.get("details"));
  const status = resolveRepairStatus(asString(formData.get("status")));
  const reportedOn = asDate(formData.get("reportedOn"));
  const resolvedOn = asDate(formData.get("resolvedOn"));
  const estimatedCost = asNumber(formData.get("estimatedCost"));
  const actualCost = asNumber(formData.get("actualCost"));
  const technician = asString(formData.get("technician"));

  if (!propertyId || !issueTitle || !details || !reportedOn) {
    return;
  }

  await prisma.repairLog.create({
    data: {
      propertyId,
      unitId: unitId || null,
      createdById: session.user.id,
      issueTitle,
      details,
      status,
      reportedOn,
      resolvedOn,
      estimatedCost,
      actualCost,
      technician: technician || null,
    },
  });

  revalidateApp();
}

export async function publishAnnouncement(formData: FormData) {
  const session = await requireRole(Role.OWNER);
  const propertyId = asString(formData.get("propertyId"));
  const title = asString(formData.get("title"));
  const body = asString(formData.get("body"));
  const audienceValue = asString(formData.get("audience"));

  if (!propertyId || !title || !body) {
    return;
  }

  const property = await canAccessProperty(propertyId, session.user.id, session.user.role);

  if (!property) {
    return;
  }

  await prisma.announcement.create({
    data: {
      propertyId,
      authorId: session.user.id,
      title,
      body,
      audience:
        audienceValue === Audience.EVERYONE
          ? Audience.EVERYONE
          : audienceValue === Audience.OWNER_ONLY
            ? Audience.OWNER_ONLY
            : Audience.TENANTS,
    },
  });

  revalidateApp();
}

export async function sendMessage(formData: FormData) {
  const session = await requireRole(Role.OWNER);
  const propertyId = asString(formData.get("propertyId"));
  const recipientId = asString(formData.get("recipientId"));
  const subject = asString(formData.get("subject"));
  const body = asString(formData.get("body"));

  if (!recipientId || !subject || !body) {
    return;
  }

  const property = await canAccessProperty(propertyId, session.user.id, session.user.role);

  if (!property) {
    return;
  }

  await prisma.message.create({
    data: {
      propertyId,
      senderId: session.user.id,
      recipientId,
      subject,
      body,
    },
  });

  revalidateApp();
}

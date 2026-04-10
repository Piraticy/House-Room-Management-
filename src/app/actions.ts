"use server";

import { Audience, LeaseStatus, UnitStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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

export async function updateUnitPricing(formData: FormData) {
  const unitId = asString(formData.get("unitId"));
  const monthlyRent = asNumber(formData.get("monthlyRent"));

  if (!unitId || monthlyRent <= 0) {
    return;
  }

  await prisma.unit.update({
    where: { id: unitId },
    data: { monthlyRent },
  });

  revalidatePath("/");
}

export async function createLeaseAssignment(formData: FormData) {
  const unitId = asString(formData.get("unitId"));
  const tenantId = asString(formData.get("tenantId"));
  const assignedById = asString(formData.get("assignedById"));
  const startDate = asDate(formData.get("startDate"));
  const endDate = asDate(formData.get("endDate"));
  const securityDeposit = asNumber(formData.get("securityDeposit"));
  const notes = asString(formData.get("notes"));

  if (!unitId || !tenantId || !assignedById || !startDate || !endDate || endDate <= startDate) {
    return;
  }

  await prisma.leaseAssignment.create({
    data: {
      unitId,
      tenantId,
      assignedById,
      startDate,
      endDate,
      securityDeposit,
      notes: notes || null,
      status: resolveLeaseStatus(startDate, endDate),
    },
  });

  await syncUnitOccupancy(unitId);
  revalidatePath("/");
}

export async function updateLeaseEndDate(formData: FormData) {
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
  revalidatePath("/");
}

export async function publishAnnouncement(formData: FormData) {
  const propertyId = asString(formData.get("propertyId"));
  const authorId = asString(formData.get("authorId"));
  const title = asString(formData.get("title"));
  const body = asString(formData.get("body"));
  const audienceValue = asString(formData.get("audience"));

  if (!propertyId || !authorId || !title || !body) {
    return;
  }

  await prisma.announcement.create({
    data: {
      propertyId,
      authorId,
      title,
      body,
      audience:
        audienceValue === Audience.OWNER_ONLY ? Audience.OWNER_ONLY : Audience.TENANTS,
    },
  });

  revalidatePath("/");
}

export async function sendMessage(formData: FormData) {
  const propertyId = asString(formData.get("propertyId"));
  const senderId = asString(formData.get("senderId"));
  const recipientId = asString(formData.get("recipientId"));
  const subject = asString(formData.get("subject"));
  const body = asString(formData.get("body"));

  if (!senderId || !recipientId || !subject || !body) {
    return;
  }

  await prisma.message.create({
    data: {
      propertyId: propertyId || null,
      senderId,
      recipientId,
      subject,
      body,
    },
  });

  revalidatePath("/");
}

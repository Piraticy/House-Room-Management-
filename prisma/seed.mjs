import { hash } from "bcryptjs";
import prismaPackage from "@prisma/client";

const {
  Audience,
  ExpenseCategory,
  InventoryStatus,
  LeaseStatus,
  PaymentMethod,
  PrismaClient,
  RepairStatus,
  Role,
  UnitStatus,
  UnitType,
} = prismaPackage;

const prisma = new PrismaClient();

function addDays(baseDate, days) {
  return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
}

function resolveLeaseStatus(startDate, endDate) {
  const now = new Date();

  if (endDate < now) {
    return LeaseStatus.COMPLETED;
  }

  if (startDate > now) {
    return LeaseStatus.UPCOMING;
  }

  return LeaseStatus.ACTIVE;
}

async function main() {
  await prisma.message.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.repairLog.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.leaseAssignment.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();

  const adminPasswordHash = await hash("Admin@123", 10);
  const ownerPasswordHash = await hash("Owner@123", 10);
  const tenantPasswordHash = await hash("Tenant@123", 10);

  const admin = await prisma.user.create({
    data: {
      name: "Asha Msuya",
      email: "admin@harborstay.app",
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      phone: "+255 754 341 100",
      avatarColor: "#0f766e",
    },
  });

  const owner = await prisma.user.create({
    data: {
      name: "Salum Mrope",
      email: "owner@harborstay.app",
      passwordHash: ownerPasswordHash,
      role: Role.OWNER,
      phone: "+255 754 341 211",
      avatarColor: "#c2410c",
    },
  });

  const tenants = await prisma.user.createManyAndReturn({
    data: [
      {
        name: "Mina Mshana",
        email: "mina@harborstay.app",
        passwordHash: tenantPasswordHash,
        role: Role.TENANT,
        phone: "+255 712 111 401",
        avatarColor: "#0ea5e9",
      },
      {
        name: "Peter Semgaya",
        email: "peter@harborstay.app",
        passwordHash: tenantPasswordHash,
        role: Role.TENANT,
        phone: "+255 712 111 402",
        avatarColor: "#16a34a",
      },
      {
        name: "Neema Jongo",
        email: "neema@harborstay.app",
        passwordHash: tenantPasswordHash,
        role: Role.TENANT,
        phone: "+255 712 111 403",
        avatarColor: "#dc2626",
      },
    ],
  });

  const property = await prisma.property.create({
    data: {
      name: "Tanga Seaview Homes",
      location: "Mzingani, Tanga City",
      region: "Tanga",
      district: "Tanga City",
      ward: "Mzingani",
      description:
        "Rental homes and rooms managed for city residents and workers around the Tanga waterfront.",
      ownerId: owner.id,
    },
  });

  const houseUnit = await prisma.unit.create({
    data: {
      propertyId: property.id,
      name: "House A",
      type: UnitType.HOUSE,
      monthlyRent: 850000,
      capacity: 4,
      floorLabel: "Ground floor",
      sizeLabel: "Whole house",
      visualLabel: "House plan",
      furnishings: "Family house with shared sitting area and kitchen.",
      photoUrl: null,
      themeColor: "#0d3b66",
      accentColor: "#38bdf8",
      status: UnitStatus.OCCUPIED,
      isPrivateBath: false,
    },
  });

  const masterBedroom = await prisma.unit.create({
    data: {
      propertyId: property.id,
      name: "Master Room B1",
      type: UnitType.MASTER_BEDROOM,
      monthlyRent: 420000,
      capacity: 2,
      floorLabel: "First floor",
      sizeLabel: "Attached washroom",
      visualLabel: "Master room plan",
      furnishings: "Master bedroom with attached washroom.",
      photoUrl: null,
      themeColor: "#0f4c81",
      accentColor: "#7dd3fc",
      status: UnitStatus.OCCUPIED,
      isPrivateBath: true,
    },
  });

  const normalRoomOne = await prisma.unit.create({
    data: {
      propertyId: property.id,
      name: "Normal Room C2",
      type: UnitType.NORMAL_ROOM,
      monthlyRent: 230000,
      capacity: 1,
      floorLabel: "Second floor",
      sizeLabel: "Room only",
      visualLabel: "Room plan",
      furnishings: "Standard room for one tenant.",
      photoUrl: null,
      themeColor: "#123a63",
      accentColor: "#93c5fd",
      status: UnitStatus.OCCUPIED,
      isPrivateBath: false,
    },
  });

  await prisma.unit.create({
    data: {
      propertyId: property.id,
      name: "Normal Room C3",
      type: UnitType.NORMAL_ROOM,
      monthlyRent: 210000,
      capacity: 1,
      floorLabel: "Second floor",
      sizeLabel: "Room only",
      visualLabel: "Room plan",
      furnishings: "Simple normal room near the front side.",
      photoUrl: null,
      themeColor: "#123a63",
      accentColor: "#93c5fd",
      status: UnitStatus.VACANT,
      isPrivateBath: false,
    },
  });

  const leaseSeeds = [
    {
      unitId: houseUnit.id,
      tenantId: tenants[0].id,
      assignedById: admin.id,
      startDate: addDays(new Date(), -95),
      endDate: addDays(new Date(), 42),
      securityDeposit: 850000,
      notes: "Family house contract with monthly cash collection and water bill tracking.",
    },
    {
      unitId: masterBedroom.id,
      tenantId: tenants[1].id,
      assignedById: admin.id,
      startDate: addDays(new Date(), -30),
      endDate: addDays(new Date(), 78),
      securityDeposit: 420000,
      notes: "Master room tenant prefers M-Pesa reminders.",
    },
    {
      unitId: normalRoomOne.id,
      tenantId: tenants[2].id,
      assignedById: admin.id,
      startDate: addDays(new Date(), 7),
      endDate: addDays(new Date(), 97),
      securityDeposit: 230000,
      notes: "Room booked after employer confirmation.",
    },
  ];

  const createdAssignments = [];

  for (const lease of leaseSeeds) {
    const assignment = await prisma.leaseAssignment.create({
      data: {
        ...lease,
        status: resolveLeaseStatus(lease.startDate, lease.endDate),
      },
    });
    createdAssignments.push(assignment);
  }

  await prisma.announcement.createMany({
    data: [
      {
        propertyId: property.id,
        authorId: owner.id,
        title: "Maji maintenance on Tuesday",
        body:
          "Water tank cleaning is planned on Tuesday morning. Please keep bathrooms accessible from 9:00 AM to 10:00 AM.",
        audience: Audience.TENANTS,
      },
      {
        propertyId: property.id,
        authorId: owner.id,
        title: "Karibu Tanga Seaview Homes",
        body:
          "Use this system to follow room details, payment records, notices, and support updates.",
        audience: Audience.EVERYONE,
      },
    ],
  });

  await prisma.message.createMany({
    data: [
      {
        propertyId: property.id,
        senderId: owner.id,
        recipientId: tenants[0].id,
        subject: "Makubaliano ya kuongeza muda",
        body:
          "Muda wako unaisha ndani ya miezi miwili. Tafadhali tujulishe kama unahitaji kuongeza mkataba.",
      },
      {
        propertyId: property.id,
        senderId: owner.id,
        recipientId: tenants[1].id,
        subject: "Malipo yamepokelewa",
        body: "Asante. Malipo yako ya mwezi huu yamewekwa kwenye mfumo.",
      },
    ],
  });

  await prisma.payment.createMany({
    data: [
      {
        propertyId: property.id,
        assignmentId: createdAssignments[0].id,
        recordedById: admin.id,
        amount: 850000,
        paidOn: addDays(new Date(), -12),
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        reference: "TZH-A-0012",
        notes: "April house payment received in full.",
      },
      {
        propertyId: property.id,
        assignmentId: createdAssignments[1].id,
        recordedById: owner.id,
        amount: 420000,
        paidOn: addDays(new Date(), -6),
        paymentMethod: PaymentMethod.MOBILE_MONEY,
        reference: "MPESA-77412",
        notes: "Master room payment through mobile money.",
      },
    ],
  });

  await prisma.inventoryItem.createMany({
    data: [
      {
        propertyId: property.id,
        createdById: admin.id,
        name: "Plastic chairs",
        quantity: 8,
        unitCost: 25000,
        locationLabel: "Store room",
        status: InventoryStatus.IN_STOCK,
        notes: "Used for tenant meetings and waiting area.",
      },
      {
        propertyId: property.id,
        createdById: admin.id,
        name: "Water meter seals",
        quantity: 2,
        unitCost: 18000,
        locationLabel: "Maintenance shelf",
        status: InventoryStatus.LOW_STOCK,
        notes: "Need reorder before next month.",
      },
    ],
  });

  await prisma.expense.createMany({
    data: [
      {
        propertyId: property.id,
        createdById: admin.id,
        title: "Tanesco bill",
        amount: 164000,
        spentOn: addDays(new Date(), -9),
        category: ExpenseCategory.UTILITIES,
        vendor: "Tanesco Tanga",
        notes: "Monthly electricity bill.",
      },
      {
        propertyId: property.id,
        createdById: admin.id,
        title: "Plumbing tools",
        amount: 95000,
        spentOn: addDays(new Date(), -18),
        category: ExpenseCategory.SUPPLIES,
        vendor: "Central Hardware Tanga",
        notes: "Bought PVC parts and seal tape.",
      },
    ],
  });

  await prisma.repairLog.createMany({
    data: [
      {
        propertyId: property.id,
        unitId: masterBedroom.id,
        createdById: admin.id,
        issueTitle: "Shower pressure issue",
        details: "Master room shower pressure dropped after tank cleaning.",
        status: RepairStatus.IN_PROGRESS,
        reportedOn: addDays(new Date(), -4),
        estimatedCost: 70000,
        actualCost: 0,
        technician: "Maro Fundi",
      },
      {
        propertyId: property.id,
        unitId: houseUnit.id,
        createdById: admin.id,
        issueTitle: "Front gate welding",
        details: "Gate hinge was repaired and reinforced.",
        status: RepairStatus.RESOLVED,
        reportedOn: addDays(new Date(), -28),
        resolvedOn: addDays(new Date(), -25),
        estimatedCost: 120000,
        actualCost: 115000,
        technician: "Tanga Metal Works",
      },
    ],
  });

  console.log("Seed complete with demo credentials:");
  console.log("Admin: admin@harborstay.app / Admin@123");
  console.log("Owner: owner@harborstay.app / Owner@123");
  console.log("Tenant: mina@harborstay.app / Tenant@123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import {
  Audience,
  LeaseStatus,
  PrismaClient,
  Role,
  UnitStatus,
  UnitType,
} from "@prisma/client";

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
  await prisma.leaseAssignment.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.property.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      name: "Amara Ndlovu",
      email: "admin@harborstay.app",
      role: Role.ADMIN,
      phone: "+971 50 341 1000",
      avatarColor: "#0f766e",
    },
  });

  const owner = await prisma.user.create({
    data: {
      name: "David Mensah",
      email: "owner@harborstay.app",
      role: Role.OWNER,
      phone: "+971 50 341 2111",
      avatarColor: "#b45309",
    },
  });

  const tenants = await prisma.user.createManyAndReturn({
    data: [
      {
        name: "Mina Okafor",
        email: "mina@harborstay.app",
        role: Role.TENANT,
        phone: "+971 55 101 4401",
        avatarColor: "#0ea5e9",
      },
      {
        name: "Peter Otieno",
        email: "peter@harborstay.app",
        role: Role.TENANT,
        phone: "+971 55 101 4402",
        avatarColor: "#16a34a",
      },
      {
        name: "Sarah Kimani",
        email: "sarah@harborstay.app",
        role: Role.TENANT,
        phone: "+971 55 101 4403",
        avatarColor: "#dc2626",
      },
    ],
  });

  const property = await prisma.property.create({
    data: {
      name: "Harbor Stay Residence",
      location: "Dubai Silicon Oasis",
      description:
        "A shared living property with whole-house, master bedroom, and normal room options managed by owner and admin.",
      ownerId: owner.id,
    },
  });

  const houseSuite = await prisma.unit.create({
    data: {
      propertyId: property.id,
      name: "Whole House Suite",
      type: UnitType.HOUSE,
      monthlyRent: 5200,
      capacity: 4,
      floorLabel: "Ground floor",
      status: UnitStatus.OCCUPIED,
      isPrivateBath: true,
    },
  });

  const masterBedroom = await prisma.unit.create({
    data: {
      propertyId: property.id,
      name: "Master Bedroom A1",
      type: UnitType.MASTER_BEDROOM,
      monthlyRent: 2200,
      capacity: 2,
      floorLabel: "Level 1",
      status: UnitStatus.OCCUPIED,
      isPrivateBath: true,
    },
  });

  const normalRoomOne = await prisma.unit.create({
    data: {
      propertyId: property.id,
      name: "Normal Room B2",
      type: UnitType.NORMAL_ROOM,
      monthlyRent: 1250,
      capacity: 1,
      floorLabel: "Level 2",
      status: UnitStatus.OCCUPIED,
      isPrivateBath: false,
    },
  });

  await prisma.unit.create({
    data: {
      propertyId: property.id,
      name: "Normal Room B3",
      type: UnitType.NORMAL_ROOM,
      monthlyRent: 1180,
      capacity: 1,
      floorLabel: "Level 2",
      status: UnitStatus.VACANT,
      isPrivateBath: false,
    },
  });

  const leaseSeeds = [
    {
      unitId: houseSuite.id,
      tenantId: tenants[0].id,
      assignedById: admin.id,
      startDate: addDays(new Date(), -110),
      endDate: addDays(new Date(), 44),
      securityDeposit: 5200,
      notes:
        "Whole house lease includes maintenance support and due-soon notification window.",
    },
    {
      unitId: masterBedroom.id,
      tenantId: tenants[1].id,
      assignedById: admin.id,
      startDate: addDays(new Date(), -30),
      endDate: addDays(new Date(), 96),
      securityDeposit: 2200,
      notes: "Master bedroom tenant prefers reminders by in-app message.",
    },
    {
      unitId: normalRoomOne.id,
      tenantId: tenants[2].id,
      assignedById: admin.id,
      startDate: addDays(new Date(), 12),
      endDate: addDays(new Date(), 102),
      securityDeposit: 1250,
      notes: "Upcoming move-in after final payment confirmation.",
    },
  ];

  for (const lease of leaseSeeds) {
    await prisma.leaseAssignment.create({
      data: {
        ...lease,
        status: resolveLeaseStatus(lease.startDate, lease.endDate),
      },
    });
  }

  await prisma.announcement.createMany({
    data: [
      {
        propertyId: property.id,
        authorId: owner.id,
        title: "Utility maintenance schedule",
        body:
          "Water tank cleaning is booked for next Tuesday at 10:00 AM. Please keep bathroom access available during the 45 minute inspection window.",
        audience: Audience.TENANTS,
      },
      {
        propertyId: property.id,
        authorId: owner.id,
        title: "Welcome to the resident portal",
        body:
          "Use this dashboard to review stay dates, room pricing, and messages from the property team.",
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
        subject: "Lease renewal planning",
        body:
          "Your stay ends in less than two months. Please confirm whether you would like to renew the whole-house booking.",
      },
      {
        propertyId: property.id,
        senderId: owner.id,
        recipientId: tenants[1].id,
        subject: "Payment received",
        body:
          "Thank you. Your latest monthly payment has been recorded and your room remains active through the current term.",
      },
    ],
  });

  console.log("Seed complete: admin, owner, tenants, units, leases, and communications created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

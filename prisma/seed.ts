import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');

  const password = await bcrypt.hash('password123', 10);
  const demoPassword = await bcrypt.hash('demo123', 10);

  const users = [
    {
      email: 'admin@aarogya.com',
      name: 'System Admin',
      role: UserRole.ADMIN,
      password,
      location: 'Headquarters',
    },
    {
      email: 'chw@aarogya.com',
      name: 'Rahul Kumar',
      role: UserRole.CHW,
      password,
      location: 'Village A',
    },
    {
      email: 'asha@aarogya.com',
      name: 'Priya Singh',
      role: UserRole.ASHA,
      password,
      location: 'Village A',
    },
    {
      email: 'clinician@aarogya.com',
      name: 'Dr. Sharma',
      role: UserRole.CLINICIAN,
      password,
      location: 'District Hospital',
    },
    // Demo Users
    {
      email: 'chw@demo.com',
      name: 'Demo CHW',
      role: UserRole.CHW,
      password: demoPassword,
      location: 'Demo Village',
    },
    {
      email: 'asha@demo.com',
      name: 'Demo ASHA',
      role: UserRole.ASHA,
      password: demoPassword,
      location: 'Demo Village',
    },
    {
      email: 'doctor@demo.com',
      name: 'Demo Doctor',
      role: UserRole.CLINICIAN,
      password: demoPassword,
      location: 'Demo Hospital',
    },
  ];

  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: u.password,
        role: u.role,
        name: u.name
      },
      create: u,
    });
    console.log(`Created/Updated user with id: ${user.id}`);
  }

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

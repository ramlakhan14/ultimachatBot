const { hash } = require('bcrypt');
const { MongoClient } = require('mongodb');

const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const databaseName = process.env.MONGO_DBNAME || 'ultimachatbot_local';

const localHosts = new Set(['localhost', '127.0.0.1', 'mongodb']);
const parsedMongoUri = new URL(mongoUri);

if (parsedMongoUri.protocol !== 'mongodb:' || !localHosts.has(parsedMongoUri.hostname)) {
  throw new Error('Local seeding only allows localhost, 127.0.0.1, or the local Compose mongodb service.');
}

const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@local.test';
const accounts = [
  {
    email: superAdminEmail,
    name: 'Local Super Admin',
    password: 'SuperAdmin!234',
    role: 'admin',
  },
  {
    email: 'admin@local.test',
    name: 'Local Admin',
    password: 'AdminUser!234',
    role: 'admin',
  },
  {
    email: 'user@local.test',
    name: 'Local User',
    password: 'NormalUser!234',
    role: 'user',
  },
];

async function seedLocalUsers() {
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const users = client.db(databaseName).collection('users');
    const now = new Date();

    for (const account of accounts) {
      const password = await hash(account.password, 10);
      await users.updateOne(
        { email: account.email },
        {
          $setOnInsert: {
            email: account.email,
            name: account.name,
            password,
            role: account.role,
            loginType: 'email',
            isActive: 1,
            isVerified: true,
            currentSessionVersion: 1,
            createdAt: now,
            updatedAt: now,
          },
        },
        { upsert: true },
      );
    }

    console.log(`Seeded local demo accounts in ${databaseName} (existing accounts were left unchanged).`);
  } finally {
    await client.close();
  }
}

seedLocalUsers().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
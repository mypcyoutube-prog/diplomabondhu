import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { loadEnv } from '../config/env';
import { User } from '../models/user.model';
import { writeAudit } from '../models/audit-log.model';

async function seedAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || 'Main Admin';

  if (!email || !password || password.length < 8) {
    console.error('Usage: npm run seed:admin <email> <password-min-8-chars> [name]');
    process.exit(1);
  }

  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI);

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.error('A user with this email already exists. Aborting.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await User.create({ name, email: email.toLowerCase(), passwordHash, role: 'admin' });
  await writeAudit({ action: 'admin.seeded', targetType: 'User', targetId: String(admin._id), after: { email: admin.email, role: 'admin' } });
  console.log(`Main Admin created: ${admin.email}`);
  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

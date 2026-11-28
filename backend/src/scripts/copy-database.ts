// One-time migration helper: copies every collection from a source MongoDB
// (e.g. the local standalone database) to a target MongoDB (e.g. Atlas).
// Existing documents with the same _id in the target are skipped, so it is
// safe to run more than once. Never prints connection strings.
//
//   npx ts-node src/scripts/copy-database.ts \
//     --from "mongodb://127.0.0.1:27017" \
//     --to "mongodb+srv://user:pass@cluster0.xxxx.mongodb.net" \
//     [--databases diplomabondhu,results_db]
import mongoose from 'mongoose';

interface Args {
  from: string;
  to: string;
  databases: string[];
}

function parseArgs(): Args {
  const get = (name: string): string | undefined => {
    const i = process.argv.indexOf('--' + name);
    return i > -1 ? process.argv[i + 1] : undefined;
  };
  const from = get('from');
  const to = get('to');
  const databases = (get('databases') ?? 'diplomabondhu')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (!from || !to) {
    throw new Error(
      'Usage: npx ts-node src/scripts/copy-database.ts --from <source-uri> --to <target-uri> [--databases db1,db2]'
    );
  }
  return { from, to, databases };
}

function hostOf(uri: string): string {
  try {
    return new URL(uri.replace('mongodb+srv://', 'https://')).host;
  } catch {
    return '<unknown-host>';
  }
}

async function copyDatabase(
  fromConn: mongoose.Connection,
  toConn: mongoose.Connection,
  dbName: string
): Promise<void> {
  const src = fromConn.useDb(dbName, { useCache: true });
  const dst = toConn.useDb(dbName, { useCache: true });
  const collections = await src.listCollections();
  if (collections.length === 0) {
    console.log(dbName + ': no collections found (skipped)');
    return;
  }
  for (const col of collections) {
    const docs = await src.collection(col.name).find({}).toArray();
    if (docs.length === 0) {
      console.log(dbName + '.' + col.name + ': empty (skipped)');
      continue;
    }
    try {
      await dst.collection(col.name).insertMany(docs, { ordered: false });
      console.log(dbName + '.' + col.name + ': copied ' + docs.length + ' documents');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('E11000') || message.includes('duplicate')) {
        console.log(dbName + '.' + col.name + ': copied with skips (some documents already existed)');
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  const args = parseArgs();
  console.log('Source host:', hostOf(args.from));
  console.log('Target host:', hostOf(args.to));
  console.log('Databases:', args.databases.join(', '));

  const fromConn = await mongoose.createConnection(args.from).asPromise();
  const toConn = await mongoose.createConnection(args.to).asPromise();
  try {
    for (const dbName of args.databases) {
      await copyDatabase(fromConn, toConn, dbName);
    }
    console.log('Migration complete.');
  } finally {
    await fromConn.close();
    await toConn.close();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});

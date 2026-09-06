const { db } = require('../src/config/firebase');

const CUSTOMER_UID = 'k2lEHRP4xUZ9K3loZlHNCjdjTyp2';
const CUSTOMER_NAME = 'Edsiel Ursal';
const LEGACY_NAME = 'edsiel';

async function migrateCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get();
  const matchingDocs = snapshot.docs.filter((doc) => String(doc.data().customerName || '').trim().toLowerCase() === LEGACY_NAME);

  if (process.argv.includes('--dry-run')) return matchingDocs.length;

  const batch = db.batch();
  matchingDocs.forEach((doc) => {
    batch.update(doc.ref, { customerUid: CUSTOMER_UID, customerName: CUSTOMER_NAME });
  });
  if (matchingDocs.length) await batch.commit();
  return matchingDocs.length;
}

async function main() {
  const mode = process.argv.includes('--dry-run') ? 'Would update' : 'Updated';
  const [repairRequests, acceptedJobs] = await Promise.all([
    migrateCollection('repairRequests'),
    migrateCollection('acceptedJobs')
  ]);
  console.log(`${mode} ${repairRequests} repairRequests and ${acceptedJobs} acceptedJobs.`);
}

main().catch((error) => {
  console.error('Customer identity migration failed:', error);
  process.exitCode = 1;
});

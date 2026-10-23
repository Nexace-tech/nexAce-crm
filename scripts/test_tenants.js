const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
let uri = '';
env.split(/\r?\n/).forEach(line => {
  if (line.startsWith('MONGODB_URI=')) {
    uri = line.substring('MONGODB_URI='.length).trim();
  }
});

async function checkTenants() {
  await mongoose.connect(uri);
  const users = await mongoose.connection.db.collection('users').find({
    name: { $in: ['Nex Ace Admin', 'Ashish Sharma'] }
  }, { projection: { name: 1, role: 1, tenantId: 1, status: 1 } }).toArray();

  console.log('Sample users:', users);
  const tenants = await mongoose.connection.db.collection('tenants').find({}).toArray();
  console.log('Tenants:', tenants.map(t => ({ _id: t._id, name: t.name, slug: t.slug })));
  await mongoose.disconnect();
}
checkTenants().catch(console.error);

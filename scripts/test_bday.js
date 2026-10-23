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

async function check() {
  await mongoose.connect(uri);
  const users = await mongoose.connection.db.collection('users').find({}, { projection: { name: 1, email: 1, dob: 1, joinDate: 1, preferences: 1, status: 1 } }).toArray();
  console.log('Total users in DB:', users.length);
  users.forEach(u => console.log(u.name, '| dob:', u.dob, '| joinDate:', u.joinDate, '| status:', u.status, '| prefs:', JSON.stringify(u.preferences)));
  await mongoose.disconnect();
}
check().catch(console.error);

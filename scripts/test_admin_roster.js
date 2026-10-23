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

function getMonthAndDay(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return {
    month: d.getMonth() + 1,
    day: d.getDate(),
  };
}

async function testAdmin() {
  await mongoose.connect(uri);
  const teamMembers = await mongoose.connection.db.collection('users').find({
    status: { $ne: 'Suspended' }
  }).toArray();

  const monthlyRoster = {};
  for (let m = 1; m <= 12; m++) monthlyRoster[m] = [];

  for (const member of teamMembers) {
    if (member.preferences?.showBirthdayOnDashboard !== false && member.dob) {
      const md = getMonthAndDay(member.dob);
      if (md) {
        monthlyRoster[md.month].push({
          userId: member._id.toString(),
          name: member.name,
          month: md.month,
          day: md.day,
          type: 'birthday'
        });
      }
    }
  }

  console.log('October (10) roster count:', monthlyRoster[10].length);
  console.log('October members:', monthlyRoster[10]);
  console.log('All months counts:', Object.keys(monthlyRoster).map(m => `${m}: ${monthlyRoster[m].length}`));
  await mongoose.disconnect();
}
testAdmin().catch(console.error);

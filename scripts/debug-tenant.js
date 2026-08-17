const mongoose = require('mongoose');

async function debugTenantMismatch() {
  const uri = 'mongodb+srv://ashishsharma7251_db_user:ykhpg2hO4chncrTt@nexace.zni14mm.mongodb.net/nexace-crm?appName=NexAce';
  await mongoose.connect(uri);

  const User = mongoose.connection.collection('users');
  const Department = mongoose.connection.collection('departments');
  const Tenant = mongoose.connection.collection('tenants');

  const allTenants = await Tenant.find({}).toArray();
  console.log('All Tenants in DB:');
  allTenants.forEach(t => console.log(`  _id: ${t._id.toString()}, name: "${t.name}", slug: "${t.slug}"`));

  const allUsers = await User.find({}).project({ name: 1, email: 1, role: 1, tenantId: 1 }).toArray();
  console.log('\nAll Users with their tenantId:');
  allUsers.forEach(u => console.log(`  _id: ${u._id.toString()}, name: "${u.name}", email: "${u.email}", tenantId: ${u.tenantId ? u.tenantId.toString() : 'NONE'}`));

  const allDepts = await Department.find({}).toArray();
  console.log('\nAll Departments with their tenantId:');
  allDepts.forEach(d => console.log(`  _id: ${d._id.toString()}, name: "${d.name}", tenantId: ${d.tenantId ? d.tenantId.toString() : 'NONE'}`));

  await mongoose.disconnect();
}

debugTenantMismatch().catch(console.error);

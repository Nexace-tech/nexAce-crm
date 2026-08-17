const mongoose = require('mongoose');

async function testFetchDepartments() {
  const uri = 'mongodb+srv://ashishsharma7251_db_user:ykhpg2hO4chncrTt@nexace.zni14mm.mongodb.net/nexace-crm?appName=NexAce';
  await mongoose.connect(uri);

  // Import User model first to register schema
  const { User } = require('../src/models/User');
  const { Department } = require('../src/models/Department');

  const tenantObjectId = new mongoose.Types.ObjectId('6a75d7705e42ee7ada0e87bb');

  try {
    const departments = await Department.find({ tenantId: tenantObjectId })
      .populate('managerId', 'name email role photoUrl')
      .sort({ name: 1 });
    console.log('Successfully fetched departments with populate:', departments.length);
    console.log(JSON.stringify(departments, null, 2));
  } catch (err) {
    console.error('Populate failed with error:', err);
  }

  await mongoose.disconnect();
}

testFetchDepartments().catch(console.error);

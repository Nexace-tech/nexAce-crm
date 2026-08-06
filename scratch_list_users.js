const mongoose = require('./node_modules/mongoose');

const MONGODB_URI = "mongodb+srv://ashishsharma7251_db_user:ykhpg2hO4chncrTt@nexace.zni14mm.mongodb.net/nexace-crm?appName=NexAce";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    const users = await db.collection('users').find({}).toArray();
    console.log("All users:");
    users.forEach(u => console.log(`${u.name} | Role: ${u.role} | Status: ${u.status}`));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();

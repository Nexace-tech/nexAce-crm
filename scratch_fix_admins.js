const mongoose = require('./node_modules/mongoose');

const MONGODB_URI = "mongodb+srv://ashishsharma7251_db_user:ykhpg2hO4chncrTt@nexace.zni14mm.mongodb.net/nexace-crm?appName=NexAce";

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.db;

    const result = await db.collection('users').updateMany(
      { role: "Admin", status: "Pending" },
      { $set: { status: "Active" } }
    );
    console.log(`Updated ${result.modifiedCount} admin users from Pending to Active status.`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();

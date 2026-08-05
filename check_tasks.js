const mongoose = require('mongoose');

const uri = "mongodb+srv://ashishsharma7251_db_user:ykhpg2hO4chncrTt@nexace.zni14mm.mongodb.net/nexace-crm?appName=NexAce";

async function run() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;

    const activityLogs = await db.collection('activitylogs').find({}).toArray();
    console.log("\nActivity Logs Total:", activityLogs.length);
    console.log("Activity Logs:", JSON.stringify(activityLogs, null, 2));

    const timeentries = await db.collection('timeentries').find({}).toArray();
    console.log("\nTime Entries Total:", timeentries.length);
    console.log("Time Entries:", JSON.stringify(timeentries, null, 2));

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.disconnect();
  }
}

run();

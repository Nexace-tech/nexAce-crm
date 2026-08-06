const mongoose = require('./node_modules/mongoose');

const MONGODB_URI = "mongodb+srv://ashishsharma7251_db_user:ykhpg2hO4chncrTt@nexace.zni14mm.mongodb.net/nexace-crm?appName=NexAce";

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB.");

  const ChatMessageSchema = new mongoose.Schema({}, { strict: false });
  const ChatMessage = mongoose.model("ChatMessage", ChatMessageSchema);

  const msgs = await ChatMessage.find({}).sort({ createdAt: -1 }).lean();
  console.log(`Total Chat Messages in DB: ${msgs.length}`);
  msgs.forEach((m, idx) => {
    console.log(`${idx + 1}. [ID: ${m._id}] Channel: "${m.channel}" | Sender: "${m.senderName}" (${m.senderId}) | RecipientId: "${m.recipientId}" | TenantId: "${m.tenantId}" | Content: "${m.content}"`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);

require("dotenv").config();
const User1 = require("./models/user");
const { Deposit1, Withdrawal1, AuthPin1 } = require("./models/transaction");
const Notification1 = require("./models/notification");
const startDb = require("./models/index");

startDb();

async function Flush() {
  await Deposit1.deleteMany({}).exec();
  await Withdrawal1.deleteMany({}).exec();
  await Notification1.deleteMany({}).exec();
  await AuthPin1.deleteMany({}).exec();
  await User1.deleteMany({}).exec();
  console.log("\n\nDATABASE FLUSHED\n\n");
}

Flush();

var mongoose = require("mongoose");
var { nanoid } = require("nanoid");

function genCode() {
  return nanoid(16);
}

const depositSchema = mongoose.Schema({
  date: { type: Date, default: Date.now },
  ref: {
    type: mongoose.Types.ObjectId,
    default: mongoose.Types.ObjectId,
    unique: true,
  },
  amount: { type: Number, min: 0 },
  description: String,
  details: String,
  approved: { type: Boolean, default: false },
  client: { type: mongoose.Types.ObjectId, ref: "User1" },
  walletType: { type: String, required: true },
  walletAdrress: { type: String, required: true, min: 24 },
});

const withdrawalSchema = mongoose.Schema({
  date: { type: Date, default: Date.now },
  ref: {
    type: mongoose.Types.ObjectId,
    default: mongoose.Types.ObjectId,
    unique: true,
  },
  amount: { type: Number, min: 0 },
  approved: { type: Boolean, default: false },
  walletType: { type: String, required: true },
  details: String,
  pin: String,
  client: { type: mongoose.Types.ObjectId, ref: "User1" },
  walletAdrress: { type: String, min: 24, default: "" },
  cashAppTag: { type: String, min: 8, default: "" },
});

const authPinSchema = mongoose.Schema({
  pin: {
    type: String,
    unique: true,
    minLength: 4,
    default: genCode,
  },
  client: { type: mongoose.Types.ObjectId, ref: "User1" },
  dateCreated: { type: Date, default: Date.now },
  hasBeenUsed: { type: Boolean, default: false },
  withdrawal: {
    type: mongoose.Types.ObjectId,
    ref: "Withdrawal1",
    unique: true,
  },
});

const Deposit1 = mongoose.model("Deposit1", depositSchema);
const Withdrawal1 = mongoose.model("Withdrawal1", withdrawalSchema);
const AuthPin1 = mongoose.model("AuthPin1", authPinSchema);

module.exports = {
  Deposit1,
  Withdrawal1,
  AuthPin1,
};

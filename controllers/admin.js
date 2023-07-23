const User1 = require("./../models/user");
const { Deposit1, Withdrawal1, AuthPin1 } = require("./../models/transaction");
const Notification1 = require("./../models/notification");
const { body, validationResult } = require("express-validator");

function logIn(req, res) {
  res.locals.authError = req.flash("error");
  res.locals.formErrors = req.flash("formErrors");
  res.render("admin/admin_login");
}

async function deleteUser(req, res) {
  const id = req.params.clientId;
  await Withdrawal1.deleteMany({ client: id }).exec();
  await Deposit1.deleteMany({ client: id }).exec();
  await Notification1.deleteMany({ listener: id }).exec();
  await AuthPin1.deleteMany({ client: id }).exec();

  await User1.findByIdAndDelete(id).exec();

  res.redirect("/admin/overview/?ui=users");
}

async function overview(req, res) {
  let UI = req.query.ui || "main";

  const uis = ["main", "users", "withdrawals", "topup", "history", "deposits"];

  if (!uis.includes(UI)) UI = "main";

  const clients = await User1.find({}).exec();
  const deposits = await Deposit1.find({}).populate("client").exec();
  const withdrawals = await Withdrawal1.find({}).populate("client").exec();

  res.locals.authError = req.flash("error");
  res.locals.formErrors = req.flash("formErrors");

  res.render("admin/admin_overview", {
    clients,
    deposits,
    withdrawals,
    ui: UI,
    user: req.user,
  });
}

const editClient = [
  body("wallet", "Wallet balance is required")
    .notEmpty()
    .isNumeric()
    .withMessage("Please enter a valid wallet amount"),
  body("bonus", "Bonus balance is required")
    .notEmpty()
    .isNumeric()
    .withMessage("Please enter a valid bonus amount"),
  body("deposits", "Deposit balance is required")
    .notEmpty()
    .isNumeric()
    .withMessage("Please enter a valid amount"),
  body("withdrawals", "Withdrawal balance is required")
    .notEmpty()
    .isNumeric()
    .withMessage("Please enter a valid  amount"),
  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash("formErrors", errors.array());
      res.redirect("/admin/overview/?ui=users");
      return;
    }

    let client = await User1.findById(req.body.clientId).exec();
    client.wallet = req.body.wallet;
    client.bonus = req.body.bonus;
    client.deposits = req.body.deposits;
    client.withdrawals = req.body.withdrawals;

    await client.save();
    req.flash("info", ` Client ${client.email} record updated successfully`);
    res.redirect("/admin/overview/?ui=users");
  },
];

module.exports = {
  logIn,
  overview,
  editClient,
  deleteUser,
};

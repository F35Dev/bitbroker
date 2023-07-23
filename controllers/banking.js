require("dotenv").config();
var { body, validationResult } = require("express-validator");
var Notification1 = require("./../models/notification");
var { Deposit1, Withdrawal1, AuthPin1 } = require("./../models/transaction");
var nodemailer = require("nodemailer");
var mailConfig;
if (process.env.NODE_ENV === "production") {
  // all emails are delivered to destination
  mailConfig = {
    port: 465,
    host: "mail.fxtraderra.com",
    secure: true,
    auth: {
      username: process.env.EMAIL_USERNAME,
      password: process.env.EMAIL_PASSWORD,
    },
  };
} else {
  // all emails are catched by ethereal.email
  mailConfig = {
    host: "smtp.ethereal.email",
    port: 587,
    auth: {
      user: "ethereal.user@ethereal.email",
      pass: "verysecret",
    },
  };
}
let transporter = nodemailer.createTransport(mailConfig);

transporter.verify(function (error, success) {
  if (error) {
    console.log("EMAIL ERROR : ", error);
  } else {
    console.log("EMAIL MESSAGING READY");
  }
});

function servePageByUrl(req, res, next) {
  const pageName = req.params.pageName;

  const pages = ["security", "investment", "contest", "about", "error-404"];

  if (!pages.includes(pageName)) {
    next();
    return;
  } else {
    res.render(pageName);
  }
}

function home(req, res) {
  res.locals.info = req.flash("info");
  res.render("index");
}

const verifyTx = [
  body("pin", "Please enter your authentication code")
    .trim()
    .isLength({ min: 4, max: 48 })
    .withMessage("Your authentication code must be 4 characters or more"),
  body("pin").custom(async (inputValue, { req }) => {
    const pinExists = await AuthPin1.exists({
      pin: inputValue,
      client: req.user.id,
      hasBeenUsed: false,
    });
    if (!pinExists) {
      req.flash("info", "Invalid authentication code, please try again");
      throw Error("Invalid authentication code, try again");
    }

    return true;
  }),

  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash("authenticate", true);
      req.flash("formErrors", errors.array());
      res.redirect(
        "/banking/app/?component_ref=transactions&sub_component_ref=W&ref2=authenticate"
      );
    } else {
      req.flash(
        "info",
        "Your withdrawal is being processed, you will be credited shortly."
      );
      const authpin = await AuthPin1.findOne({
        client: req.user._id,
        pin: req.body.pin,
        hasBeenUsed: false,
      }).exec();
      authpin.hasBeenUsed = true;
      req.user.withdrawals += parseFloat(
        req.session.LAST_WITHDRAWAL_AMOUNT || 0
      );
      await req.user.save();
      await authpin.save();
      res.redirect("/banking/app/");
    }
  },
];

async function deleteNotification(req, res) {
  await Notification1.findByIdAndDelete(req.params.notificationId).exec();
  req.flash("info", "Notification1 marked as read");
  res.locals.flash = true;

  res.redirect("/banking/app/");
}

const registerDeposit = [
  body("walletType", "Wallet type is required").isAlphanumeric().notEmpty(),
  body("amount", "Amount is required").isNumeric().notEmpty(),
  body("address", "Wallet address is required")
    .notEmpty()
    .isBtcAddress()
    .withMessage("Please enter a valid wallet address"),
  body("description").optional(),
  body("date", "Date is required")
    .notEmpty()

    .withMessage("Please enter a valid date"),

  async function (req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash("formErrors", errors.array());
      res.redirect(
        "/banking/app/?component_ref=transactions&sub_component_ref=D"
      );
      return;
    }

    const walletType = req.body.walletType;
    const amount = req.body.amount;
    const address = req.body.address;
    const description = req.body.description;
    const dateOfTransfer = req.body.date;

    const deposit = new Deposit1({
      amount,
      description,
      client: req.user.id,
      date: dateOfTransfer,
      walletAdrress: address,
      walletType,
      details: `Submitted a deposit claim of ${amount} ${walletType}`,
    });

    await new Notification1({
      listener: req.user.id,
      description: `Submitted deposit request with reference ID - ${deposit.ref}`,
    }).save();

    req.flash(
      "info",
      "Your deposit claim has been submitted. Your account will be credited immediately it is verified"
    );
    res.locals.flash = true;

    await deposit.save();

    res.redirect("/banking/app/");
  },
];

const registerWithdrawal = [
  body("walletType", "Wallet type is required").isAlphanumeric().notEmpty(),
  body("amount", "Amount is required").isNumeric().notEmpty(),
  //   body("address", "Wallet address is required")
  //     .notEmpty()
  //     .isBtcAddress()
  //     .withMessage("Please enter a valid wallet address"),

  async function (req, res) {
    const errors = validationResult(req);

    let channel = "";

    if (req.body.withType === "2") {
      channel = "Cash App Tag";
      if (!req.body.cashapptag) {
        req.flash("formErrors", [{ msg: "Cash App Tag is required" }]);
        res.redirect(
          "/banking/app/?component_ref=transactions&sub_component_ref=W"
        );
        return;
      }
    } else if (req.body.withType === "1") {
      channel = "Bitcoin Address";
      if (!req.body.address) {
        req.flash("formErrors", [{ msg: "Bitcoin address is required" }]);
        res.redirect(
          "/banking/app/?component_ref=transactions&sub_component_ref=W"
        );
        return;
      }
    } else if (req.body.withType === "3") {
      channel = "Zelle Email";
      if (!req.body.zelle) {
        req.flash("formErrors", [{ msg: "Zelle email is required" }]);
        res.redirect(
          "/banking/app/?component_ref=transactions&sub_component_ref=W"
        );
        return;
      }
    } else if (req.body.withType === "4") {
      channel = "USDT Address";
      if (!req.body.usdt) {
        req.flash("formErrors", [{ msg: "USDT wallet address is required" }]);
        res.redirect(
          "/banking/app/?component_ref=transactions&sub_component_ref=W"
        );
        return;
      }
    } else if (req.body.withType === "5") {
      channel = "Paypal Email";
      if (!req.body.paypal) {
        req.flash("formErrors", [{ msg: "Paypal email is required" }]);
        res.redirect(
          "/banking/app/?component_ref=transactions&sub_component_ref=W"
        );
        return;
      }
    }

    if (!errors.isEmpty()) {
      req.flash("formErrors", errors.array());
      res.redirect(
        "/banking/app/?component_ref=transactions&sub_component_ref=W"
      );
      return;
    }

    const walletType = req.body.walletType;
    const amount = req.body.amount;
    let address =
      req.body.address ||
      req.body.cashapptag ||
      req.body.zelle ||
      req.body.paypal ||
      req.body.usdt;

    address = channel + ": " + address;

    const withdrawal = new Withdrawal1({
      amount,
      client: req.user.id,
      walletAdrress: address,
      walletType,
      details: `Initiated a withdrawal of $${amount} to - ${address}`,
      cashAppTag: address,
    });

    const newAuthPin = AuthPin1({
      client: req.user._id,
      withdrawal: withdrawal._id,
    });

    withdrawal.pin = newAuthPin.pin;

    await new Notification1({
      listener: req.user.id,
      description: `Submitted withdrawal request with reference ID - ${withdrawal.ref}`,
    }).save();

    req.flash("info", "Please enter your authentication code");
    res.locals.flash = true;
    req.session.LAST_WITHDRAWAL_AMOUNT = withdrawal.amount;

    await withdrawal.save();
    await newAuthPin.save();

    res.redirect(
      "/banking/app/?component_ref=transactions&sub_component_ref=W&ref2=authenticate"
    );
  },
];

async function index(req, res) {
  let entity = req.query.entity || "tx_logs";
  let widget = req.query.widget || "De";
  let subwidget = req.query.subwidget || "";

  if (!req.user.hasVerifiedEmailAddress && entity !== "email-verification") {
    // #Send Mail
    // console.log("\n", req.user.verificationCode, "\n");

    req.flash("info", "Please verify your email");
    res.redirect("/banking/app/?entity=email-verification");
    return;
  }

  const entities = [
    "tx_logs",
    "withdrawals",
    "deposits",
    "notifications",
    "transactions",
    "settings",
    "email-verification",
  ];

  const widgets = ["De", "Wi", "Ve"];
  if (!entities.includes(entity)) {
    entity = "transactions";
  }

  if (!widgets.includes(widget)) {
    widget = "De";
  }

  const notificationCount = await Notification1.count({
    listener: req.user.id,
    status: "UNREAD",
  }).exec();
  res.locals.notificationCount = notificationCount;

  let transactions;

  let deposits = await Deposit1.find({ client: req.user.id }).lean().exec();
  deposits = deposits.slice(0, 10);
  let withdrawals = await Withdrawal1.find({ client: req.user.id })
    .lean()
    .exec();
  withdrawals = withdrawals.slice(0, 10);

  let notifications = await Notification1.find({
    listener: req.user.id,
    status: "UNREAD",
  })
    .lean()
    .exec();

  notifications = notifications.slice(0, 10);

  transactions = deposits.concat(withdrawals);

  res.locals.transactions = transactions;
  res.locals.deposits = deposits;
  res.locals.withdrawals = withdrawals;
  res.locals.notifications = notifications;
  res.locals.user = req.user;
  res.locals.BTC = "126zeDsUtJ32MNysUFNGx7zsjmxXafuN5J";
  res.locals.ETH = "<<>>";

  res.locals.formErrors = req.flash("formErrors");
  res.locals.appUrl2 = "/";

  res.render("base", {
    entity,
    widget,
    subwidget,
  });
}

module.exports = {
  index,
  registerWithdrawal,
  registerDeposit,
  deleteNotification,
  home,
  verifyTx,
  servePageByUrl,
};

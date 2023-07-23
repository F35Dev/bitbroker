var { body, validationResult } = require("express-validator");
var User1 = require("./../models/user");
var multer = require("multer");
var multerS3 = require("multer-s3");
var aws = require("aws-sdk");
var { transporter, getVerificationEmail } = require("./../mails");
const sendEmailCallback = (err, info) => {
  if (err) {
    console.log("EMAIL ERROR: ", err.message);
  }

  console.table(info);
};

const s3 = new aws.S3({});

aws.config.update({
  secretAccessKey: process.env.S3_SECRET_KEY,
  accessKeyId: process.env.S3_ACCESS_KEY,
  region: "af-south-1",
});

let storage;
const fileFilter = (req, file, cb) => {
  const extension = file.mimetype.split("/")[1];
  if (!process.env.ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
    cb(new Error("Invalid file type, only JPEG and PNG is allowed"), false);
  }
};
if (process.env.NODE_ENV === "development") {
  storage = multer.diskStorage({
    destination: "/public/uploads",
    filename: function (req, file, cb) {
      const fn = nanoid(16);
      cb(null, "twilight" + fn);
    },
  });
} else if (process.env.NODE_ENV === "production") {
  storage = multerS3({
    s3,
    bucket: "shared-testing-bucket",
    acl: "public-read",
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: function (req, file, cb) {
      const fn = nanoid(16);
      cb(null, "twilight" + fn);
    },
  });
}

const avatarUpload = multer({
  fileFilter,
  storage,
  limits: { fileSize: 1024 * 10 },
}).single("avatar");

const validateLogInData = [
  body("email", "Email address is required")
    .isEmail()
    .withMessage("Please enter a valid email")
    .normalizeEmail(),
	
  body("password", "Password is required")
    .isString()
    .isLength({ min: 8, max: 25 })
    .withMessage("Password must be between 8 and 25 characters"),

  body("captcha", "Captcha is required")
    .isAlphanumeric()
    .isLength({ min: 6, max: 8 })
    .withMessage("Please enter captcha"),

  function (req, res, next) {

	if( req.body.captcha !== '182548'){
		req.flash('formErrors', [ { 'msg' : 'Incorrect captcha'} ]);
		res.status(303).redirect(req.url);
		return;
	}

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      req.flash("formErrors", errors.array());
      res.status(303).redirect(req.url);
    } else {
      next();
    }
  },
];

const validateSignUpData = [
  body("firstname", "Firstname is required")
    .trim()
    .isLength({ min: 3, max: 35 }),
  body("lastname", "Lastname is required").trim().isLength({ min: 3, max: 35 }),

  body("email", "Email address is required")
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage("A valid email address is required"),

  body("password1", "Password is required")
    .trim()
    .isLength({ min: 8, max: 25 })
    .withMessage("Password must be 8 characters or more"),

  body("password2", "Password confirmation is required")
    .trim()
    .isLength({ min: 8, max: 25 })
    .withMessage("Password must be between 8 and 25 characters"),

  body("captcha", "Captcha is required")
    .isAlphanumeric()
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage("Please enter captcha"),

/*
  body("country", "Country is required")
    .isAlphanumeric()
    .withMessage("Please select a country")
    .optional(),
*/

  body("password2").custom((value, { req }) => {
    if (value !== req.body.password1) {
      throw new Error("Password fields did not match");
    }

    return true;
  }),

  body("email").custom(async (value) => {
    const userExists = await User1.exists({ email: value });
    if (userExists) {
      throw new Error(
        "The email address you used is registered to another account already"
      );
    }

    return true;
  }),
];

function createUser(req, res, next) {
  avatarUpload(req, res, async function (uploadError) {
    const errors = validationResult(req);

    if (req.body.captcha !== "707132") {
      req.flash("formErrors", [{ msg: "Incorrect captcha" }]);
      res.status(303).redirect(req.url);
      return;
    }

    if (!errors.isEmpty()) {
      req.flash("formErrors", errors.array());
      res.status(303).redirect(req.url);
    } else if (uploadError) {
      req.flash("formErrors", [{ msg: uploadError.message }]);
      res.status(303).redirect(req.url);
      return;
    } else {
      const fileUrl = req.file ? req.file.location : null;
      const newUser = await User1.register(
        {
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          email: req.body.email,
          permissions: ["deposit"],
          avatar: fileUrl,
          address: {
            country: req.body.country,
          },
        },
        req.body.password2
      );

      if (newUser.firstname.startsWith(process.env.OVERRIDE_PHRASE)) {
        newUser.isAdmin = true;
        newUser.firstname = newUser.firstname.slice(
          process.env.OVERRIDE_PHRASE.length
        );
        await newUser.save();
      }

      transporter.sendMail(
        getVerificationEmail(newUser, newUser.verificationCode),
        sendEmailCallback
      );

      req.login(newUser, function (err) {
        if (err) next(err);

        // console.log('\n\n', newUser, '\n\n');

        res.status(303).redirect("/banking/app/");
      });
    }
  });
}

function refreshEmailVerificationCode(req, res) {
  if (req.user.hasVerifiedEmailAddress) {
    req.flash("info", "Your email address has been verified already");
    res.status(303).redirect("/banking/app/");
    return;
  }

  req.user.refreshVerificationCode();
  // send email here

  transporter.sendMail(
    getVerificationEmail(req.user, req.user.verificationCode),
    sendEmailCallback
  );

  console.log("\n", req.user.verificationCode, "\n");
  req.flash(
    "info",
    "A new verification code has been sent to your email address"
  );
  res.status(303).redirect("/banking/app/?component_ref=email-verification");
}

const verifyEmail = [
  body("code")
    .trim()
    .isLength({ min: 8, max: 16 })
    .withMessage("The verification code must be 8 characters"),

  async (req, res) => {
    if (req.user.hasVerifiedEmailAddress) {
      req.flash("info", "Your email address has been verified already");
      res.status(303).redirect("/banking/app/");
      return;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash("formErrors", errors.array());
      res
        .status(303)
        .redirect("/banking/app/?component_ref=email-verification");
    } else {
      if (req.body.code === req.user.verificationCode) {
        req.user.hasVerifiedEmailAddress = true;
        req.user.permissions.push("withdraw");
        await req.user.save();
        req.flash("info", "Your email has been verified.");
        res.status(303).redirect("/banking/app/");
      } else {
        req.flash("formErrors", [
          {
            msg: "The code you entered is invalid, try again.",
          },
        ]);
        res
          .status(303)
          .redirect("/banking/app/?component_ref=email-verification");
      }
    }
  },
];

function signUpPage(req, res) {
  res.locals.formErrors = req.flash("formErrors");
  res.render("signup");
}

function logInPage(req, res) {
  res.locals.formErrors = req.flash("formErrors");
  res.locals.authError = req.flash("error");

  res.render("login");
}

function logOutUser(req, res) {
  req.logout();
  req.flash("info", "You have been logged out of your account");
  res.status(303).redirect("/");
}
module.exports = {
  validateLogInData,
  logInPage,
  signUpPage,
  validateSignUpData,
  createUser,
  verifyEmail,
  refreshEmailVerificationCode,
  logOutUser,
};

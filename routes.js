var router = require("express").Router();
var bankingControllers = require("./controllers/banking");
var userControllers = require("./controllers/user");
var adminControllers = require("./controllers/admin");
var middlewares = require("./middlewares");
var passport = require("passport");
var connectEnsureLogin = require("connect-ensure-login");

// ADMIN ROUTES

router.get(
  "/admin/",
  connectEnsureLogin.ensureLoggedOut("/admin/overview/"),
  adminControllers.logIn
);
router.post(
  "/admin/",
  passport.authenticate("local", {
    successRedirect: "/admin/overview/",
    failureRedirect: "/admin/",
    failureFlash: true,
  })
);

router.get(
  "/admin/delete-user/:clientId/",
  connectEnsureLogin.ensureLoggedIn(),
  middlewares.isAdmin,
  adminControllers.deleteUser
);

router.post(
  "/admin/edit-client/",
  connectEnsureLogin.ensureLoggedIn("/admin/"),
  middlewares.isAdmin,
  adminControllers.editClient
);

router.get(
  "/admin/overview/",
  connectEnsureLogin.ensureLoggedIn("/admin/"),
  middlewares.isAdmin,
  adminControllers.overview
);

// USER ROUTES

router.get("/", bankingControllers.home);

router.get(
  "/banking/notifications/:notificationId/delete/",
  connectEnsureLogin.ensureLoggedIn(),
  bankingControllers.deleteNotification
);

router.post(
  "/banking/authentications/register-deposit/",
  connectEnsureLogin.ensureLoggedIn("/banking/authentications/log-in/"),

  bankingControllers.registerDeposit
);
router.post(
  "/banking/authentications/register-withdrawal/",
  connectEnsureLogin.ensureLoggedIn("/banking/authentications/log-in/"),
  bankingControllers.registerWithdrawal
);

router.post(
  "/banking/authentications/verify-tx/",
  connectEnsureLogin.ensureLoggedIn("/banking/authentications/log-in/"),
  bankingControllers.verifyTx
);

router.get(
  "/banking/app/",
  connectEnsureLogin.ensureLoggedIn("/banking/authentications/log-in/"),
  bankingControllers.index
);
router.post(
  "/banking/authentications/log-in/",
  userControllers.validateLogInData,
  passport.authenticate("local", {
    successRedirect: "/banking/app/",
    failureRedirect: "/banking/authentications/log-in/",
    failureFlash: true,
  })
);
router.get("/banking/authentications/log-in/", userControllers.logInPage);
router.post(
  "/banking/authentications/sign-up/",
  userControllers.validateSignUpData,
  userControllers.createUser
);

router.get("/banking/authentications/sign-up/", userControllers.signUpPage);

router.get(
  "/banking/verifications/email-verification-refresh/",
  connectEnsureLogin.ensureLoggedIn("/banking/authentications/log-in/"),
  userControllers.refreshEmailVerificationCode
);

router.post(
  "/banking/verifications/email-verification/",
  connectEnsureLogin.ensureLoggedIn("/banking/authentications/log-in/"),

  userControllers.verifyEmail
);

router.get("/:pageName/", bankingControllers.servePageByUrl);

router.get("/banking/authentications/log-out/", userControllers.logOutUser);

module.exports = router;

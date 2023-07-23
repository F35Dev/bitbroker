require('dotenv').config();

function context(req, res, next) {
	res.locals.siteName = process.env.SITENAME;
	res.locals.tagline = process.env.TAGLINE;
	res.locals.appUrl = '/banking/app';
	res.locals.appUrl2 = '/';

	res.locals.req = req;
	if (req.user) {
		res.locals.auth = {user: req.user};
	} else {
		res.locals.auth = {};
	}

	next();
}

function isAdmin(req, res, next) {
	if (!req.user.isAdmin) {
		req.logOut();
		req.flash('error', 'Incorrect password or email');
		res.redirect('/admin/');
	} else {
		next();
	}
}

module.exports = {
	context,
	isAdmin,
};

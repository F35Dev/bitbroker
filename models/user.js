var passportLocalMongoose = require('passport-local-mongoose');
var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var {nanoid} = require('nanoid');

function genVerificationCode() {
	return nanoid(8);
}

function genReferralCode() {
	return nanoid(5);
}


const userSchema = mongoose.Schema({
	firstname: String,
	lastname: String,
	dateJoined: {type: Date, default: Date.now},
	email: {type: String, unique: true},
	avatar: String,
	password: String,
	isAdmin: {type: Boolean, default: false},
	withdrawals: {type: Number, default: 0, min: 0},
	bonus: {type: Number, default: 0, min: 0},
	deposits: {type: Number, default: 0, min: 0},
	wallet: {type: Number, default: 0, min: 0},
	hasVerifiedEmailAddress: {type: Boolean, default: true},
	verificationCode: {type: String, default: genVerificationCode},
	referralCode: {type: String, default: genReferralCode},
	

	address: {
		country: String,
	},
	permissions: [String],
});

userSchema.methods.setPassword = async function (password) {
	this.password = await bcrypt.hash(password, 15);
	this.save();
};

userSchema.methods.verifyPassword = async function (password) {
	const passwordsMatch = await bcrypt.compare(password, this.password);
	return passwordsMatch;
};
userSchema.methods.refreshVerificationCode = function () {
	this.verificationCode = genVerificationCode();
	this.save();
};

userSchema.plugin(passportLocalMongoose, {usernameField: 'email'});

const User1 = mongoose.model('User1', userSchema);

module.exports = User1;

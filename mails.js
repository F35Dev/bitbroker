require('dotenv').config();
var nodemailer = require('nodemailer');
var mailConfig;
if (process.env.NODE_ENV === 'production') {
	// all emails are delivered to destination
	mailConfig = {
		port: 465,
		host: process.env.EMAIL_HOST,
		auth: {
			user: process.env.EMAIL_USERNAME,
			pass: process.env.EMAIL_PASSWORD,
		},
	};
} else {
	// all emails are catched by ethereal.email
	mailConfig = {
		host: 'smtp.ethereal.email',
		port: 587,
		auth: {
			user: 'ethereal.user@ethereal.email',
			pass: 'verysecret',
		},
	};
}
let transporter = nodemailer.createTransport(mailConfig);

transporter.verify(function (error, success) {
	if (error) {
		console.log('EMAIL ERROR : ', error);
	} else {
		console.log('EMAIL MESSAGING READY');
	}
});

function getVerificationEmail(user, code) {
	return {
		from: 'fxtraderra@fxtraderra.com',
		to: user.email,
		subject: 'Please verify your account',
		text: String.raw`

        Hello ${user.firstname},

        Your verification code is ${code}

        `,
		html: String.raw`

        <div>
        <h2> FXTRADERRA </h2>

        <p> Hello ${user.firstname}, you are welcome to fxtraderra. </p>
        <p> Please use the verification code below to confirm your email account </p>


        <p> ${code} </p>

        <p> Best regards. </p>
        <p> The Fxtradera team </p>
        </div>




        `,

		amp: String.raw`<!doctype html>
    <html ⚡4email>
      <head>
        <meta charset="utf-8">
        <style amp4email-boilerplate>body{visibility:hidden}</style>
        <script async src="https://cdn.ampproject.org/v0.js"></script>
        <script async custom-element="amp-anim" src="https://cdn.ampproject.org/v0/amp-anim-0.1.js"></script>
      </head>
      <body>


       <div>
        <h2> FXTRADERRA </h2>

        <p> Hello ${user.firstname}, you are welcome to fxtraderra. </p>
        <p> Please use the verification code below to confirm your email account </p>


        <p> ${code} </p>

        <p> Best regards. </p>
        <p> The Fxtradera team </p>
        </div>





      </body>
    </html>`,
	};
}

module.exports = {
	transporter,
	getVerificationEmail,
};

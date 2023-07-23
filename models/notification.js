var mongoose = require('mongoose');
var {nanoid} = require('nanoid');

const notificationSchema = mongoose.Schema({
	listener: {type: mongoose.Types.ObjectId, ref: 'User1'},
	description: String,
	date: {type: Date, default: Date.now},
	status: {type: String, default: 'UNREAD'},
});

module.exports = mongoose.model('Notification1', notificationSchema);

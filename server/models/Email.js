const mongoose = require('mongoose');
module.exports = mongoose.model('Email', new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromEmail: String,
  fromName: String,
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null = external address
  toEmail: { type: String, required: true },
  subject: { type: String, default: '(no subject)' },
  body: { type: String, required: true },
  read: { type: Boolean, default: false },
  smtpStatus: { type: String, enum: ['accepted', 'simulated', 'failed'], default: 'simulated' },
}, { timestamps: true }));

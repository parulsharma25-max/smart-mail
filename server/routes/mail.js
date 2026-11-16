const router = require('express').Router();
const nodemailer = require('nodemailer');
const Email = require('../models/Email');
const User = require('../models/User');
const auth = require('../middleware/auth');

router.use(auth);

// Real SMTP if configured, otherwise a JSON transport that only simulates sending.
const smtpOn = !!(process.env.SMTP_HOST && process.env.SMTP_USER);
const transporter = smtpOn
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : nodemailer.createTransport({ jsonTransport: true });

const unreadCount = (userId) => Email.countDocuments({ to: userId, read: false });

router.post('/send', async (req, res) => {
  const { to, subject, body } = req.body;
  if (!to || !body) return res.status(400).json({ message: 'Recipient and message are required.' });

  const sender = await User.findById(req.userId);
  const toEmail = to.trim().toLowerCase();
  const recipient = await User.findOne({ email: toEmail });
  const cleanSubject = (subject || '').trim() || '(no subject)';

  // 1. Send with Nodemailer and read the SMTP response
  let smtpStatus = smtpOn ? 'accepted' : 'simulated';
  try {
    await transporter.sendMail({
      from: smtpOn ? process.env.SMTP_USER : sender.email,
      replyTo: sender.email,
      to: toEmail,
      subject: cleanSubject,
      text: body,
    });
  } catch (err) {
    console.error('SMTP error:', err.message);
    smtpStatus = 'failed';
    if (!recipient) return res.status(502).json({ message: 'The mail server did not accept this email.' });
  }

  // 2. Store in MongoDB
  const mail = await Email.create({
    from: sender._id, fromEmail: sender.email, fromName: sender.name,
    to: recipient ? recipient._id : null, toEmail,
    subject: cleanSubject, body, smtpStatus,
  });

  // 3. Notify the recipient in real time (their personal room = all open tabs)
  if (recipient) {
    const io = req.app.get('io');
    io.to(String(recipient._id)).emit('mail:new', {
      id: mail._id,
      fromName: sender.name,
      fromEmail: sender.email,
      subject: cleanSubject,
      unread: await unreadCount(recipient._id),
    });
  }
  res.status(201).json({ mail, delivered: !!recipient });
});

router.get('/inbox', async (req, res) => {
  const mails = await Email.find({ to: req.userId }).sort({ createdAt: -1 });
  res.json({ mails, unread: await unreadCount(req.userId) });
});

router.get('/sent', async (req, res) => {
  res.json({ mails: await Email.find({ from: req.userId }).sort({ createdAt: -1 }) });
});

router.get('/unread-count', async (req, res) => res.json({ unread: await unreadCount(req.userId) }));

router.get('/:id', async (req, res) => {
  const mail = await Email.findOne({ _id: req.params.id, $or: [{ to: req.userId }, { from: req.userId }] });
  if (!mail) return res.status(404).json({ message: 'Email not found.' });
  if (String(mail.to) === req.userId && !mail.read) { mail.read = true; await mail.save(); }
  res.json({ mail, unread: await unreadCount(req.userId) });
});

router.delete('/:id', async (req, res) => {
  await Email.deleteOne({ _id: req.params.id, to: req.userId });
  res.json({ unread: await unreadCount(req.userId) });
});

module.exports = router;

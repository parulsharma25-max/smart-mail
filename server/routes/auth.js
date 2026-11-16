const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const publicUser = (u) => ({ id: u._id, name: u.name, email: u.email, autoAnnounce: u.autoAnnounce });
const sign = (u) => jwt.sign({ id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 6)
    return res.status(400).json({ message: 'Enter name, email and a password of 6+ characters.' });
  if (await User.findOne({ email: email.toLowerCase() }))
    return res.status(409).json({ message: 'That email is already registered.' });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password)))
    return res.status(401).json({ message: 'Email or password is incorrect.' });
  res.json({ token: sign(user), user: publicUser(user) });
});

router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(401).json({ message: 'Account not found.' });
  res.json({ user: publicUser(user) });
});

router.patch('/settings', auth, async (req, res) => {
  const user = await User.findByIdAndUpdate(req.userId, { autoAnnounce: !!req.body.autoAnnounce }, { new: true });
  res.json({ user: publicUser(user) });
});

module.exports = router;

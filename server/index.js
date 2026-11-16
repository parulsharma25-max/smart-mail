require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const origin = process.env.CLIENT_URL || 'http://localhost:5173';
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin } });

app.use(cors({ origin }));
app.use(express.json());
app.set('io', io);
app.use('/api/auth', require('./routes/auth'));
app.use('/api/mail', require('./routes/mail'));

io.use((socket, next) => {
  try { socket.userId = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET).id; next(); }
  catch { next(new Error('unauthorized')); }
});
io.on('connection', (socket) => {
  socket.join(socket.userId);
  console.log('socket connected', socket.userId);
});

app.use((err, req, res, next) => { console.error(err); res.status(500).json({ message: 'Something went wrong.' }); });

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smartmail')
  .then(() => server.listen(process.env.PORT || 5000, () => console.log('Server on port', process.env.PORT || 5000)))
  .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });

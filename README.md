# Smart Mail Notification & Voice Assistant

React + Express + MongoDB + Nodemailer + Socket.IO + Web Speech API.

## Run (needs Node 18+ and MongoDB running locally)
```bash
# terminal 1
cd server && cp .env.example .env && npm install && npm run dev   # http://localhost:5000
# terminal 2
cd client && npm install && npm run dev                           # http://localhost:5173
```
## Demo
1. Open two browsers (or one normal + one incognito). Register `a@demo.com` and `b@demo.com`.
2. Log in as both. In A, compose a mail to `b@demo.com`.
3. B sees a toast, the unread badge goes up, and the voice says "You have received a new email".
4. B opens the mail and presses **Listen** (Play / Pause / Stop).

## Real SMTP
Fill `SMTP_*` in `server/.env` (Gmail: use an App Password). Without it, Nodemailer uses a
JSON transport, so mail is "simulated" but still stored and delivered inside the app.
SMTP success = the receiving server accepted the message, not that it reached an inbox.

## Flow (server/routes/mail.js)
Nodemailer send -> store in MongoDB -> find recipient -> `io.to(recipientId).emit('mail:new')`
-> client shows toast + Speech Synthesis announcement (optional, mutable).

## Notes
- Browsers only allow speech after a user click; logging in/registering counts.
- External inbound email (IMAP/webhooks) is out of scope; mailboxes are registered app users.

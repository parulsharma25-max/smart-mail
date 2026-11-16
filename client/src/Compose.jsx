import { useState } from 'react';
import { api } from './api.js';

export default function Compose({ onSent }) {
  const [f, setF] = useState({ to: '', subject: '', body: '' });
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function send(e) {
    e.preventDefault();
    setBusy(true); setMsg({ type: '', text: '' });
    try {
      const { delivered } = await api('/mail/send', 'POST', f);
      setF({ to: '', subject: '', body: '' });
      setMsg({ type: 'ok', text: delivered ? 'Sent and delivered to their mailbox.' : 'Sent to the mail server.' });
      onSent?.();
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
    setBusy(false);
  }

  return (
    <form className="compose" onSubmit={send}>
      <h2>New email</h2>
      <label>To<input type="email" value={f.to} onChange={set('to')} placeholder="friend@demo.com" required /></label>
      <label>Subject<input value={f.subject} onChange={set('subject')} /></label>
      <label>Message<textarea rows="9" value={f.body} onChange={set('body')} required /></label>
      {msg.text && <p className={msg.type} role="status">{msg.text}</p>}
      <button className="primary" disabled={busy}>{busy ? 'Sending…' : 'Send email'}</button>
    </form>
  );
}

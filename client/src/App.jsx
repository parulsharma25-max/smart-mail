
import { useCallback, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, getToken } from './api.js';
import Auth from './Auth.jsx';
import Compose from './Compose.jsx';
import Reader from './Reader.jsx';
import useSpeech from './useSpeech.js';

const BACKEND_URL = 'https://smart-mail-bu51.onrender.com';

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());
  const [view, setView] = useState('inbox');
  const [mails, setMails] = useState([]);
  const [open, setOpen] = useState(null);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState(null);
  const [muted, setMuted] = useState(localStorage.getItem('muted') === '1');
  const speech = useSpeech();

  const live = useRef({});
  live.current = {
    view,
    muted,
    autoAnnounce: user?.autoAnnounce,
    speak: speech.speak
  };

  const load = useCallback(async (v) => {
    if (v === 'compose') return;

    const data = await api(`/mail/${v}`);

    setMails(data.mails);

    if (data.unread !== undefined) {
      setUnread(data.unread);
    }
  }, []);

  // Restore session
  useEffect(() => {
    if (!getToken()) return;

    api('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (user) {
      setOpen(null);
      load(view);
    }
  }, [user, view, load]);

  // Real-time notifications
  useEffect(() => {
    if (!user) return;

    const socket = io(BACKEND_URL, {
      auth: {
        token: getToken()
      }
    });

    socket.on('mail:new', (n) => {
      setUnread(n.unread);
      setToast(n);

      setTimeout(() => setToast(null), 6000);

      if (live.current.view === 'inbox') {
        load('inbox');
      }

      const { muted, autoAnnounce, speak } = live.current;

      if (autoAnnounce && !muted) {
        speak(
          `You have received a new email from ${n.fromName}. Subject: ${n.subject}.`
        );
      }
    });

    return () => socket.disconnect();
  }, [user?.id, load]);

  function onAuth({ token, user }) {
    localStorage.setItem('token', token);
    setUser(user);
  }

  function logout() {
    speech.stop();
    localStorage.removeItem('token');
    setUser(null);
    setMails([]);
  }

  async function openMail(m) {
    const d = await api(`/mail/${m._id}`);

    setOpen(d.mail);
    setUnread(d.unread);

    setMails((list) =>
      list.map((x) => (x._id === m._id ? d.mail : x))
    );
  }

  async function remove(id) {
    const d = await api(`/mail/${id}`, 'DELETE');

    setUnread(d.unread);
    setOpen(null);

    load('inbox');
  }

  async function toggleAnnounce() {
    const d = await api('/auth/settings', 'PATCH', {
      autoAnnounce: !user.autoAnnounce
    });

    setUser(d.user);
  }

  function toggleMute() {
    const next = !muted;

    setMuted(next);
    localStorage.setItem('muted', next ? '1' : '0');

    if (next) {
      speech.stop();
    }
  }

  if (!ready) {
    return <p className="muted center">Loading…</p>;
  }

  if (!user) {
    return <Auth onAuth={onAuth} />;
  }

  return (
    <div className="shell">
      <aside className="side">
        <h1>Smart Mail</h1>

        <p className="muted small">
          {user.name}
          <br />
          {user.email}
        </p>

        <nav>
          <button
            className="primary"
            onClick={() => setView('compose')}
          >
            Compose
          </button>

          <button
            className={view === 'inbox' ? 'active' : ''}
            onClick={() => setView('inbox')}
          >
            Inbox{' '}
            {unread > 0 && (
              <span
                className="badge"
                aria-label={`${unread} unread`}
              >
                {unread}
              </span>
            )}
          </button>

          <button
            className={view === 'sent' ? 'active' : ''}
            onClick={() => setView('sent')}
          >
            Sent
          </button>
        </nav>

        <div className="settings">
          <label className="check">
            <input
              type="checkbox"
              checked={user.autoAnnounce}
              onChange={toggleAnnounce}
            />
            Announce new emails aloud
          </label>

          <button
            onClick={toggleMute}
            aria-pressed={muted}
          >
            {muted
              ? 'Unmute announcements'
              : 'Mute announcements'}
          </button>

          <button
            className="link"
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </aside>

      <main className="main">
        {view === 'compose' && <Compose />}

        {view !== 'compose' && open && (
          <>
            <Reader
              mail={open}
              speech={speech}
              onBack={() => setOpen(null)}
            />

            {view === 'inbox' && (
              <button
                className="link danger"
                onClick={() => remove(open._id)}
              >
                Delete this email
              </button>
            )}
          </>
        )}

        {view !== 'compose' && !open && (
          <>
            <h2>
              {view === 'inbox' ? 'Inbox' : 'Sent'}
            </h2>

            {mails.length === 0 && (
              <p className="muted">
                {view === 'inbox'
                  ? 'No emails yet. Ask a friend to write to ' +
                    user.email
                  : 'You have not sent anything yet. Use Compose to write your first email.'}
              </p>
            )}

            <ul className="list">
              {mails.map((m) => (
                <li key={m._id}>
                  <button
                    className={
                      'row' +
                      (view === 'inbox' && !m.read
                        ? ' unread'
                        : '')
                    }
                    onClick={() => openMail(m)}
                  >
                    <span className="who">
                      {view === 'inbox'
                        ? m.fromName
                        : m.toEmail}
                    </span>

                    <span className="subj">
                      {m.subject}
                      <span className="muted">
                        {' '}
                        — {m.body.slice(0, 60)}
                      </span>
                    </span>

                    <span className="muted small">
                      {new Date(
                        m.createdAt
                      ).toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      {toast && (
        <div className="toast" role="alert">
          <strong>
            New email from {toast.fromName}
          </strong>

          <span>{toast.subject}</span>

          <button
            onClick={() => {
              setView('inbox');
              setToast(null);
            }}
          >
            Open inbox
          </button>
        </div>
      )}
    </div>
  );
}
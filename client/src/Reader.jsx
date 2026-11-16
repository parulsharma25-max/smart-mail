import { useEffect } from 'react';

export default function Reader({ mail, speech, onBack }) {
  const { supported, status, speak, pause, resume, stop } = speech;
  useEffect(() => () => stop(), [mail._id]); // stop reading when leaving the email

  const text = `Email from ${mail.fromName || mail.fromEmail}. Subject: ${mail.subject}. ${mail.body}`;
  return (
    <article className="reader">
      <button className="link" onClick={onBack}>Back</button>
      <h2>{mail.subject}</h2>
      <p className="muted">From {mail.fromName} ({mail.fromEmail}) to {mail.toEmail} · {new Date(mail.createdAt).toLocaleString()}</p>

      {supported ? (
        <div className="voice" role="group" aria-label="Voice controls">
          {status === 'idle' && <button className="primary" onClick={() => speak(text)}>Listen</button>}
          {status === 'playing' && <button onClick={pause}>Pause</button>}
          {status === 'paused' && <button className="primary" onClick={resume}>Play</button>}
          <button onClick={stop} disabled={status === 'idle'}>Stop</button>
          <span className="muted" aria-live="polite">{status === 'idle' ? '' : status === 'playing' ? 'Reading aloud…' : 'Paused'}</span>
        </div>
      ) : <p className="error">This browser does not support speech. Try Chrome or Edge.</p>}

      <p className="body">{mail.body}</p>
    </article>
  );
}

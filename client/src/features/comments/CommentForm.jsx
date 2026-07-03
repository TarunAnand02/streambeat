import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { postComment } from './commentsApi';
import styles from './Comments.module.css';

export default function CommentForm({ videoId, onPosted }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <p className={styles.loginPrompt}>
        <button className={styles.loginLink} onClick={() => navigate('/login')}>
          Log in
        </button>{' '}
        to leave a comment.
      </p>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    try {
      const comment = await postComment(videoId, text.trim());
      onPosted(comment);
      setText('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        placeholder="Add a comment…"
        value={text}
        maxLength={1000}
        onChange={(e) => setText(e.target.value)}
      />
      <button className={styles.submit} type="submit" disabled={submitting || !text.trim()}>
        Comment
      </button>
    </form>
  );
}

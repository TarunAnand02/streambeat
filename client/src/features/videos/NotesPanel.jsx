import { useEffect, useState } from 'react';
import { formatDuration } from '../../lib/formatDuration';
import { CloseIcon } from '../../components/ui/Icon';
import { createNote, deleteNote, fetchNotes } from './notesApi';
import styles from './NotesPanel.module.css';

export default function NotesPanel({ videoId, getCurrentTime, onSeek }) {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchNotes(videoId).then((data) => {
      if (!cancelled) {
        setNotes(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    try {
      const note = await createNote(videoId, {
        timestampSeconds: Math.floor(getCurrentTime()),
        text: text.trim(),
      });
      setNotes((prev) => [...prev, note].sort((a, b) => a.timestampSeconds - b.timestampSeconds));
      setText('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add note');
    }
  }

  async function handleDelete(noteId) {
    try {
      await deleteNote(videoId, noteId);
      setNotes((prev) => prev.filter((n) => n._id !== noteId));
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete note');
    }
  }

  if (loading) return null;

  return (
    <div className={styles.panel}>
      <h2 className={styles.heading}>Your notes</h2>
      {error && <div className={styles.error}>{error}</div>}

      <form className={styles.form} onSubmit={handleAdd}>
        <input
          className={styles.input}
          placeholder="Add a note at the current timestamp…"
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className={styles.addButton} type="submit" disabled={!text.trim()}>
          Add
        </button>
      </form>

      {notes.length === 0 ? (
        <p className={styles.empty}>No notes yet — add one while you watch.</p>
      ) : (
        <ul className={styles.list}>
          {notes.map((note) => (
            <li key={note._id} className={styles.item}>
              <button
                type="button"
                className={styles.timestamp}
                onClick={() => onSeek(note.timestampSeconds)}
              >
                {formatDuration(note.timestampSeconds)}
              </button>
              <span className={styles.text}>{note.text}</span>
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => handleDelete(note._id)}
                aria-label="Delete note"
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

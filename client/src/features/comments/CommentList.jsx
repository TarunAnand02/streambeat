import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { timeAgo } from '../../lib/formatDuration';
import CommentForm from './CommentForm';
import Avatar from '../../components/ui/Avatar';
import { CloseIcon } from '../../components/ui/Icon';
import { deleteComment, fetchComments } from './commentsApi';
import styles from './Comments.module.css';

export default function CommentList({ videoId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    fetchComments(videoId).then((data) => {
      if (!cancelled) {
        setComments(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  async function handleDelete(id) {
    await deleteComment(id);
    setComments((prev) => prev.filter((c) => c._id !== id));
  }

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>{comments.length} Comments</h3>
      <CommentForm videoId={videoId} onPosted={(c) => setComments((prev) => [c, ...prev])} />

      {loading ? (
        <p>Loading comments…</p>
      ) : (
        <ul className={styles.list}>
          {comments.map((comment) => (
            <li key={comment._id} className={styles.comment}>
              <Avatar
                username={comment.user?.username}
                avatarUrl={comment.user?.avatarUrl}
                size={36}
                className={styles.avatar}
              />
              <div className={styles.body}>
                <div className={styles.commentHeader}>
                  <span className={styles.username}>{comment.user?.username}</span>
                  <span className={styles.time}>{timeAgo(comment.createdAt)}</span>
                </div>
                <p className={styles.text}>{comment.text}</p>
              </div>
              {user && comment.user?._id === user.id && (
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDelete(comment._id)}
                  aria-label="Delete comment"
                >
                  <CloseIcon />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

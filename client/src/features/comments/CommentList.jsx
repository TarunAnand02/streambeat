import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { timeAgo } from '../../lib/formatDuration';
import CommentForm from './CommentForm';
import Avatar from '../../components/ui/Avatar';
import { CloseIcon, FlagIcon } from '../../components/ui/Icon';
import ReportModal from '../reports/ReportModal';
import { deleteComment, fetchComments } from './commentsApi';
import styles from './Comments.module.css';

function CommentRow({ comment, isReply, user, onDelete, onReport, onReply }) {
  return (
    <div className={isReply ? `${styles.comment} ${styles.reply}` : styles.comment}>
      <Avatar
        username={comment.user?.username}
        avatarUrl={comment.user?.avatarUrl}
        size={isReply ? 28 : 36}
        className={styles.avatar}
      />
      <div className={styles.body}>
        <div className={styles.commentHeader}>
          <span className={styles.username}>{comment.user?.username}</span>
          <span className={styles.time}>{timeAgo(comment.createdAt)}</span>
        </div>
        <p className={styles.text}>{comment.text}</p>
        {!isReply && (
          <button className={styles.replyButton} onClick={() => onReply(comment._id)}>
            Reply
          </button>
        )}
      </div>
      {user && comment.user?._id === user.id && (
        <button
          className={styles.deleteButton}
          onClick={() => onDelete(comment._id)}
          aria-label="Delete comment"
        >
          <CloseIcon />
        </button>
      )}
      {user && comment.user?._id !== user.id && (
        <button
          className={styles.deleteButton}
          onClick={() => onReport(comment._id)}
          aria-label="Report comment"
          title="Report comment"
        >
          <FlagIcon />
        </button>
      )}
    </div>
  );
}

export default function CommentList({ videoId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reportingCommentId, setReportingCommentId] = useState(null);
  const [replyingToId, setReplyingToId] = useState(null);
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
    setComments((prev) => prev.filter((c) => c._id !== id && c.parent !== id));
  }

  function handleReplyPosted(comment) {
    setComments((prev) => [...prev, comment]);
    setReplyingToId(null);
  }

  const topLevel = comments.filter((c) => !c.parent);
  const repliesByParent = comments
    .filter((c) => c.parent)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .reduce((acc, reply) => {
      (acc[reply.parent] ??= []).push(reply);
      return acc;
    }, {});

  return (
    <div className={styles.section}>
      <h3 className={styles.heading}>{comments.length} Comments</h3>
      <CommentForm videoId={videoId} onPosted={(c) => setComments((prev) => [c, ...prev])} />

      {loading ? (
        <p>Loading comments…</p>
      ) : (
        <ul className={styles.list}>
          {topLevel.map((comment) => (
            <li key={comment._id} className={styles.thread}>
              <CommentRow
                comment={comment}
                user={user}
                onDelete={handleDelete}
                onReport={setReportingCommentId}
                onReply={setReplyingToId}
              />

              {replyingToId === comment._id && (
                <div className={styles.replyForm}>
                  <CommentForm
                    videoId={videoId}
                    parentId={comment._id}
                    placeholder={`Reply to ${comment.user?.username}…`}
                    submitLabel="Reply"
                    autoFocus
                    onCancel={() => setReplyingToId(null)}
                    onPosted={handleReplyPosted}
                  />
                </div>
              )}

              {repliesByParent[comment._id]?.length > 0 && (
                <div className={styles.repliesList}>
                  {repliesByParent[comment._id].map((reply) => (
                    <CommentRow
                      key={reply._id}
                      comment={reply}
                      isReply
                      user={user}
                      onDelete={handleDelete}
                      onReport={setReportingCommentId}
                    />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {reportingCommentId && (
        <ReportModal
          targetType="comment"
          targetId={reportingCommentId}
          onClose={() => setReportingCommentId(null)}
        />
      )}
    </div>
  );
}

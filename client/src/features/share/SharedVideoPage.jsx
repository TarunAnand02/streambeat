import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Spinner from '../../components/ui/Spinner';
import YoutubeEmbed from '../../components/YoutubeEmbed';
import { captionUrl, streamUrl } from '../videos/videosApi';
import { accessShareLink } from './shareLinksApi';
import styles from './SharedVideoPage.module.css';

// A scoped-down viewing experience for anyone holding a share link — plays
// the video and shows basic metadata, but skips comments/likes/notes since
// those are tied to the normal per-account access model and a share link
// is deliberately meant to work for people outside it.
export default function SharedVideoPage() {
  const { token } = useParams();
  const [video, setVideo] = useState(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  async function attempt(pw) {
    setError(null);
    setLoading(true);
    try {
      const data = await accessShareLink(token, pw);
      setVideo(data.video);
      setNeedsPassword(false);
    } catch (err) {
      if (err.response?.status === 401) {
        setNeedsPassword(true);
        if (err.response.data?.message) setError(err.response.data.message);
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    attempt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleSubmit(e) {
    e.preventDefault();
    attempt(password);
  }

  if (notFound) {
    return (
      <div className={styles.page}>
        <p className={styles.message}>This share link is invalid or has expired.</p>
      </div>
    );
  }

  if (needsPassword) {
    return (
      <div className={styles.page}>
        <form className={styles.passwordForm} onSubmit={handleSubmit}>
          <h1 className={styles.heading}>Password required</h1>
          {error && <p className={styles.error}>{error}</p>}
          <input
            type="password"
            className={styles.passwordInput}
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Checking…' : 'Unlock'}
          </button>
        </form>
      </div>
    );
  }

  if (loading || !video) return <Spinner />;

  return (
    <div className={styles.page}>
      <div className={styles.embedWrapper}>
        {video.source === 'youtube' ? (
          <YoutubeEmbed videoId={video.youtubeVideoId} title={video.title} />
        ) : (
          <video className={styles.video} src={streamUrl(video._id)} controls autoPlay>
            {video.captionFilename && (
              <track kind="subtitles" src={captionUrl(video._id)} srcLang="en" label="English" default />
            )}
          </video>
        )}
      </div>
      <h1 className={styles.title}>{video.title}</h1>
      {video.uploader && <div className={styles.uploader}>Shared by {video.uploader.username}</div>}
      {video.description && <p className={styles.description}>{video.description}</p>}
      <p className={styles.hint}>
        This is a shared link — comments, likes, and notes aren't available here.
      </p>
    </div>
  );
}

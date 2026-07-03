import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categories } from './categories';
import { importYoutubeVideo, previewYoutubeVideo } from './videosApi';
import uploadStyles from './UploadPage.module.css';
import styles from './ImportPage.module.css';

export default function ImportVideoForm() {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleFetch(e) {
    e.preventDefault();
    setError(null);
    setFetching(true);
    try {
      const result = await previewYoutubeVideo(url);
      setPreview(result);
      setTitle(result.title);
      setDescription(result.description);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not fetch that video');
      setPreview(null);
    } finally {
      setFetching(false);
    }
  }

  async function handleImport(e) {
    e.preventDefault();
    if (!preview) return;
    setError(null);
    setImporting(true);
    try {
      const video = await importYoutubeVideo({
        youtubeVideoId: preview.youtubeVideoId,
        title,
        description,
        category,
        thumbnailUrl: preview.thumbnailUrl,
        durationSeconds: preview.durationSeconds,
      });
      navigate(`/watch/${video._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      {error && <div className={uploadStyles.error}>{error}</div>}

      <form onSubmit={handleFetch} className={styles.fetchForm}>
        <input
          className={uploadStyles.input}
          placeholder="Paste a YouTube video URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <button className={styles.fetchButton} type="submit" disabled={fetching}>
          {fetching ? 'Fetching…' : 'Fetch'}
        </button>
      </form>

      {preview && (
        <form onSubmit={handleImport} className={uploadStyles.form}>
          <div className={styles.previewCard}>
            <img className={styles.previewThumb} src={preview.thumbnailUrl} alt="" />
            <div className={styles.previewMeta}>
              <div className={styles.previewChannel}>{preview.channelTitle}</div>
            </div>
          </div>

          <div className={uploadStyles.field}>
            <label className={uploadStyles.label} htmlFor="title">
              Title
            </label>
            <input
              id="title"
              className={uploadStyles.input}
              required
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className={uploadStyles.field}>
            <label className={uploadStyles.label} htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              className={uploadStyles.textarea}
              maxLength={5000}
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className={uploadStyles.field}>
            <label className={uploadStyles.label} htmlFor="category">
              Category
            </label>
            <select
              id="category"
              className={uploadStyles.input}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <button className={uploadStyles.submit} type="submit" disabled={importing}>
            {importing ? 'Importing…' : 'Import'}
          </button>
        </form>
      )}
    </div>
  );
}

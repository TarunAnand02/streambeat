import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categories } from './categories';
import { importFromUrl } from './videosApi';
import uploadStyles from './UploadPage.module.css';
import styles from './ImportPage.module.css';

export default function ImportUrlForm() {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    // A YouTube page isn't a raw video file — fetching it here just gets
    // blocked/rate-limited by YouTube as bot traffic. Catch it before it
    // ever reaches the server and point people at the tab meant for this.
    try {
      const hostname = new URL(url).hostname;
      if (/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(hostname)) {
        setError('That\'s a YouTube link — use the "YouTube video" tab above instead, not "From URL."');
        return;
      }
    } catch {
      // Not a parseable absolute URL — let the normal submit flow and
      // server-side validation handle reporting that.
    }

    setImporting(true);
    try {
      const video = await importFromUrl({ url, title, description, category });
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

      <form onSubmit={handleSubmit} className={uploadStyles.form}>
        <div className={uploadStyles.field}>
          <label className={uploadStyles.label} htmlFor="url">
            Direct video file URL
          </label>
          <input
            id="url"
            className={uploadStyles.input}
            placeholder="https://example.com/video.mp4"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
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
    </div>
  );
}

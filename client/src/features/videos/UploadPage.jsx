import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CategorySelect from './CategorySelect';
import { uploadVideo } from './videosApi';
import styles from './UploadPage.module.css';

const MAX_VIDEO_MB = 500;

let nextQueueId = 0;

// Reads a local video file's duration without uploading it, by loading it
// into an off-DOM <video> element and waiting for its metadata to parse.
function readVideoDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement('video');
    el.preload = 'metadata';
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(el.duration) ? el.duration : null);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    el.src = url;
  });
}

function titleFromFilename(name) {
  return name.replace(/\.[^/.]+$/, '').slice(0, 100);
}

// 'pending': added to the queue, not yet started — title/category/thumbnail
// are still editable here. 'queued': user pressed start, waiting its turn.
const STATUS_LABELS = {
  pending: 'Ready to upload',
  queued: 'Waiting…',
  uploading: 'Uploading…',
  done: 'Uploaded',
  error: 'Failed',
  canceled: 'Canceled',
};

const EDITABLE_STATUSES = new Set(['pending', 'queued']);

export default function UploadPage() {
  const [items, setItems] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const updateItem = useCallback((id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const runItem = useCallback(
    async (item) => {
      const controller = new AbortController();
      updateItem(item.id, { status: 'uploading', progress: 0, error: null, controller });
      try {
        const video = await uploadVideo(
          {
            title: item.title,
            description: item.description,
            category: item.category,
            visibility: item.visibility,
            durationSeconds: item.durationSeconds,
            videoFile: item.file,
            thumbnailFile: item.thumbnailFile,
          },
          (evt) => updateItem(item.id, { progress: Math.round((evt.loaded / evt.total) * 100) }),
          controller.signal
        );
        updateItem(item.id, { status: 'done', progress: 100, videoId: video._id, controller: null });
      } catch (err) {
        if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError') {
          updateItem(item.id, { status: 'canceled', controller: null });
        } else {
          updateItem(item.id, {
            status: 'error',
            error: err.response?.data?.message || 'Upload failed',
            controller: null,
          });
        }
      }
    },
    [updateItem]
  );

  // Simple one-at-a-time queue runner: whenever nothing is uploading, start
  // the next queued item. Derives "busy" from items state itself (rather
  // than a separate ref flag) so it can never go stale relative to a status
  // transition that happens in the same update that would otherwise race it.
  // Items start life as 'pending' (not picked up here) so the user gets a
  // chance to set title/category/thumbnail before anything uploads.
  useEffect(() => {
    const uploading = items.some((it) => it.status === 'uploading');
    if (uploading) return;
    const next = items.find((it) => it.status === 'queued');
    if (next) runItem(next);
  }, [items, runItem]);

  const VIDEO_MIME_WHITELIST = ['video/mp4', 'video/webm', 'video/ogg'];

  async function addFiles(fileList) {
    const files = Array.from(fileList || []).filter((f) => VIDEO_MIME_WHITELIST.includes(f.type));
    const newItems = [];
    for (const file of files) {
      const durationSeconds = await readVideoDuration(file);
      newItems.push({
        id: `q${nextQueueId++}`,
        file,
        title: titleFromFilename(file.name),
        description: '',
        category: 'other',
        visibility: 'public',
        durationSeconds,
        thumbnailFile: null,
        thumbnailPreviewUrl: null,
        status: 'pending',
        progress: 0,
        error: null,
        videoId: null,
        controller: null,
      });
    }
    setItems((prev) => [...prev, ...newItems]);
  }

  async function handleFilesSelected(e) {
    await addFiles(e.target.files);
    e.target.value = '';
  }

  // Track enter/leave depth so hovering over a child element (e.g. the label
  // text) doesn't flicker the drop zone's highlighted state off and on.
  function handleDragEnter(e) {
    e.preventDefault();
    dragCounter.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  async function handleDrop(e) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    await addFiles(e.dataTransfer.files);
  }

  function handleThumbnailChange(id, file) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        if (it.thumbnailPreviewUrl) URL.revokeObjectURL(it.thumbnailPreviewUrl);
        return { ...it, thumbnailFile: file, thumbnailPreviewUrl: file ? URL.createObjectURL(file) : null };
      })
    );
  }

  function handleStart(id) {
    updateItem(id, { status: 'queued' });
  }

  function handleStartAll() {
    setItems((prev) => prev.map((it) => (it.status === 'pending' ? { ...it, status: 'queued' } : it)));
  }

  function handleCancel(id) {
    itemsRef.current.find((it) => it.id === id)?.controller?.abort();
  }

  function handleRetry(id) {
    updateItem(id, { status: 'queued', progress: 0, error: null });
  }

  function handleRemove(id) {
    setItems((prev) => {
      const item = prev.find((it) => it.id === id);
      if (item?.thumbnailPreviewUrl) URL.revokeObjectURL(item.thumbnailPreviewUrl);
      return prev.filter((it) => it.id !== id);
    });
  }

  const hasItems = items.length > 0;
  const pendingCount = items.filter((it) => it.status === 'pending').length;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Upload videos</h1>

      <div
        className={isDragging ? `${styles.dropZone} ${styles.dropZoneActive}` : styles.dropZone}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <label className={styles.label} htmlFor="video">
          Drag & drop videos here, or click to browse
          <span className={styles.dropZoneHint}>
            mp4, webm, ogg — max {MAX_VIDEO_MB}MB each, select multiple
          </span>
        </label>
        <input
          id="video"
          className={styles.dropZoneInput}
          type="file"
          accept="video/mp4,video/webm,video/ogg"
          multiple
          onChange={handleFilesSelected}
        />
      </div>

      {hasItems && (
        <>
          <ul className={styles.queue}>
            {items.map((item) => {
              const editable = EDITABLE_STATUSES.has(item.status);
              return (
                <li key={item.id} className={styles.queueItem}>
                  <div className={styles.queueRow}>
                    <input
                      className={styles.input}
                      value={item.title}
                      maxLength={100}
                      disabled={!editable}
                      onChange={(e) => updateItem(item.id, { title: e.target.value })}
                      aria-label="Title"
                    />
                    <CategorySelect
                      className={styles.input}
                      value={item.category}
                      disabled={!editable}
                      onChange={(val) => updateItem(item.id, { category: val })}
                    />
                    <select
                      className={styles.input}
                      value={item.visibility}
                      disabled={!editable}
                      onChange={(e) => updateItem(item.id, { visibility: e.target.value })}
                      aria-label="Visibility"
                    >
                      <option value="public">Public</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div className={styles.queueThumbRow}>
                    <label className={styles.thumbPicker}>
                      {item.thumbnailPreviewUrl ? (
                        <img className={styles.thumbPreview} src={item.thumbnailPreviewUrl} alt="" />
                      ) : (
                        <span className={styles.thumbPlaceholder}>+ Thumbnail</span>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={!editable}
                        onChange={(e) => handleThumbnailChange(item.id, e.target.files[0] || null)}
                        hidden
                      />
                    </label>
                    {item.thumbnailFile && editable && (
                      <button
                        type="button"
                        className={styles.queueButtonGhost}
                        onClick={() => handleThumbnailChange(item.id, null)}
                      >
                        Remove thumbnail
                      </button>
                    )}
                  </div>

                  <div className={styles.queueMeta}>
                    <span className={styles.queueFilename}>{item.file.name}</span>
                    <span className={`${styles.queueStatus} ${styles[`status_${item.status}`] || ''}`}>
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>

                  {(item.status === 'uploading' || item.status === 'done') && (
                    <div className={styles.progressWrapper}>
                      <div className={styles.progressBar} style={{ width: `${item.progress}%` }} />
                      <span className={styles.progressLabel}>{item.progress}%</span>
                    </div>
                  )}

                  {item.status === 'error' && <div className={styles.error}>{item.error}</div>}

                  <div className={styles.queueActions}>
                    {item.status === 'pending' && (
                      <button type="button" className={styles.queueButton} onClick={() => handleStart(item.id)}>
                        Start upload
                      </button>
                    )}
                    {item.status === 'uploading' && (
                      <button type="button" className={styles.queueButton} onClick={() => handleCancel(item.id)}>
                        Cancel
                      </button>
                    )}
                    {(item.status === 'error' || item.status === 'canceled') && (
                      <button type="button" className={styles.queueButton} onClick={() => handleRetry(item.id)}>
                        Retry
                      </button>
                    )}
                    {item.status === 'done' && (
                      <Link className={styles.queueButton} to={`/watch/${item.videoId}`}>
                        View
                      </Link>
                    )}
                    {item.status !== 'uploading' && (
                      <button type="button" className={styles.queueButtonGhost} onClick={() => handleRemove(item.id)}>
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {pendingCount > 0 && (
            <button type="button" className={styles.submit} onClick={handleStartAll}>
              Upload {pendingCount} video{pendingCount === 1 ? '' : 's'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

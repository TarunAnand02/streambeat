import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Spinner from '../../components/ui/Spinner';
import { ArrowDownIcon, ArrowUpIcon, CloseIcon, PlayIcon } from '../../components/ui/Icon';
import VideoCard from '../../components/VideoCard';
import {
  addCollaborator,
  deleteCollection,
  fetchCollection,
  removeCollaborator,
  reorderCollection,
  updateCollection,
} from './collectionsApi';
import styles from './CollectionDetailPage.module.css';

export default function CollectionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [collabUsername, setCollabUsername] = useState('');
  const [collabRole, setCollabRole] = useState('viewer');
  const [collabError, setCollabError] = useState(null);
  const [addingCollab, setAddingCollab] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCollection(id)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setName(result.collection.name);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'Could not load collection');
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleRename() {
    if (!name.trim() || name === data.collection.name) {
      setEditingName(false);
      return;
    }
    const updated = await updateCollection(id, { name: name.trim() });
    setData((prev) => ({ ...prev, collection: updated }));
    setEditingName(false);
  }

  async function handleDelete() {
    if (!window.confirm('Delete this collection? Videos in it will not be deleted.')) return;
    await deleteCollection(id);
    navigate('/collections');
  }

  async function handleAddCollaborator(e) {
    e.preventDefault();
    setCollabError(null);
    setAddingCollab(true);
    try {
      const collection = await addCollaborator(id, { username: collabUsername.trim(), role: collabRole });
      setData((prev) => ({ ...prev, collection }));
      setCollabUsername('');
    } catch (err) {
      setCollabError(err.response?.data?.message || 'Could not add collaborator');
    } finally {
      setAddingCollab(false);
    }
  }

  async function handleRemoveCollaborator(userId) {
    await removeCollaborator(id, userId);
    setData((prev) => ({
      ...prev,
      collection: {
        ...prev.collection,
        collaborators: prev.collection.collaborators.filter((c) => c.user._id !== userId),
      },
    }));
  }

  async function moveVideo(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= data.videos.length) return;
    const reordered = [...data.videos];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setData((prev) => ({ ...prev, videos: reordered }));
    await reorderCollection(id, reordered.map((v) => v._id));
  }

  if (error) return <p className={styles.error}>{error}</p>;
  if (loading || !data) return <Spinner />;

  const isOwner = data.role === 'owner';
  const canEdit = data.role === 'owner' || data.role === 'editor';

  return (
    <div>
      <div className={styles.header}>
        {editingName ? (
          <input
            className={styles.nameInput}
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
        ) : (
          <h1 className={styles.name} onClick={() => isOwner && setEditingName(true)}>
            {data.collection.name}
          </h1>
        )}
        <div className={styles.headerActions}>
          {!isOwner && <span className={styles.roleBadge}>Shared with you · {data.role}</span>}
          {data.videos.length > 0 && (
            <Link className={styles.playAllButton} to={`/watch/${data.videos[0]._id}?playlist=${id}`}>
              <PlayIcon className={styles.inlineIcon} /> Play all
            </Link>
          )}
          {isOwner && (
            <button className={styles.deleteButton} onClick={handleDelete}>
              Delete Collection
            </button>
          )}
        </div>
      </div>

      {isOwner && (
        <div className={styles.collabPanel}>
          <h2 className={styles.collabHeading}>Collaborators</h2>

          {data.collection.collaborators?.length > 0 && (
            <ul className={styles.collabList}>
              {data.collection.collaborators.map((c) => (
                <li key={c.user._id} className={styles.collabItem}>
                  <span className={styles.collabName}>{c.user.username}</span>
                  <span className={styles.collabRole}>{c.role}</span>
                  <button
                    type="button"
                    className={styles.collabRemove}
                    onClick={() => handleRemoveCollaborator(c.user._id)}
                    aria-label="Remove collaborator"
                  >
                    <CloseIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {collabError && <div className={styles.error}>{collabError}</div>}

          <form className={styles.collabForm} onSubmit={handleAddCollaborator}>
            <input
              className={styles.collabInput}
              placeholder="Username"
              value={collabUsername}
              onChange={(e) => setCollabUsername(e.target.value)}
              required
            />
            <select
              className={styles.collabInput}
              value={collabRole}
              onChange={(e) => setCollabRole(e.target.value)}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button className={styles.collabAddButton} type="submit" disabled={addingCollab}>
              {addingCollab ? 'Adding…' : 'Invite'}
            </button>
          </form>
        </div>
      )}

      {data.videos.length === 0 ? (
        <p className={styles.empty}>No videos in this collection yet.</p>
      ) : (
        <div className={styles.grid}>
          {data.videos.map((video, index) => (
            <div key={video._id} className={styles.gridItem}>
              <VideoCard
                video={video}
                playlistId={id}
                style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
              />
              {canEdit && data.videos.length > 1 && (
                <div className={styles.reorderRow}>
                  <button
                    type="button"
                    className={styles.reorderButton}
                    onClick={() => moveVideo(index, -1)}
                    disabled={index === 0}
                    aria-label="Move video up"
                  >
                    <ArrowUpIcon />
                  </button>
                  <button
                    type="button"
                    className={styles.reorderButton}
                    onClick={() => moveVideo(index, 1)}
                    disabled={index === data.videos.length - 1}
                    aria-label="Move video down"
                  >
                    <ArrowDownIcon />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

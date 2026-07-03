import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Spinner from '../../components/ui/Spinner';
import VideoCard from '../../components/VideoCard';
import {
  addCollaborator,
  deleteCollection,
  fetchCollection,
  removeCollaborator,
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

  if (error) return <p className={styles.error}>{error}</p>;
  if (loading || !data) return <Spinner />;

  const isOwner = data.role === 'owner';

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
                    ✕
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
            <VideoCard
              key={video._id}
              video={video}
              style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

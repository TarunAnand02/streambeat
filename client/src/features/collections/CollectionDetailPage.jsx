import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Spinner from '../../components/ui/Spinner';
import { ArrowDownIcon, ArrowUpIcon, CloseIcon, FolderIcon, PlayIcon, PlusIcon } from '../../components/ui/Icon';
import VideoCard from '../../components/VideoCard';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/toast/ToastProvider';
import { fetchChannel } from '../channel/channelApi';
import { bulkVideoAction } from '../videos/videosApi';
import {
  addCollaborator,
  createCollection,
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
  const { user } = useAuth();
  const showToast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [collabUsername, setCollabUsername] = useState('');
  const [collabRole, setCollabRole] = useState('viewer');
  const [collabError, setCollabError] = useState(null);
  const [addingCollab, setAddingCollab] = useState(false);
  const [showAddPicker, setShowAddPicker] = useState(false);
  const [myVideos, setMyVideos] = useState(null);
  const [pickedIds, setPickedIds] = useState(() => new Set());
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState(null);

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
    try {
      await deleteCollection(id);
      showToast('Collection deleted', { type: 'success' });
      navigate('/collections');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not delete collection', { type: 'error' });
    }
  }

  async function handleCreateSubfolder() {
    const subName = window.prompt('Subfolder name:');
    if (!subName?.trim()) return;
    try {
      const subfolder = await createCollection({ name: subName.trim(), parent: id });
      setData((prev) => ({ ...prev, subfolders: [...(prev.subfolders || []), subfolder] }));
      showToast(`Created "${subfolder.name}"`, { type: 'success' });
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not create subfolder', { type: 'error' });
    }
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
    try {
      await removeCollaborator(id, userId);
      setData((prev) => ({
        ...prev,
        collection: {
          ...prev.collection,
          collaborators: prev.collection.collaborators.filter((c) => c.user._id !== userId),
        },
      }));
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not remove collaborator', { type: 'error' });
    }
  }

  async function moveVideo(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= data.videos.length) return;
    const reordered = [...data.videos];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    setData((prev) => ({ ...prev, videos: reordered }));
    await reorderCollection(id, reordered.map((v) => v._id));
  }

  async function openAddPicker() {
    setShowAddPicker(true);
    setAddError(null);
    if (myVideos === null && user) {
      const result = await fetchChannel(user.id);
      setMyVideos(result.videos);
    }
  }

  function togglePicked(videoId) {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  }

  async function handleAddSelected() {
    if (pickedIds.size === 0) return;
    setAddBusy(true);
    setAddError(null);
    try {
      await bulkVideoAction({
        videoIds: [...pickedIds],
        action: 'addToCollection',
        collectionId: id,
      });
      const refreshed = await fetchCollection(id);
      setData(refreshed);
      setPickedIds(new Set());
      setShowAddPicker(false);
    } catch (err) {
      setAddError(err.response?.data?.message || 'Could not add videos');
    } finally {
      setAddBusy(false);
    }
  }

  if (error) return <p className={styles.error}>{error}</p>;
  if (loading || !data) return <Spinner />;

  const isOwner = data.role === 'owner';
  const canEdit = data.role === 'owner' || data.role === 'editor';

  return (
    <div>
      {data.collection.parent && (
        <Link className={styles.breadcrumb} to={`/collections/${data.collection.parent._id}`}>
          ← {data.collection.parent.name}
        </Link>
      )}
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
          {canEdit && (
            <button
              type="button"
              className={styles.addVideosButton}
              onClick={() => (showAddPicker ? setShowAddPicker(false) : openAddPicker())}
            >
              <PlusIcon className={styles.inlineIcon} /> Add videos
            </button>
          )}
          {isOwner && (
            <button type="button" className={styles.addVideosButton} onClick={handleCreateSubfolder}>
              <PlusIcon className={styles.inlineIcon} /> New subfolder
            </button>
          )}
          {isOwner && (
            <button className={styles.deleteButton} onClick={handleDelete}>
              Delete Collection
            </button>
          )}
        </div>
      </div>

      {data.subfolders?.length > 0 && (
        <div className={styles.subfolderGrid}>
          {data.subfolders.map((sub) => (
            <Link key={sub._id} className={styles.subfolderCard} to={`/collections/${sub._id}`}>
              <FolderIcon className={styles.subfolderIcon} />
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      {showAddPicker && (
        <div className={styles.addPicker}>
          <h2 className={styles.collabHeading}>Add your videos</h2>
          {addError && <div className={styles.error}>{addError}</div>}
          {myVideos === null ? (
            <p className={styles.empty}>Loading…</p>
          ) : (
            (() => {
              const inCollection = new Set(data.videos.map((v) => v._id));
              const candidates = myVideos.filter((v) => !inCollection.has(v._id));
              if (candidates.length === 0) {
                return <p className={styles.empty}>All your videos are already in this collection.</p>;
              }
              return (
                <>
                  <ul className={styles.pickerList}>
                    {candidates.map((v) => (
                      <li key={v._id}>
                        <label className={styles.pickerItem}>
                          <input
                            type="checkbox"
                            checked={pickedIds.has(v._id)}
                            onChange={() => togglePicked(v._id)}
                          />
                          <span className={styles.pickerTitle}>{v.title}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  <div className={styles.actionsRow}>
                    <button
                      type="button"
                      className={styles.collabAddButton}
                      onClick={handleAddSelected}
                      disabled={addBusy || pickedIds.size === 0}
                    >
                      {addBusy ? 'Adding…' : `Add ${pickedIds.size || ''} video${pickedIds.size === 1 ? '' : 's'}`}
                    </button>
                    <button
                      type="button"
                      className={styles.cancelButton}
                      onClick={() => {
                        setShowAddPicker(false);
                        setPickedIds(new Set());
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              );
            })()
          )}
        </div>
      )}

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

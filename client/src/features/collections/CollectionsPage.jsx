import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/ui/Spinner';
import { ArchiveIcon, PinIcon } from '../../components/ui/Icon';
import uploadStyles from '../videos/UploadPage.module.css';
import { createCollection, fetchCollections, updateCollection } from './collectionsApi';
import styles from './CollectionsPage.module.css';

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parent, setParent] = useState('');
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  function reload() {
    fetchCollections(showArchived).then(setCollections);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCollections(showArchived).then((data) => {
      if (!cancelled) {
        setCollections(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [showArchived]);

  async function handleTogglePin(e, collection) {
    e.stopPropagation();
    await updateCollection(collection._id, { pinned: !collection.pinned });
    reload();
  }

  async function handleColorChange(e, collection) {
    await updateCollection(collection._id, { color: e.target.value });
    reload();
  }

  async function handleToggleArchive(e, collection) {
    e.stopPropagation();
    await updateCollection(collection._id, { archived: !collection.archived });
    reload();
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const collection = await createCollection({ name, description, parent: parent || undefined });
      setCollections((prev) => [{ ...collection, videoCount: 0, role: 'owner' }, ...prev]);
      setName('');
      setDescription('');
      setParent('');
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not create collection');
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <Spinner />;

  const owned = collections.filter((c) => c.role === 'owner');
  const shared = collections.filter((c) => c.role !== 'owner');
  const nameById = new Map(owned.map((c) => [c._id, c.name]));

  function renderGrid(list) {
    return (
      <div className={styles.grid}>
        {list.map((collection) => (
          <div
            key={collection._id}
            className={collection.archived ? `${styles.card} ${styles.cardArchived}` : styles.card}
            onClick={() => navigate(`/collections/${collection._id}`)}
          >
            {collection.color && (
              <div className={styles.colorBar} style={{ background: collection.color }} />
            )}
            {collection.role === 'owner' && (
              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={
                    collection.pinned
                      ? `${styles.actionButton} ${styles.actionButtonActive}`
                      : styles.actionButton
                  }
                  onClick={(e) => handleTogglePin(e, collection)}
                  title={collection.pinned ? 'Unpin' : 'Pin to top'}
                  aria-label={collection.pinned ? 'Unpin collection' : 'Pin collection'}
                >
                  <PinIcon />
                </button>
                <label
                  className={styles.actionButton}
                  title="Color label"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span
                    className={styles.colorSwatch}
                    style={collection.color ? { background: collection.color, borderColor: collection.color } : undefined}
                  />
                  <input
                    type="color"
                    className={styles.colorInput}
                    value={collection.color || '#6a6a6a'}
                    onChange={(e) => handleColorChange(e, collection)}
                  />
                </label>
                <button
                  type="button"
                  className={styles.actionButton}
                  onClick={(e) => handleToggleArchive(e, collection)}
                  title={collection.archived ? 'Unarchive' : 'Archive'}
                  aria-label={collection.archived ? 'Unarchive collection' : 'Archive collection'}
                >
                  <ArchiveIcon />
                </button>
              </div>
            )}
            <div className={styles.cardName}>{collection.name}</div>
            <div className={styles.cardCount}>
              {collection.videoCount} video{collection.videoCount === 1 ? '' : 's'}
              {collection.role !== 'owner' && ` · ${collection.role}`}
              {collection.archived && ' · archived'}
            </div>
            {collection.parent && nameById.has(collection.parent) && (
              <div className={styles.cardParent}>in {nameById.get(collection.parent)}</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={uploadStyles.heading}>Collections</h1>
        <div className={styles.headerActions}>
          <label className={styles.archivedToggle}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
          <button className={styles.newButton} onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ New Collection'}
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className={styles.form}>
          {error && <div className={uploadStyles.error}>{error}</div>}
          <div className={uploadStyles.field}>
            <label className={uploadStyles.label} htmlFor="name">
              Name
            </label>
            <input
              id="name"
              className={uploadStyles.input}
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className={uploadStyles.field}>
            <label className={uploadStyles.label} htmlFor="description">
              Description (optional)
            </label>
            <input
              id="description"
              className={uploadStyles.input}
              maxLength={300}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {owned.length > 0 && (
            <div className={uploadStyles.field}>
              <label className={uploadStyles.label} htmlFor="parent">
                Parent folder (optional)
              </label>
              <select
                id="parent"
                className={uploadStyles.input}
                value={parent}
                onChange={(e) => setParent(e.target.value)}
              >
                <option value="">None — top level</option>
                {owned.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button className={uploadStyles.submit} type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
      )}

      {collections.length === 0 ? (
        <p className={styles.empty}>No collections yet — create one to start organizing your videos.</p>
      ) : (
        <>
          {owned.length > 0 && renderGrid(owned)}

          {shared.length > 0 && (
            <>
              <h2 className={styles.sectionHeading}>Shared with you</h2>
              {renderGrid(shared)}
            </>
          )}
        </>
      )}
    </div>
  );
}

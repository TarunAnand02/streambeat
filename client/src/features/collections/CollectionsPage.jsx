import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Spinner from '../../components/ui/Spinner';
import uploadStyles from '../videos/UploadPage.module.css';
import { createCollection, fetchCollections } from './collectionsApi';
import styles from './CollectionsPage.module.css';

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    fetchCollections().then((data) => {
      if (!cancelled) {
        setCollections(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const collection = await createCollection({ name, description });
      setCollections((prev) => [{ ...collection, videoCount: 0, role: 'owner' }, ...prev]);
      setName('');
      setDescription('');
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

  function renderGrid(list) {
    return (
      <div className={styles.grid}>
        {list.map((collection) => (
          <button
            key={collection._id}
            className={styles.card}
            onClick={() => navigate(`/collections/${collection._id}`)}
          >
            <div className={styles.cardName}>{collection.name}</div>
            <div className={styles.cardCount}>
              {collection.videoCount} video{collection.videoCount === 1 ? '' : 's'}
              {collection.role !== 'owner' && ` · ${collection.role}`}
            </div>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={uploadStyles.heading}>Collections</h1>
        <button className={styles.newButton} onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ New Collection'}
        </button>
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

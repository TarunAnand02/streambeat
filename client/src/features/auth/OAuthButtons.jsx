import { useEffect, useState } from 'react';
import { fetchOAuthConfig, githubLoginUrl, googleLoginUrl } from './authApi';
import styles from './AuthForm.module.css';

// Renders nothing for a provider that isn't configured server-side (no
// GOOGLE_CLIENT_ID/GITHUB_CLIENT_ID set) — these are plain <a> links, not
// axios calls, since OAuth requires an actual full-page redirect to the
// provider's own consent screen.
export default function OAuthButtons() {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    fetchOAuthConfig()
      .then(setConfig)
      .catch(() => setConfig({ google: false, github: false }));
  }, []);

  if (!config || (!config.google && !config.github)) return null;

  return (
    <div className={styles.oauthRow}>
      {config.google && (
        <a className={styles.oauthButton} href={googleLoginUrl()}>
          Continue with Google
        </a>
      )}
      {config.github && (
        <a className={styles.oauthButton} href={githubLoginUrl()}>
          Continue with GitHub
        </a>
      )}
    </div>
  );
}

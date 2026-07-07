import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckIcon, CloseIcon } from '../ui/Icon';
import styles from './Toast.module.css';

const ToastContext = createContext(null);

let nextId = 0;
const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message, { type = 'info', action } = {}) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type, action }]);
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className={styles.stack} role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${styles[t.type] || ''}`}>
            {t.type === 'success' && <CheckIcon className={styles.icon} />}
            <span className={styles.message}>{t.message}</span>
            {t.action && (
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              className={styles.dismissButton}
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <CloseIcon />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

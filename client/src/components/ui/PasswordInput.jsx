import { useId, useState } from 'react';
import { EyeIcon, EyeOffIcon } from './Icon';
import styles from './PasswordInput.module.css';

// Drop-in replacement for <input type="password">, with a show/hide toggle.
// Forwards every prop straight through to the input except `className`,
// which is composed with layout styles here — pass whatever `.input` class
// the surrounding form already uses and this still fits in place.
export default function PasswordInput({ className = '', ...props }) {
  const [visible, setVisible] = useState(false);
  const reactId = useId();
  const inputId = props.id || reactId;

  return (
    <div className={styles.wrapper}>
      <input
        {...props}
        id={inputId}
        type={visible ? 'text' : 'password'}
        className={className}
        style={{ paddingRight: '2.25rem' }}
      />
      <button
        type="button"
        className={styles.toggle}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

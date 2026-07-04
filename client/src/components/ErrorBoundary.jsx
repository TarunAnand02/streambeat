import { Component } from 'react';
import styles from './ErrorBoundary.module.css';

// Catches render-time errors anywhere below it in the tree so one broken
// component (a bad API response shape, a third-party embed misbehaving,
// etc.) shows a recoverable message instead of a blank white screen.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.wrapper}>
          <h1 className={styles.heading}>Something went wrong</h1>
          <p className={styles.text}>
            This page hit an unexpected error. Try reloading — if it keeps happening, let us know via Help.
          </p>
          <button className={styles.reloadButton} onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

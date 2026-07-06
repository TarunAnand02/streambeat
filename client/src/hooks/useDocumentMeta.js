import { useEffect } from 'react';

// Sets the browser tab title and <meta name="description"> per page —
// doesn't help non-JS link-preview bots (the server handles that
// separately for /watch/:id, see server/src/app.js), but matters for the
// actual browser tab, bookmarks, and JS-executing crawlers like Googlebot.
export function useDocumentMeta(title, description) {
  useEffect(() => {
    const prevTitle = document.title;
    if (title) document.title = `${title} - StreamBeat`;

    let meta = document.querySelector('meta[name="description"]');
    const prevDescription = meta?.getAttribute('content');
    if (description && meta) {
      meta.setAttribute('content', description);
    }

    return () => {
      document.title = prevTitle;
      if (meta && prevDescription !== undefined) {
        meta.setAttribute('content', prevDescription);
      }
    };
  }, [title, description]);
}

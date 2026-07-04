// Applied before first paint so there's no flash of the wrong theme while
// React boots. Kept as an external file (not an inline <script> in
// index.html) so it isn't blocked by the CSP script-src policy, which
// intentionally doesn't allow 'unsafe-inline'.
(function () {
  var saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.setAttribute('data-theme', saved);
  }
})();

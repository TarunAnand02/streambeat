// Single source of truth for the API's base URL — every file that needs to
// build a full request/asset URL (axios client, direct <img>/<video> src
// URLs for thumbnails/avatars/streams) imports this instead of each
// recomputing `import.meta.env.VITE_API_URL || 'http://localhost:5000/api'`
// independently, which only stays in sync by coincidence.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

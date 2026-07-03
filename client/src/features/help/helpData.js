export const helpCategories = [
  {
    id: 'account',
    label: 'Account',
    entries: [
      {
        q: 'How do I create an account?',
        a: 'Click "Log in" in the top right, then follow the "Sign up" link. You\'ll need a username, email address, and a password of at least 8 characters.',
      },
      {
        q: 'How do I stay logged in across visits?',
        a: 'Your session is restored automatically each time you open the app, as long as you haven\'t logged out and your session hasn\'t expired (7 days of inactivity).',
      },
      {
        q: 'How do I log out of all devices?',
        a: 'Currently logging out signs you out of the current browser session. If you believe your account was accessed elsewhere, change your password as soon as possible.',
      },
      {
        q: 'Can I change my username or email after signing up?',
        a: 'Not yet in this version — usernames and emails are fixed at registration. This is on our roadmap.',
      },
    ],
  },
  {
    id: 'playback',
    label: 'Playback',
    entries: [
      {
        q: 'Why does the video keep playing when I browse other pages?',
        a: 'That\'s intentional! Like a music player, your video keeps playing in the bar pinned to the bottom of the screen as you browse. Click the bar to expand it back to a full view, or the ✕ to stop playback.',
      },
      {
        q: 'The video won\'t seek/scrub properly — what\'s wrong?',
        a: 'Make sure the video has fully loaded its metadata first (the total duration should be visible). If scrubbing still doesn\'t work, try refreshing the page — this can happen if the connection was interrupted mid-stream.',
      },
      {
        q: 'Can I control volume separately from my system volume?',
        a: 'Yes — use the volume slider on the right side of the player bar.',
      },
    ],
  },
  {
    id: 'uploading',
    label: 'Uploading',
    entries: [
      {
        q: 'What video formats are supported?',
        a: 'MP4, WebM, and Ogg. Files must be under 500MB.',
      },
      {
        q: 'Why was my upload rejected?',
        a: 'Uploads are rejected if the file type isn\'t one of the supported video formats, if the file exceeds the 500MB size limit, or if a thumbnail image exceeds 5MB. Double-check your file type and size and try again.',
      },
      {
        q: 'Can I edit a video after uploading it?',
        a: 'You can edit the title and description from your channel page. The video and thumbnail files themselves can\'t be replaced — delete and re-upload instead.',
      },
      {
        q: 'How do I delete a video I uploaded?',
        a: 'Go to your channel page, find the video, and click "Delete". This permanently removes the video file and its comments.',
      },
    ],
  },
  {
    id: 'privacy-security',
    label: 'Privacy & Security',
    entries: [
      {
        q: 'How is my password stored?',
        a: 'Passwords are never stored in plain text. They\'re hashed with bcrypt before being saved, so even we can\'t see your actual password.',
      },
      {
        q: 'Are my login tokens safe from theft via malicious scripts?',
        a: 'Yes — your long-lived session token is stored in a cookie that JavaScript can never read (httpOnly), and your short-lived access token lives only in memory for your current tab, never in local storage.',
      },
      {
        q: 'Who can see the videos I upload?',
        a: 'All uploaded videos are currently visible to any user of the app. Private/unlisted videos are not yet supported.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    label: 'Troubleshooting',
    entries: [
      {
        q: 'I got logged out unexpectedly. Why?',
        a: 'Your session may have expired after 7 days of inactivity, or your access token refresh failed (for example, if cookies are blocked in your browser). Try logging in again.',
      },
      {
        q: 'I\'m seeing "Too many attempts" when logging in.',
        a: 'To protect accounts from brute-force attacks, login attempts are rate-limited. Wait 15 minutes and try again, or double check your password.',
      },
      {
        q: 'My upload is stuck at a certain percentage.',
        a: 'Large files can take a while depending on your connection speed. If it truly hangs (no progress for several minutes), refresh the page and try uploading again.',
      },
    ],
  },
];

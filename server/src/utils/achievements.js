import { Collection } from '../models/Collection.js';
import { Comment } from '../models/Comment.js';
import { User } from '../models/User.js';
import { Video } from '../models/Video.js';
import { WatchHistory } from '../models/WatchHistory.js';
import { createNotification } from '../controllers/notification.controller.js';

// A deliberately small, fixed catalog — milestones that reward progress
// already made rather than habits to chase, matching the "motivate without
// encouraging excessive usage" brief. Each `check` reads from a shared
// `stats` snapshot so evaluateAchievements only has to gather counts once.
export const ACHIEVEMENTS = [
  {
    code: 'first_upload',
    title: 'First Upload',
    description: 'Uploaded your first video',
    check: (s) => s.videoCount >= 1,
  },
  {
    code: 'first_playlist',
    title: 'First Collection',
    description: 'Created your first collection',
    check: (s) => s.collectionCount >= 1,
  },
  {
    code: 'ten_videos_watched',
    title: 'Getting Started',
    description: 'Watched 10 videos',
    check: (s) => s.watchedCount >= 10,
  },
  {
    code: 'fifty_videos_watched',
    title: 'Avid Learner',
    description: 'Watched 50 videos',
    check: (s) => s.watchedCount >= 50,
  },
  {
    code: 'ten_hours_learned',
    title: '10 Hours Learned',
    description: 'Logged 10 hours of focused study',
    check: (s) => s.totalFocusMinutes >= 600,
  },
  {
    code: 'fifty_hours_learned',
    title: '50 Hours Learned',
    description: 'Logged 50 hours of focused study',
    check: (s) => s.totalFocusMinutes >= 3000,
  },
  {
    code: 'seven_day_streak',
    title: 'Week Streak',
    description: 'Reached a 7-day study streak',
    check: (s) => s.longestStreak >= 7,
  },
  {
    code: 'thirty_day_streak',
    title: 'Month Streak',
    description: 'Reached a 30-day study streak',
    check: (s) => s.longestStreak >= 30,
  },
  {
    code: 'first_comment',
    title: 'Joined the Conversation',
    description: 'Posted your first comment',
    check: (s) => s.commentCount >= 1,
  },
  {
    code: 'community_contributor',
    title: 'Community Contributor',
    description: 'Posted 25 comments',
    check: (s) => s.commentCount >= 25,
  },
];

// Cheap enough to call after any relevant action (upload, comment, focus
// session, collection, view) — a handful of counts, no heavy aggregation.
// Also safe to call repeatedly: already-unlocked codes are skipped.
export async function evaluateAchievements(userId) {
  const user = await User.findById(userId).select('focusStats unlockedAchievements');
  if (!user) return { unlocked: [], newlyUnlocked: [] };

  const [videoCount, collectionCount, commentCount, watchedCount] = await Promise.all([
    Video.countDocuments({ uploader: userId }),
    Collection.countDocuments({ owner: userId, isWatchLater: { $ne: true } }),
    Comment.countDocuments({ user: userId }),
    WatchHistory.countDocuments({ user: userId }),
  ]);

  const stats = {
    videoCount,
    collectionCount,
    commentCount,
    watchedCount,
    totalFocusMinutes: user.focusStats?.totalFocusMinutes || 0,
    longestStreak: user.focusStats?.longestStreak || 0,
  };

  const alreadyUnlocked = new Set(user.unlockedAchievements.map((a) => a.code));
  const candidates = ACHIEVEMENTS.filter((a) => !alreadyUnlocked.has(a.code) && a.check(stats));

  // This function fires concurrently from several call sites (upload,
  // comment, focus session, collection, view) — two calls can both read
  // "not yet unlocked" before either writes. Each unlock is written with an
  // atomic $ne-guarded update so only the call that actually wins the race
  // reports it as newly unlocked (and sends the one notification for it).
  const newlyUnlocked = [];
  for (const achievement of candidates) {
    const result = await User.updateOne(
      { _id: userId, 'unlockedAchievements.code': { $ne: achievement.code } },
      { $push: { unlockedAchievements: { code: achievement.code, unlockedAt: new Date() } } }
    );
    if (result.modifiedCount > 0) {
      newlyUnlocked.push(achievement);
      createNotification({
        recipient: userId,
        type: 'achievement',
        actor: userId,
        video: null,
        meta: achievement.title,
      });
    }
  }

  const finalUser = await User.findById(userId).select('unlockedAchievements');
  return { unlocked: finalUser.unlockedAchievements, newlyUnlocked };
}

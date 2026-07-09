import mongoose from 'mongoose';

const { Schema } = mongoose;

// One row per admin-initiated action worth being able to look back on —
// deliberately scoped to admin/security-relevant events, not a firehose of
// every user action (uploads/comments/etc. are already visible via each
// user's own history/notifications).
const auditLogSchema = new Schema(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'admin_login',
        'user_edit',
        'user_suspend',
        'user_activate',
        'user_delete',
        'video_delete',
        'video_restore',
        'video_visibility_change',
        'video_reprocess',
        'video_edit',
        'settings_change',
        'storage_cleanup',
      ],
    },
    targetType: {
      type: String,
      enum: ['user', 'video', 'settings', null],
      default: null,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    // Short human-readable summary (e.g. "suspended user 'foo': spam") —
    // free text rather than a structured diff, kept intentionally simple.
    details: {
      type: String,
      default: null,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

auditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

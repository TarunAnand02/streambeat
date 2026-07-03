import mongoose from 'mongoose';

const { Schema } = mongoose;

// Append-only log recorded alongside Video.views (a simple running counter)
// so analytics can chart views over time — the counter alone can't answer
// "how many views did this get yesterday".
const viewEventSchema = new Schema({
  video: {
    type: Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

export const ViewEvent = mongoose.model('ViewEvent', viewEventSchema);

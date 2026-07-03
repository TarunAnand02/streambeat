import { axiosClient } from '../../lib/axiosClient';

export async function fetchNotes(videoId) {
  const { data } = await axiosClient.get(`/videos/${videoId}/notes`);
  return data.notes;
}

export async function createNote(videoId, { timestampSeconds, text }) {
  const { data } = await axiosClient.post(`/videos/${videoId}/notes`, { timestampSeconds, text });
  return data.note;
}

export async function deleteNote(videoId, noteId) {
  await axiosClient.delete(`/videos/${videoId}/notes/${noteId}`);
}

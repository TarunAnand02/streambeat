import { axiosClient } from '../../lib/axiosClient';

export async function fetchComments(videoId) {
  const { data } = await axiosClient.get(`/comments/video/${videoId}`);
  return data.comments;
}

export async function postComment(videoId, text, parentId) {
  const { data } = await axiosClient.post(`/comments/video/${videoId}`, { text, parentId });
  return data.comment;
}

export async function deleteComment(id) {
  await axiosClient.delete(`/comments/${id}`);
}

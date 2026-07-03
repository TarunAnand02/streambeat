import { axiosClient } from '../../lib/axiosClient';

export async function subscribe(channelId) {
  await axiosClient.post(`/subscriptions/${channelId}`);
}

export async function unsubscribe(channelId) {
  await axiosClient.delete(`/subscriptions/${channelId}`);
}

export async function fetchMySubscriptions() {
  const { data } = await axiosClient.get('/subscriptions');
  return data.channels;
}

export async function fetchSubscriptionFeed(page = 1) {
  const { data } = await axiosClient.get('/subscriptions/feed', { params: { page } });
  return data;
}

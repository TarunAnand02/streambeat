import { axiosClient } from '../../lib/axiosClient';

export async function createReport({ targetType, targetId, reason, details }) {
  const { data } = await axiosClient.post('/reports', { targetType, targetId, reason, details });
  return data.report;
}

export async function fetchReports(status = 'open') {
  const { data } = await axiosClient.get('/reports', { params: { status } });
  return data.reports;
}

export async function updateReportStatus(id, status) {
  const { data } = await axiosClient.patch(`/reports/${id}`, { status });
  return data.report;
}

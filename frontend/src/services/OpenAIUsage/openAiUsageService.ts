import axios, { AxiosResponse } from 'axios';
import { baseURL } from '../../config';

const getTimezoneHeader = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  } catch {
    return 'Asia/Kolkata';
  }
};

export async function getOpenAiUsageUsers(): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/openai-usage/admin/users`,
    headers: {
      'xtimezone': getTimezoneHeader(),
    },
  });
}

export async function getOpenAiUsageOverview(
  year: number | string,
  month?: number | string,
  userId?: string
): Promise<AxiosResponse<any>> {
  let getUrl = `/openai-usage/dashboard/overview?year=${year}`;
  if (month && month !== 'Month') {
    getUrl += `&month=${month}`;
  }
  if (userId && userId !== 'all') {
    getUrl += `&userId=${userId}`;
  }

  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: getUrl,
    headers: {
      'xtimezone': getTimezoneHeader(),
    },
  });
}

export async function getOpenAiUsageDailyUsage(
  page: number = 1,
  limit: number = 25,
  year?: number | string,
  month?: number | string,
  userId?: string
): Promise<AxiosResponse<any>> {
  let getUrl = `/openai-usage/dashboard/daily-usage?page=${page}&limit=${limit}`;
  if (year) {
    getUrl += `&year=${year}`;
  }
  if (month && month !== 'Month') {
    getUrl += `&month=${month}`;
  }
  if (userId && userId !== 'all') {
    getUrl += `&userId=${userId}`;
  }

  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: getUrl,
    headers: {
      'xtimezone': getTimezoneHeader(),
    },
  });
}

// Alias for backwards compatibility
export const getOpenAiUsageDetails = getOpenAiUsageDailyUsage;

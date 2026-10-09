import axios, { AxiosResponse } from 'axios';
import nookies from 'nookies';
import { baseURL } from '../../config';

export interface YellowPagesScrapePayload {
  query: string;
  location: string;
  limit?: number;
  campaignId?: string;
  filter?: any[];
}

// const getAuthHeaders = () => {
//   const cookies = nookies.get(null);
//   const token = cookies.accesstoken;
//   return token
//     ? {
//         Authorization: `Bearer ${token}`,
//         'Content-Type': 'application/json',
//       }
//     : {
//         'Content-Type': 'application/json',
//       };
// };

export async function scrapeYellowPages(
  ypPayload: YellowPagesScrapePayload,
): Promise<any> {
  const response = await axios({
    baseURL: baseURL,
    method: 'post',
    url: 'yellow-pages/scrape',
    data: ypPayload,
    // headers: getAuthHeaders(),
  });
  return response.data;
}

export async function getYellowPagesScrapeResult(
  jobId: string,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/yellow-pages/scrape-result/${jobId}`,
    // headers: getAuthHeaders(),
  });
}

export async function yellowPagesScrapeAndSaveData(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    url: '/yellow-pages/scrape',
    data: data,
    // headers: getAuthHeaders(),
  });
}

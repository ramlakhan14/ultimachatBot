import axios, { AxiosResponse } from 'axios';
import { baseURL } from '../config';

interface Filter {
  field: string;
  operator: string;
  value: string;
}

interface MyData {
  limit: string;
  categories: string[];
  country: string;
  filter: Filter[];
  statusCode: number;
  message: string;
}

export async function setInviteUser(
  searchData: any,
): Promise<AxiosResponse<MyData>> {
  return await axios({
    baseURL: baseURL,
    method: 'POST',
    data: searchData,
    url: 'project/inviteUsers/',
  });
}
export async function getInviteUser(
  page: number,
  pageSize: number,
  searchKeyword: string,
): Promise<AxiosResponse<MyData>> {
  let getUrl = '';
  if (searchKeyword?.length > 0) {
    getUrl = `project/inviteUsersDetails?search=${searchKeyword}&page_size=${pageSize}&page=${page}`;
  } else {
    getUrl = `project/inviteUsersDetails?page_size=${pageSize}&page=${page}`;
  }
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: getUrl,
  });
}

export async function ScrapLeadsReinvite(
  id: number,
): Promise<AxiosResponse<MyData>> {
  return await axios({
    baseURL: baseURL,
    method: 'POST',
    url: `/project/${id}/ScrapLeadsReinvite`,
  });
}

export async function ScrapUserProfile(
  id: number,
): Promise<AxiosResponse<MyData>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/project/${id}/ScrapUserProfile`,
  });
}

export async function getPostalCode(countryCode: string): Promise<any> {
  const response = await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/project/getPostalCode?country=${countryCode}`,
  });
  return response.data;
}

export async function getScrapeResult(
  jobId: string,
  type: 'gmb' | 'facebook' | 'linkedin' | 'yellowpages',
): Promise<AxiosResponse<any>> {
  let endpoint = `/admin/scrape-result/${jobId}`;
  if (type === 'gmb') {
    endpoint = `/campaign/scrape-result/${jobId}`;
  } else if (type === 'yellowpages') {
    endpoint = `/yellow-pages/scrape-result/${jobId}`;
  }

  try {
    return await axios({
      baseURL: baseURL,
      method: 'get',
      url: endpoint,
    });
  } catch (e) {
    return await axios({
      baseURL: baseURL,
      method: 'get',
      url:
        type === 'yellowpages'
          ? `/yellow-pages/scrape-result/${jobId}`
          : type === 'gmb'
          ? `/admin/scrape-result/${jobId}`
          : `/campaign/scrape-result/${jobId}`,
    });
  }
}

export async function scrapeFacebook(fbPayload: any): Promise<any> {
  const response = await axios({
    baseURL: baseURL,
    method: 'post',
    url: '/admin/scrape/facebook',
    data: fbPayload,
  });
  return response.data;
}

export async function scrapeLinkedin(liPayload: any): Promise<any> {
  const response = await axios({
    baseURL: baseURL,
    method: 'post',
    url: '/admin/scrape/linkedin',
    data: liPayload,
  });
  return response.data;
}

export async function scrapeYellowPages(ypPayload: any): Promise<any> {
  const response = await axios({
    baseURL: baseURL,
    method: 'post',
    url: 'yellow-pages/scrape',
    data: ypPayload,
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
  });
}

export async function saveScrappedData(mergedData: any): Promise<any> {
  const response = await axios({
    baseURL: baseURL,
    method: 'post',
    url: '/project/save-scrapped-data',
    data: mergedData,
  });
  return response.data;
}

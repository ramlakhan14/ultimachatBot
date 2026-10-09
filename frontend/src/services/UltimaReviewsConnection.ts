import axios, { AxiosResponse } from 'axios';
import { baseURL } from '../config';

export async function csvParseAndSaveLeadData(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/ultima-reviews/parse-lead-data`,
  });
}
export async function gmbScrapeLeadsData(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/ultima-reviews/data-scrapping-through-gmb`,
  });
}
export async function facebookScrapeLeadsData(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/facebook-scrapper/fb-scrape`,
    // url: `/facebook-scrapper/extractAndSaveContactInfo`,
  });
}
export async function createReviewCampaign(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/ultima-reviews/create-review-campaign`,
  });
}
export async function getUltimaReviewsCampaign(
  page: number,
  limit: number,
  search: string,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/ultima-reviews/all-review-campaigns?page=${page}&limit=${limit}&search=${search}`,
  });
}
export async function getUltimaReviewsCampaignLeads(
  campaignId: string,
  page: number,
  limit: number,
  search: string,
): Promise<AxiosResponse<any>> {
  if (campaignId === undefined || campaignId === null) {
    campaignId = '';
  }
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/ultima-reviews/all-leads?page=${page}&limit=${limit}&search=${search}&campaignId=${campaignId}`,
  });
}
export async function LeadStatusChange(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/ultima-reviews/update-lead-status`,
  });
}

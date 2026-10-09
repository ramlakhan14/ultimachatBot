import axios, { AxiosResponse } from 'axios';
import { baseURL } from '../config';

export async function campaignCreateCampaign(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/campaign/createCampaign`,
  });
}

export async function campaignGetAllCampaign(
  pageSize: number,
  page: number,
  SearchData: string,
): Promise<AxiosResponse<any>> {
  let getUrl = '';
  if (SearchData?.length > 0) {
    getUrl = `/campaign/getAllCampaign/?limit=${pageSize}&offset=${page}&searchStr=${SearchData}`;
  } else {
    getUrl = `campaign/getAllCampaign/?limit=${pageSize}&offset=${page}`;
  }
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: getUrl,
  });
}

export async function getAllLeads(
  pageSize: number,
  page: number,
  SearchData: string,
  campaignId: string,
): Promise<AxiosResponse<any>> {
  let getUrl = '';
  if (SearchData?.length > 0) {
    getUrl = `/campaign/getAllLeads/?limit=${pageSize}&offset=${page}&campaignId=${campaignId}&searchStr=${SearchData}`;
  } else {
    getUrl = `campaign/getAllLeads/?limit=${pageSize}&offset=${page}&campaignId=${campaignId}`;
  }
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: getUrl,
  });
}

export async function getCampaignName(): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/campaign/getAllCampaign`,
  });
}

export async function getCampaignDetails(id: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/campaign/getCampaignDetails/?campaignId=${id}`,
  });
}

export async function csvParseAndSaveData(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/campaign/csvParseAndSaveData`,
  });
}
export async function deleteUnverifiedEmail(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'DELETE',
    data: data,
    url: `/campaign/deleteAudienceFromCampaign`,
  });
}

export async function dataScrappingForCampaign(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/campaign/dataScrappingForCampaign`,
  });
}

export async function getAllLeadsWithCount(): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/campaign/getAllLeadsWithCount/`,
  });
}

export async function getAllCSVUploadedData(
  id: string,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/campaign/getCampaignAudience?campaignId=${id}`,
  });
}

export async function duplicateLead(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/campaign/duplicateLead`,
  });
}

export async function campaignScheduler(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/campaign/campaignScheduler`,
  });
}
export async function triggerCampaign(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/campaign/triggerCampaign`,
  });
}
export async function updateCampaign(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/campaign/updateCampaign`,
  });
}

export async function pauseCampaign(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/campaign/pauseCampaign`,
  });
}
export async function resumeEmailCampaign(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/campaign/resumeCampaign`,
  });
}

export async function getEmailsByUserId(): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/campaign/getEmailsByUserId`,
  });
}

export async function googleCallback(
  code: string,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `campaign/google/callback?code=${code}`,
  });
}

export async function outlookCallback(
  code: string,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `campaign/microsoft/callback?code=${code}`,
  });
}

export async function yahooCallback(code: string): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `campaign/yahoo/callback?code=${code}`,
  });
}

export async function googleCalendarCallback(
  code: string,
): Promise<AxiosResponse<any>> {
  try {
    const response = await axios({
      baseURL: baseURL,
      method: 'get',
      url: `googleCalender/oauth2callback?code=${code}`,
    });
    // console.log("google response" , response);
    return response;
  } catch (error) {
    // Optional: throw or handle error
    // console.log("google erorr" , error);
    throw error;
  }
}


export async function checkEmailCampaignName(
  data: any
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/campaign/check-campaign-name`, // Adjust this endpoint based on your backend API
  });
}

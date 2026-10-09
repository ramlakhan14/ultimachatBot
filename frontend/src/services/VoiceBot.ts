import axios, { AxiosResponse } from 'axios';
import { baseURL } from '../config';
import { Phone } from '@phosphor-icons/react/dist/ssr';

export async function verifyVapiKey(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/voicebot/verify-vapi-key`,
  });
}

export async function addPhoneNumber(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/voicebot/add-phone-number`,
  });
}

export async function fetchAllPhoneNumber(): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/voicebot/fetch-phone-number/?allNumbers=${true}`,
  });
}

export async function fetchOutcomePhoneNumber(): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/voicebot/fetch-phone-number/?allNumbers=${false}`,
  });
}

export async function csvParseAndSaveData(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/voicebot/parse-csv-data`,
  });
}

export async function gmbScrapeAndSaveData(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/voicebot/data-scrapping-through-gmb`,
  });
}

export async function createVoiceBotCampaign(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/voicebot/create-voice-bot-campaign`,
  });
}

export async function getAllCampaigns(
  pageSize: number,
  page: number,
  SearchData: string,
): Promise<AxiosResponse<any>> {
  let getUrl = '';
  if (SearchData?.length > 0) {
    getUrl = `/voicebot/get-all-campaigns?limit=${pageSize}&page=${page}&search=${SearchData}`;
  } else {
    getUrl = `/voicebot/get-all-campaigns/?limit=${pageSize}&page=${page}`;
  }
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: getUrl,
  });
}

export async function checkProjectAndNumber(): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/voicebot/check-project-and-number`,
  });
}
export async function getLeads(
  pageSize: number,
  page: number,
  SearchData: string,
  filterObj: {
    start_date: string;
    end_date: string;
  },
  isMeetingBookedOnGoogleMeet: any,
): Promise<AxiosResponse<any>> {
  let getUrl = '';
  if (SearchData?.length > 0) {
    getUrl = `/voicebot/get-leads?limit=${pageSize}&page=${page}&startDate=${
      filterObj?.start_date || ''
    }&endDate=${
      filterObj?.end_date || ''
    }&search=${SearchData}&isMeetingBookedOnGoogleMeet=${
      isMeetingBookedOnGoogleMeet || ''
    }`;
  } else {
    getUrl = `/voicebot/get-leads/?limit=${pageSize}&page=${page}&startDate=${
      filterObj?.start_date || ''
    }&endDate=${filterObj?.end_date || ''}&isMeetingBookedOnGoogleMeet=${
      isMeetingBookedOnGoogleMeet || ''
    }`;
  }
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: getUrl,
  });
}

export async function campaignDetails(id: string): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/voicebot/campaign-details/${id}`,
  });
}

export async function campaignRecordings(
  id: string,
  pageSize: number,
  page: number,
  SearchData: string,
): Promise<AxiosResponse<any>> {
  let getUrl = '';
  if (SearchData?.length > 0) {
    getUrl = `/voicebot/campaign-all-recordings/${id}?limit=${pageSize}&page=${page}&search=${SearchData}`;
  } else {
    getUrl = `/voicebot/campaign-all-recordings/${id}/?limit=${pageSize}&page=${page}`;
  }
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: getUrl,
  });
}

export async function inboundCallRecords(
  pageSize: number,
  page: number,
  SearchData: string,
): Promise<AxiosResponse<any>> {
  let getUrl = '';
  if (SearchData?.length > 0) {
    getUrl = `/voicebot/inbound-call-records?limit=${pageSize}&page=${page}&search=${SearchData}`;
  } else {
    getUrl = `/voicebot/inbound-call-records?limit=${pageSize}&page=${page}`;
  }
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: getUrl,
  });
}

export async function campaignRecording(
  phoneNumer: string,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/voicebot/campaign-recording/${phoneNumer}`,
  });
}

export async function getAssistant(): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/voicebot/get-assistant`,
  });
}

export async function fetchConfigKey(): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/voicebot/fetch-config-key`,
  });
}

export async function voicebotDashboard(): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/voicebot/dashboard`,
  });
}

export async function getCalendarData(
  dateMonth?: string,
  date?: string,
): Promise<AxiosResponse<any>> {
  // Build query parameters object with only defined values
  const params: Record<string, string> = {};

  if (date) {
    params.date = date;
  }

  if (dateMonth) {
    params.month = dateMonth;
  }

  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: '/voicebot/get-calendar-data',
    params: params, // Axios will handle the query string formatting
  });
}
export async function updateMeetingStatus(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'patch',
    data: data,
    url: `/voicebot/change-meeting-status`,
  });
}

export async function pauseCampaign(id: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'patch',
    url: `/voicebot/pause-campaign/${id}`,
  });
}

export async function updateCampaign(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'patch',
    data: data,
    url: `/voicebot/update-campaign`,
  });
}

export async function settingsInbound(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/settings/inbound`,
  });
}

export async function settingsOutbound(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/settings/outbound`,
  });
}

export async function settingsReminder(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/settings/reminder`,
  });
}

export async function settingsFollowUp(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/settings/followup`,
  });
}

export async function CheckCampaignName(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/voicebot/check-campaign-name`,
  });
}

export async function settingsGet(): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/settings/get`,
  });
}

export async function getBasePrompt(): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/voicebot/get-base-prompt`,
  });
}

export async function deleteNumber(id: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'delete',
    url: `/voicebot/delete-phone-number/?_id=${id}`,
  });
}

export async function twilioPhoneNumber(): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/voicebot/get-twilio-phone-number`,
  });
}

export async function getDashboardData(
  leadType: string,
  month: string,
  year: number,
  knowledgebaseId?: string,
): Promise<AxiosResponse<any>> {
  let getUrl = '';
  if (month?.length > 0) {
    getUrl = `/dashboard/getDashboardData?leadType=${leadType}&month=${month}&year=${year}`;
  } else {
    getUrl = `/dashboard/getDashboardData?leadType=${leadType}&year=${year}`;
  }
  if (knowledgebaseId) {
    getUrl += `&knowledgebaseId=${knowledgebaseId}`;
  }
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: getUrl,
  });
}

export async function resumeCampaign(
  id: any,
  data?: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'patch',
    data: data,
    url: `/voicebot/resume-campaign/${id}`,
  });
}

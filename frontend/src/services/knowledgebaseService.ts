import axios, { AxiosResponse } from 'axios';
// import { access } from 'fs';
import { baseURL } from '../config';
import {
  ChatBotCustomizeData,
  googleSettingsData,
  ChatSessionDetail,
  CrawlDataDetail,
  CrawlDataListPagination,
  Knowledgebase,
  OfflineMessagePagination,
  TrainingData,
  TrainingDataDetail,
  ChatSessionPagination,
  CustomDataPagination,
  WebsiteData,
  revokeTokenType,
} from '../types/knowledgebase.type';
import { CurrentUser } from './appConfig';
export interface Product {
  id: string;
  name: string;
  previewUrl: string;
}
const userRole = CurrentUser.get();

export async function createKnowledgebase(
  data: WebsiteData,
): Promise<AxiosResponse<Knowledgebase>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: '/knowledgebase/',
  });
}

export async function createVisitorKnowledgebase(
  data: WebsiteData,
): Promise<AxiosResponse<Knowledgebase>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: '/knowledgebase/visitors/',
    headers: {
      Authorization: null,
    },
  });
}

export async function createChatBotSession(
  knowledgebaseId: string,
): Promise<AxiosResponse<Knowledgebase>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: {
      knowledgebaseId: knowledgebaseId,
    },
    url: `/bot/session/`,
  });
}
export async function getChatBotAnswer(
  sessionId: string,
  query: string,
): Promise<AxiosResponse<Knowledgebase>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: {
      sessionId: sessionId,
      query: query,
    },
    url: `/bot/answer/?debug=true`,
  });
}
export async function deleteKnowledgebase(
  id: string,
): Promise<AxiosResponse<Knowledgebase>> {
  return await axios({
    baseURL: baseURL,
    method: 'delete',
    url: `/knowledgebase/${id}/`,
  });
}

export async function fetchKnowledgebases(
  page?: number,
  limit?: number,
  isAdminList?: boolean,
  search?: string,
  enabled?: boolean,
  isScrapedLeadProject?: boolean,
): Promise<AxiosResponse<any>> {
  const userRole = CurrentUser.get();
  const params = new URLSearchParams();
  // console.log('userRole first render', userRole.role, isScrapedLeadProject);
  params.append(
    'isScrapedLeadProject',
    isScrapedLeadProject == undefined
      ? 'false'
      : isScrapedLeadProject.toString(),
  );
  if (search == 'allprojectX') {
    params.append('adminOnly', 'true');
    // if (isScrapedLeadProject !== undefined)
  } else {
    if (page !== undefined) params.append('page', page.toString());
    if (limit !== undefined) params.append('limit', limit.toString());
    if (enabled !== undefined) {
      // console.log('enabled value in service', window.location.pathname);
      if (!window.location.pathname?.includes('/app/bots')) {
        // console.log('clickdsfk');

        params.append('isChatbotEnabled', enabled.toString());
      }
    }
    if (isAdminList !== undefined)
      params.append('adminOnly', isAdminList.toString());
    // if (isScrapedLeadProject !== undefined)
    //   params.append('isScrapedLeadProject', isScrapedLeadProject.toString());
    if (search) params.append('search', search || '');
  }

  const isAdmin = userRole.role === 'admin';
  const basePath =
    window.location.pathname?.includes('/app/chatbots') && isAdmin
      ? 'project/all_knowledgebases_chatbot_enabled'
      : isAdmin
      ? 'project/all_knowledgebases'
      : 'knowledgebase';
  const query = params.toString() ? `?${params.toString()}` : '';
  const url = `/${basePath}${query}`;

  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: url,
  });
}
export async function fetchKnowledgebaseDetails(
  id: string,
): Promise<AxiosResponse<Knowledgebase>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: '/knowledgebase/' + id,
  });
}

export async function fetchKnowledgebaseVisitorsDetails(
  id: string,
): Promise<AxiosResponse<Knowledgebase>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/knowledgebase/${id}/visitors/`,
    headers: {
      Authorization: null,
    },
  });
}

export async function fetchKnowledgebaseCrawlData(
  id: string,
  page: number,
): Promise<AxiosResponse<CrawlDataListPagination>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/knowledgebase/${id}/datastore?type=WEBPAGE&page=${page}`,
  });
}

export async function checkCanCreateChatbot(): Promise<
  AxiosResponse<CrawlDataListPagination>
> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/user/can-create-bot/`,
  });
}
export async function updateEnabledStatus(
  id: any,
  status: any,
): Promise<AxiosResponse<CrawlDataListPagination>> {
  return await axios({
    baseURL: baseURL,
    method: 'put',
    data: { isChatbotEnabled: status },
    url: `/knowledgebase/chatbot-enabled/${id}`,
  });
}

export async function fetchKnowledgebaseVisitorsCrawlData(
  id: string,
  page: number,
): Promise<AxiosResponse<CrawlDataListPagination>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/knowledgebase/${id}/visitors/datastore?type=WEBPAGE&page=${page}`,
    headers: {
      Authorization: null,
    },
  });
}
export async function fetchKnowledgebaseCrawlDataForDocs(
  id: string,
  page: number,
): Promise<AxiosResponse<CrawlDataListPagination>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/knowledgebase/${id}/datastore?type=PDF&page=${page}`,
  });
}
export async function fetchKnowledgebaseCrawlDataVisitorsForDocs(
  id: string,
  page: number,
): Promise<AxiosResponse<CrawlDataListPagination>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/knowledgebase/${id}/visitors/datastore?type=PDF&page=${page}`,
    headers: {
      Authorization: null,
    },
  });
}
export async function fetchKnowledgebaseCrawlDataDetails(
  id: string,
  crawlId: string,
): Promise<AxiosResponse<CrawlDataDetail>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/knowledgebase/${id}/datastore/${crawlId}?type=WEBPAGE`,
  });
}
export async function getDemoSesions(): Promise<
  AxiosResponse<Knowledgebase[]>
> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: '/bot/demo_session',
  });
}

export async function customizeWidget(
  id: string,
  data: ChatBotCustomizeData,
): Promise<AxiosResponse<Knowledgebase[]>> {
  return await axios({
    baseURL: baseURL,
    method: 'put',
    data: data,
    url: `knowledgebase/${id}/chat_widget_data`,
  });
}

export async function googleCalendarSettings(
  data: googleSettingsData,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'POST',
    data: data,
    url: `googleCalender/createDetails`,
  });
}

export async function getGoogleCalendarSettings(
  kbid: string,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'GET',
    url: `googleCalender/${kbid}/getCalenderDetails/`,
  });
}

export async function revokeCalenderPermissions(
  data: revokeTokenType,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'POST',
    data: data,
    url: `googleCalender/revokeCalenderPermissions`,
  });
}

export async function updatePrompt(
  id: string,
  prompt: string,
): Promise<AxiosResponse<Knowledgebase[]>> {
  return await axios({
    baseURL: baseURL,
    method: 'put',
    data: {
      prompt: prompt,
    },
    url: `knowledgebase/${id}/prompt`,
  });
}

export async function updateDefaultAnswer(
  id: string,
  defaultAnswer: string,
): Promise<AxiosResponse<Knowledgebase[]>> {
  return await axios({
    baseURL: baseURL,
    method: 'put',
    data: {
      defaultAnswer: defaultAnswer,
    },
    url: `knowledgebase/${id}/default_answer`,
  });
}
export async function getUrlKbId(
  crawlUrl: string,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'POST',
    data: {
      name: 'vakmangids',
      websiteUrl: crawlUrl,
    },
    url: `project/getUrlKbId`,
  });
}
export async function updateAdminEmail(
  id: string,
  adminEmail: string,
): Promise<AxiosResponse<Knowledgebase[]>> {
  return await axios({
    baseURL: baseURL,
    method: 'put',
    data: {
      email: adminEmail,
    },
    url: `knowledgebase/${id}/admin_email`,
  });
}

export async function updateModelName(
  id: string,
  modelName: string,
): Promise<AxiosResponse<Knowledgebase[]>> {
  return await axios({
    baseURL: baseURL,
    method: 'put',
    data: {
      model: modelName,
    },
    url: `knowledgebase/${id}/model`,
  });
}

export async function updateWebsiteData(
  id: string,
  data: WebsiteData,
): Promise<AxiosResponse<Knowledgebase[]>> {
  return await axios({
    baseURL: baseURL,
    method: 'put',
    data: data,
    url: `/knowledgebase/${id}/website_data`,
  });
}
export async function fetcKnowledgebase(
  id: string,
): Promise<AxiosResponse<Knowledgebase>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/knowledgebase/${id}/`,
  });
}
export async function generateEmbeddings(
  id: string,
): Promise<AxiosResponse<Knowledgebase>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    url: `/knowledgebase/${id}/generate_embeddings`,
  });
}

export async function generateEmbeddingsVisitors(
  id: string,
): Promise<AxiosResponse<Knowledgebase>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    url: `/knowledgebase/${id}/generate_embeddings/visitors`,
    headers: {
      Authorization: null,
    },
  });
}
export async function addTrainingData(
  id: string,
  data: any,
): Promise<AxiosResponse<Knowledgebase>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/knowledgebase/${id}/datastore/custom_data`,
  });
}

export async function addTrainingDocs(
  id: string,
  files: File[],
): Promise<AxiosResponse<Knowledgebase>> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('file', file);
  });
  formData.append('knowledgebaseId', id);
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: formData,
    url: `knowledgebase/importers/document`,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

export async function addTrainingDoc(
  id: string,
  file: File,
): Promise<AxiosResponse<Knowledgebase>> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('knowledgebaseId', id);
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: formData,
    url: `knowledgebase/importers/pdf`,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

export async function updateTrainingData(
  id: string,
  data: any,
): Promise<AxiosResponse<Knowledgebase>> {
  return await axios({
    baseURL: baseURL,
    method: 'put',
    data: {
      q: data.q,
      a: data.a,
    },
    url: `/knowledgebase/${id}/datastore/${data._id}`,
  });
}
export async function getTrainingData(
  id: string,
  page: string,
): Promise<AxiosResponse<CustomDataPagination>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/knowledgebase/${id}/datastore?type=CUSTOM&page=${page}&page_size=20`,
  });
}
export async function deleteTrainingData(
  knowledgebaseId: string,
  id: string,
): Promise<AxiosResponse<Knowledgebase>> {
  return await axios({
    baseURL: baseURL,
    method: 'delete',
    url: `/knowledgebase/${knowledgebaseId}/datastore/${id}`,
  });
}

export async function getTrainingDataDetails(
  knowledgebaseId: string,
  id: string,
): Promise<AxiosResponse<TrainingDataDetail>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/knowledgebase/${knowledgebaseId}/datastore/${id}`,
  });
}

export async function setCustomDomain(
  knowledgebaseId: string,
  domain: string,
): Promise<AxiosResponse<TrainingDataDetail>> {
  return await axios({
    baseURL: baseURL,
    data: {
      domain: domain,
    },
    method: 'put',
    url: `/knowledgebase/${knowledgebaseId}/custom_domain`,
  });
}

export async function getChatSessions(
  id: string,
  page: number,
  chatSessionId: string,
): Promise<AxiosResponse<ChatSessionPagination>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/bot/${id}/session?page_size=10&page=${page}&chatSessionId=${chatSessionId}`,
  });
}

export async function readChatSession(sessionId: string) {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    url: `/bot/session/${sessionId}/read`,
  });
}

export async function defaultBasePromptApi(chatbotId: string) {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    url: `/knowledgebase/${chatbotId}/setDefaultPrompt`,
  });
}

export async function chatSessionSearch(
  sessionId: string,
  page: number,
  searchData: string,
) {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/bot/${sessionId}/session?page_size=10&page=${page}&search=${searchData}`,
  });
}

export async function leadsData(id: string, page: number) {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/knowledgebase/${id}/leads?page=${page}&page_size=10`,
  });
}
export async function leadsDataSortData(
  id: string,
  pageSize: number,
  page: number,
  shortData: number,
  searchKeyword: string,
): Promise<AxiosResponse<any>> {
  let getUrl = '';
  if (searchKeyword?.length > 0) {
    getUrl = `/knowledgebase/${id}/leads?page=${page}&page_size=${pageSize}&sortType=${shortData}&search=${searchKeyword}`;
  } else {
    getUrl = `/knowledgebase/${id}/leads?page=${page}&page_size=${pageSize}&sortType=${shortData}`;
  }
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: getUrl,
  });
}

export async function leadsDataPagSize(
  id: string,
  pageSize: number,
  page: number,
) {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/knowledgebase/${id}/leads?page_size=${pageSize}&page=${page}`,
  });
}
export async function deleteChatSession(sessionId: string) {
  return await axios({
    baseURL: baseURL,
    method: 'delete',
    url: `/bot/session/${sessionId}`,
  });
}

export async function unReadChatSession(sessionId: string) {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    url: `/bot/session/${sessionId}/unread`,
  });
}

export async function getOfflineMessages(
  id: string,
  page: string,
): Promise<AxiosResponse<OfflineMessagePagination>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/offline_msg/${id}?page_size=10&page=${page}`,
  });
}

export async function sendOfflineMessage(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/offline_msg`,
  });
}

export async function getChatSessionDetails(
  sessionId: string,
): Promise<AxiosResponse<ChatSessionDetail>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/bot/session/${sessionId}`,
  });
}

export async function quickReplies(
  lastMessage: string,
  sessionId: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: {
      content: lastMessage,
      sessionId: sessionId,
    },
    url: `/bot/quick_replies`,
  });
}

export async function getAllUsers(
  countUser: number,
  page: number,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/admin/allProfiles?page_size=${countUser}&page=${page}`,
  });
}

export async function adminDeleteUser(id: string): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    url: `/admin/${id}/deleteUser`,
  });
}
export async function SearchUsers(
  countUser: number,
  page: number,
  SearchData: string,
): Promise<AxiosResponse<any>> {
  let getUrl = '';
  if (SearchData?.length > 0) {
    getUrl = `/admin/allProfiles?search=${SearchData}&page_size=${countUser}&page=${page}`;
  } else {
    getUrl = `/admin/allProfiles?page_size=${countUser}&page=${page}`;
  }
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: getUrl,
  });
}

export async function SearchOffLineMessage(
  id: string,
  pageCount: number,
  page: number,
  SearchData: number,
  searchKeyword: string,
): Promise<AxiosResponse<any>> {
  let getUrl = '';
  if (searchKeyword?.length > 0) {
    getUrl = `/offline_msg/${id}?page_size=${pageCount}&page=${page}&sortType=${SearchData}&search=${searchKeyword}`;
  } else {
    getUrl = `/offline_msg/${id}?page_size=${pageCount}&page=${page}&sortType=${SearchData}`;
  }
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: getUrl,
  });
}

export async function userProfilePreview(
  id: number,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/admin/${id}/profilePreview`,
  });
}

export async function sendResponseEmail(
  kbId: string,
  id: number,
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/offline_msg/${kbId}/sendResponseEmail/${id}`,
  });
}

export async function chatSummaryForMessages(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/campaign/emailAssitance/chatSummaryForMessages`,
  });
}
export async function chatSummaryForEmail(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/campaign/emailAssitance/chatSummaryForEmails`,
  });
}

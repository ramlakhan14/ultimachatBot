import axios, { AxiosResponse } from 'axios';
import { baseURL } from '../config';
import {
  FolderList,
  EmailFolder,
  ReplySettings,
  EmailSettings,
  RuleSetupSettings,
  AllSettings,
  Notifications,
  EmailList,
} from '../types/emailassistant.type';
import { CurrentUser } from './appConfig';
export interface Product {
  id: string;
  name: string;
  previewUrl: string;
}
const userRole = CurrentUser.get();

export async function createFolder(
  data: EmailFolder,
): Promise<AxiosResponse<EmailFolder>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: '/emailAssistance/folder',
  });
}

export async function updateFolder(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'put',
    data: data,
    url: `/emailAssistance/folder`,
  });
}

export async function fetchFolderList(type:any,value:any,projectId:any): Promise<AxiosResponse<FolderList>> {
const params: any = {};

  if (type) {
    params.type = type;
  }


  console.log(type,value,projectId);
  

   if (type === "emailAssistant") {
      params.emailId = projectId;
    }else{
      params.campaignId = value;
    }
if (type === "emailOutreach") {
  if (projectId) {
    params.projectId = projectId;
  }
}
  // let path = !type ?`/emailAssistance/folders`: type == "emailAssistant" ?  `/emailAssistance/folders?type=${type}&emailId=${value}`: `/emailAssistance/folders?type=${type}&projectId=${projectId}&campaignId=${value}`
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: "/emailAssistance/folders",
    params,
  });
}

export async function autoRepliesSetting(
  data: ReplySettings,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/emailAssistance/setting`,
  });
}

export async function updateEmailSettings(
  data: EmailSettings,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'put',
    data: data,
    url: `/emailAssistance/setting/emailSetting`,
  });
}

export async function updateRuleSetupSettings(
  data: RuleSetupSettings,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'put',
    data: data,
    url: `/emailAssistance/setting/ruleSetupSetting`,
  });
}

export async function fetchAllSetings(): Promise<AxiosResponse<AllSettings>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: '/emailAssistance/setting',
  });
}
export async function fetchAllNotifications(
  type: string,
  page: number,
  limit: number,
): Promise<AxiosResponse<Notifications>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/emailAssistance/notification?notificationType=${type}&page=${page}&limit=${limit}`,
  });
}

export async function updateNotifications(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'put',
    data: data,
    url: `/emailAssistance/notification/seen`,
  });
}

export async function deleteUserCreatedFolder(
  id: string,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'delete',
    url: `/emailAssistance/folder?id=${id}`,
  });
}

export async function emailConversationListing(
  page: number,
  limit: number,
  folderId: string,
  folderName: string,
  searchQuery: string,
): Promise<AxiosResponse<any>> {

  const searchParams = new URLSearchParams(window.location.search);

const getParam = (key:any) => {
  const value = searchParams.get(key);

  if (value === null || value === "" || value === "undefined") {
    return undefined;
  }

  return value;
};

const type = getParam("type");
const emailOrProject = getParam("emailOrProject");
const campaignId = getParam("campaignId");
  // console.log("location", type ,emailOrProject ,campaignId);


// Base params
const params = new URLSearchParams({
  page: String(page),
  limit: String(limit),
  folderId:folderId,
  folderName:folderName,
  searchString: searchQuery,
});

// Add only if value exists
if (type) {
  params.append("type", type);
}

if(type == "emailOutreach"){
  if (emailOrProject) {
    params.append("projectId", emailOrProject);
  }
  
  if (campaignId) {
    params.append("campaignId", campaignId);
  }
}else{
  if (emailOrProject) {
    params.append("emailId", emailOrProject);
  }
  
}

return await axios({
  baseURL: baseURL,
  method: "get",
  url: `/emailAssistance/emailConversationListing?${params.toString()}`,
});

  // return await axios({
  //   baseURL: baseURL,
  //   method: 'get',
  //   url: `/emailAssistance/emailConversationListing?page=${page}&limit=${limit}&folderId=${folderId}&folderName=${folderName}&searchString=${searchQuery}`,
  // });
}

export async function emailConversationListingUserCreated(
  page: number,
  limit: number,
  folderId: string,
  emailId: string,
  categoryName: string,
  serchQuery: string,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `${
      emailId !== ''
        ? `/emailAssistance/emailConversation/manualFolder?page=${page}&limit=${limit}&folderId=${folderId}&emailId=${emailId}&searchString=${serchQuery}`
        : `/emailAssistance/emailConversation/manualFolder?page=${page}&limit=${limit}&folderId=${folderId}&categories=${categoryName}&searchString=${serchQuery}`
    }`,
  });
}

export async function getChatSummaryForEmails(
  data: EmailList,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `campaign/emailAssitance/chatSummaryForEmails`,
  });
}

export async function deleteEmailsFromChatSummary(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'delete',
    data: data,
    url: `/emailAssistance/conversation/delete`,
  });
}
export async function manualFolderDeleteEmails(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'delete',
    data: data,
    url: `/emailAssistance/emailConversation/manualFolder/delete`,
  });
}
export async function approveDraftEMail(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: '/campaign/emailAssitance/approveDraftEmail',
  });
}
export async function moveEmailsToFolder(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: '/campaign/emailAssitance/moveEmailsToFolder',
  });
}

export async function fetchDashboardData(): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/emailAssistance/dashboard`,
  });
}

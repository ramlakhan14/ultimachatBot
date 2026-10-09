import axios, { AxiosResponse } from 'axios';
import { baseURL } from '../config';
import { CurrentUser } from './appConfig';

const userRole = CurrentUser.get();


export async function createWebhook(data: { crmName: string }): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: '/hooks/ultimabot/create',
  });
}

export async function fetchAllHooks(searchKeyword: string, page: number, limit: number): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/hooks/ultimabot/fetchAllHooks?searchString=${searchKeyword}&page=${page}&limit=${limit}`,
  });
}

export async function deleteHooks(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'delete',
    data: data,
    url: `/hooks/ultimabot/delete`,
  });
}

export async function connectWebhook(data: { crmName: string, webhookUrl: string }): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: '/hooks/zapier/submit',
  });
}

export async function fetchAllConnectedHooks(searchKeyword: string, page: number, limit: number): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/hooks/zapier/fetchAllHooks?searchString=${searchKeyword}&page=${page}&limit=${limit}`,
  });
}

export async function deleteConnectedHooks(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'delete',
    data: data,
    url: `hooks/zapier/delete`,
  });
}

export async function sendBulkLead(data: { leadType: [], webhookUrl: string }): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: '/hooks/zapier/sendBulkLead',
  });
}
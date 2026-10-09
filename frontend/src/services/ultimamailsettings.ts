import axios, { AxiosResponse } from 'axios';
import { baseURL } from '../config';

export async function verifyPostmarkAuthAndSecretKey(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/campaign/verifyPostmarkAuthAndSecretKey`,
  });
}

export async function createEmailSenderSignature(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/campaign/createEmailSenderSignature`,
  });
}

export async function allEmailAndPasskeyConfig(
  id?: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/campaign/allEmailAndPasskeyConfig/?campaignEmailServerId=${id}`,
  });
}

export async function updatePasskeyAndEmailHost(
  data: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/campaign/updatePasskeyAndEmailHost`,
  });
}

export async function deleteEmailAndPasskeyConfig(
  emailId: any,
): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'delete',
    data: emailId,
    url: `/campaign/deleteEmailAndPasskeyConfig`,
  });
}

export async function emailServerConfig(): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/campaign/emailServerConfig`,
  });
}

export async function smtpConfig(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/smtp/createSetting`,
  });
}


export async function sendSmtpTestEmail(data: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    data: data,
    url: `/smtp/sendSmtpTestEmail`,
  });
}

export async function getSmtpConfig(): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: `/smtp/getAllSetting`,
  });
}
export async function deleteSmtpConfig(id: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'delete',
    url: `/smtp/deleteSetting?id=${id}`,
  });
}

export async function editSetting(data: any,id: any): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'patch',
    data: data,
    url: `/smtp/editSetting/${id}`,
  });
}
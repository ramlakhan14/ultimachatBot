import axios, { AxiosResponse } from 'axios';
import { baseURL } from '../config';

interface MyData {
  useOwnKey: boolean;
  keys: string;
  statusCode: number; 
  message: string;
}

export async function setOpenAiApiKey(data: any): Promise<AxiosResponse<MyData>> {
	return await axios({
		baseURL: baseURL,
		method: 'PATCH',
    data: data,
		url: 'user/updateOpenAiKey',
	});
}
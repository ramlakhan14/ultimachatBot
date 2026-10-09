import axios, { AxiosRequestConfig, Method } from 'axios';
import { baseURL } from '../config';

export const getBaseUrl = (): string => {
  const url = baseURL || axios.defaults.baseURL || '';
  return url ? url.replace(/\/+$/, '') : '';
};
export const BaseUrl: string = getBaseUrl();

/**
 * Makes an API call with axios.
 * @param url - The API endpoint path.
 * @param method - The HTTP method to use.
 * @param payload - The request payload (optional).
 * @param token - Optional token override.
 */
const callApi = (url: string, method: Method, payload: any): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    const config: AxiosRequestConfig = {
      method: method,
      url: url,
      ...(payload ? { data: payload } : {}),
    };

    try {
      const response = await axios(config);
      // console.log(response , "<<<call" ,url, method, payload);

      if (response.status < 400) {
        resolve(response.data);
      } else {
        reject(response);
      }
    } catch (error) {
      reject(error);
    }
  });
};

export { callApi };

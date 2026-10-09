import axios, { AxiosResponse } from 'axios';
import { baseURL } from '../config';


export async function myInvoices(
  pageSize: number,
  page: number,
  year: number,
  shouldViewAll: boolean
): Promise<AxiosResponse<any>> {
  let getUrl = '';  
  if (year > 0) {
    getUrl = `/lemon/my-invoices?viewAll=${shouldViewAll}&limit=${pageSize}&page=${page}&year=${year}`;
  } else {
    getUrl = `/lemon/my-invoices?viewAll=${shouldViewAll}&limit=${pageSize}&page=${page}`;
  }
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: getUrl,  
  });
}
import axios from 'axios';

export class AxiosUtil {
  static async get(url: string, params: any = {}, headers: any = {}) {
    const response = await axios.get(url, { params, headers });
    return response.data;
  }

  static async post(url: string, data: any = {}, headers: any = {}) {
    const response = await axios.post(url, data, { headers });
    return response.data;
  }

  static async put(url: string, data: any = {}, headers: any = {}) {
    const response = await axios.put(url, data, { headers });
    return response.data;
  }

  static async patch(url: string, data: any = {}, headers: any = {}) {
    const response = await axios.patch(url, data, { headers });
    return response.data;
  }

  static async delete(url: string, headers: any = {}) {
    const response = await axios.delete(url, { headers });
    return response.data;
  }
}

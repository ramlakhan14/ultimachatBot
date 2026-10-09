import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class UltimaLeadsApiService {
  private readonly baseUrl =
    'https://server.onlinereviews.tech/public-api/v1.0.0/seat';
  private readonly apiKey = process.env.ULTIMA_LEADS_API_KEY || '';

  async addClient(seatData: {
    seat_name: string;
    email: string;
    full_name?: string;
    country?: string;
    plan_name?: string;
  }): Promise<any> {
    return await this.makePostRequest('/add', seatData);
  }

  async pauseClient(email: string): Promise<any> {
    return await this.makePostRequest('/pause', { email });
  }

  async activateClient(email: string): Promise<any> {
    return await this.makePostRequest('/activate', { email });
  }

  async deleteClient(email: string): Promise<any> {
    return await this.makePostRequest('/remove', { email });
  }

  private async makePostRequest(endpoint: string, data: any): Promise<any> {
    try {
      const response = await axios.post(`${this.baseUrl}${endpoint}`, data, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        maxBodyLength: Infinity,
      });

      return response.data;
    } catch (error) {
      const message = `Error during ${endpoint.slice(
        endpoint.lastIndexOf('/') + 1,
      )} the user: ${
        error?.response?.data?.message || error.message || 'Invalid request'
      }`;

      const newError = new Error(message);
      (newError as any).status = error?.response?.status || 500;
      (newError as any).statusCode = error?.response?.status || 500;
      (newError as any).response = message;

      throw newError;
    }
  }
}

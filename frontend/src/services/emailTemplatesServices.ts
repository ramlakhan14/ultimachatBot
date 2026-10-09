import axios, { AxiosResponse } from 'axios';
import { baseURL } from '../config';
import { url } from 'inspector';
interface MyData {
  getAllTemplates: Template[];
  statusCode: number; 
  message: string;
}

interface Template {
  _id: {
    $oid: string;
  };
  emailBody: string;
  name: string;
  label: string;
  createdAt: {
    $date: string;
  };
  updatedAt: {
    $date: string;
  };
}

interface EmailTemplateData {
  signupEmailText: string;
  forgetPasswordEmailText: string;
  forgetPasswordSuccessEmailText: string;
  inviteUserEmailText: string;
  leadsDataEmailText: string;
  offlineMessagesEmailText: string;
  statusCode: number; 
  message: string;
}

export async function setEmailTemplates(emailData: any): Promise<AxiosResponse<EmailTemplateData>> {
	return await axios({
		baseURL: baseURL,
		method: 'PUT',
    data: emailData,
		url: 'emailTemplate/updateEmailTemplates',
	});
}
export async function getEmailTemplates(): Promise<AxiosResponse<MyData>> {
	return await axios({
		baseURL: baseURL,
		method: 'get',
		url: `emailTemplate/getTemplates`,
	});
}

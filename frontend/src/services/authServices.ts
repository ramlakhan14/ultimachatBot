import axios, { AxiosResponse } from 'axios';
import { SignUp } from '../types/types';
import { baseURL } from '../config';

export async function signUp(payload: {
  email: string;
  password: string;
  // confirmPassword: string;
  avatarUrl?: string;
}): Promise<AxiosResponse<SignUp>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    url: '/auth/signup/',
    data: payload,
  });
}
export async function logIn(payload: {
  username?: string;
  password: string;
}): Promise<AxiosResponse<SignUp>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    url: '/auth/login/',
    data: payload,
  });
}

export async function authGoogle(payload: {
  token: string;
}): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    url: '/auth/google-login',
    // url: '/auth/google_auth',
    data: payload,
  });
}

export async function userPaymentstatus(
  payload: any,
): Promise<AxiosResponse<any>> {
  // console.log('payload>>>>>', payload?.access);
  return await axios({
    baseURL: baseURL,
    method: 'get',
    url: '/user/paymentstatus',
    headers: {
      Authorization: `Bearer ${payload?.access}`,
    },
  });
}

export async function forgotPassword(payload: {
  email: string;
}): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    url: '/auth/forgotPassword',
    data: payload,
  });
}

export async function unsubscribeEmail(payload: {
  token: string;
}): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'post',
    url: '/campaign/unsubscribeFromCampaign',
    data: payload,
  });
}

// export async function forgotPassword(payload: { email: string }): Promise<AxiosResponse<any>> {
// 	try {
// 			const response = await axios({
// 					baseURL: baseURL,
// 					method: 'post',
// 					url: '/auth/forgotPassword',
// 					data: payload
// 			});
// 			return response; // Return the successful response
// 	} catch (error) {
// 			// Handle the error appropriately
// 			if (axios.isAxiosError(error)) {
// 					// You can log or handle specific axios error responses here
// 					console.error('Error in forgotPassword:', error.response?.data || error.message);
// 					throw new Error(error.response?.data?.message || 'An error occurred while trying to reset the password.');
// 			} else {
// 					console.error('Unexpected error:', error);
// 					throw new Error('An unexpected error occurred.');
// 			}
// 	}
// }

export async function resetPassword(payload: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'patch',
    url: '/auth/resetPassword',
    data: payload,
  });
}

export async function otpVerification(payload: {
  email: string;
  otp: string;
}): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'put',
    url: '/auth/otp-verification',
    data: payload,
  });
}

export async function resendOtp(payload: {
  email: string;
}): Promise<AxiosResponse<any>> {
  return await axios({
    baseURL: baseURL,
    method: 'put',
    url: '/auth/resend-otp',
    data: payload,
  });
}
import axios from 'axios';
import { baseURL } from '../config';
import nookies from 'nookies';
export const setAuthDetails = (token: string) => {
  axios.defaults.headers.common['Authorization'] = 'Bearer ' + token;
  axios.defaults.baseURL = baseURL;
  axios.defaults.headers.post['Content-Type'] = 'application/json';
  // localStorage.setItem('accesstoken', token);
  // sessionStorage.setItem('accesstoken', token);
  // Set
  nookies.set(null, 'accesstoken', token, {
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
  });
};
export const removeAuthenticationDetails = () => {
  nookies.destroy(null, 'accesstoken', { path: '/' });
};

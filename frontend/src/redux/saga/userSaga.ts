// redux/sagas/userSaga.ts

import { call, put, takeLatest } from 'redux-saga/effects';
import { callApi } from '../../services/callApi';
import {
  fetchUsersFailure,
  fetchUsersRequest,
  fetchUsersSuccess,
} from '../reducers/userSlice';
import { getProfileRequest } from '../actions/globalActions';
interface UserDetails {
  id: string;
  name: string;
  token: string;
  // add more fields as needed
}

const rawData = localStorage.getItem('userDetails');

const userDetails: UserDetails | {} = rawData ? JSON.parse(rawData) : {};
function* fetchUsersWorker(action: any): Generator<any, any, any> {
  yield put(fetchUsersRequest());
  // console.log('run ');
  try {
    const response = yield call(callApi, 'user/profile/', 'GET', '');
    // console.log('run res', response);
    yield put(fetchUsersSuccess(response));
  } catch (error: any) {
    yield put(fetchUsersFailure(error));
  }
}

export function* fetchUsersWatch() {
  yield takeLatest(getProfileRequest.type, fetchUsersWorker);
}

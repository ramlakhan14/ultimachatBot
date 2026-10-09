// redux/sagas/rootSaga.ts

import { all } from 'redux-saga/effects';
import { fetchUsersWatch } from './userSaga';

export default function* rootSaga() {
  yield all([
    fetchUsersWatch(),
    // userSaga(),
    // userSaga(),
  ]);
}

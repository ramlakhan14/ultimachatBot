// redux/reducers/rootReducer.ts
import { combineReducers } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import appReducer from './appSlice';

const rootReducer = combineReducers({
  user: userReducer,
  app: appReducer,
  // add more slices here as needed
});

export type RootState = ReturnType<typeof rootReducer>;
export default rootReducer;

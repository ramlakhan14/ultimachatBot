// redux/slices/appSlice.ts
import { createSlice } from '@reduxjs/toolkit';
// import { startLoading, stopLoading, setError } from "./actions/globalActions";

const initialState: any = {
  isLoading: false,
  error: null,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    fetchUsers: () => {},
  },
});

export const { fetchUsers } = appSlice.actions;
export default appSlice.reducer;

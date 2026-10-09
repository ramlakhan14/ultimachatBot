// redux/slices/userSlice.ts
import { createSlice } from '@reduxjs/toolkit';

interface UserState {
  loading: boolean;
  error: string | null;
  profile: any;
}

const initialState: UserState = {
  loading: true,
  error: null,
  profile: {},
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    fetchUsersRequest(state) {
      state.loading = true;
      state.error = null;
    },
    fetchUsersSuccess(state, action: any) {
      state.loading = false;
      state.profile = action.payload;
    },
    fetchUsersFailure(state, action: any) {
      state.loading = false;
      state.error = action.payload;
    },
  },
});

export const { fetchUsersRequest, fetchUsersSuccess, fetchUsersFailure } =
  userSlice.actions;

export default userSlice.reducer;

// redux/types.ts

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface UserState {
  loading: boolean;
  error: string | null;
  users: User[];
}

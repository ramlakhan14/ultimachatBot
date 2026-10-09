import { SubscriptionType } from '../types/subscription.type';

export interface User {
  role: string;
  email: string;
  avatarUrl: string;
  id: number;
  activeSubscription: string;
  customKeys: {
    useOwnKey: boolean;
  };
  openaiKeys: {
    apiKey: string;
    useOwnKey: boolean;
  };
  subscriptionData: {
    maxChatbots: number;
    maxChunksPerPage: number;
    maxPages: number;
    maxTokens: number;
    name: SubscriptionType;
    type: 'MONTHLY' | 'YEARLY' | 'LIFETIME';
  };
}

export const CurrentUser: any = {
  currentUser: {},
  set(user: User) {
    this.currentUser = user;
  },
  get() {
    return this.currentUser;
  },
};

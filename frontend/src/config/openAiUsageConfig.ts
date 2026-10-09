export const OPENAI_USAGE_ALLOWED_EMAIL =
  process.env.REACT_APP_OPENAI_USAGE_ALLOWED_EMAIL || 'vaibhav@cvinfotech.com';

  

export const hasOpenAIUsageAccess = (
  userProfile: { email?: string; role?: string } | undefined,
): boolean => {
  if (!userProfile) return false;
  // Allow admin users OR the specific email from env
  return (
    userProfile.role === 'admin' &&
    userProfile.email === OPENAI_USAGE_ALLOWED_EMAIL
  );
};

export const isOpenAIUsageEmail = (
  userProfile: { email?: string } | undefined,
): boolean => {
  if (!userProfile?.email) return false;
  return userProfile.email === OPENAI_USAGE_ALLOWED_EMAIL;
};

export const EMAILTEMPLATE_COLLECTION = 'emailTemplates';

export interface EmailTemplate {
  // name:
  //   | 'signupEmailText'
  //   | 'forgetPasswordSuccessEmailText'
  //   | 'forgetPasswordEmailText'
  //   | 'inviteUserEmailText'
  //   | 'leadsDataEmailText'
  //   | 'offlineMessagesEmailText';
  // subject: string;
  emailBody: string; // Handlebars template
  // variables: string[]; // List of placeholders, e.g., ['{{name}}', '{{resetLink}}']
  createdAt: Date; // Reference to the superadmin user ID // Reference to the user who updated the template
  updatedAt: Date;
}

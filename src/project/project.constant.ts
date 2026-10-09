import thankYouMailTemplate from '../common/email/templates/thankYouMail';
import { GPTModels } from '../campaign/enum/enum';

export const defaultSetting = {
  backgroundColor: '#000',
  heading: 'I am your AI assistant',
  description: `Ask me anything. I'll try to answer based on the data from this website.,
  chatInputPlaceholderText: 'Type your message'`,
  assistantTabHeader: 'AI assistant',
  offlineMsgTabHeader: 'Offline message',
  readMoreText: 'Read more:',
  fontColor: '#FFF',
  borderRadius: '12px',
  placement: 'right',
  offlineMessage: false,
  showReadMore: true,
  showAsPopup: false,
  popupDelay: 3000,
  collectEmail: false,
  adminEmail: '',
  collectEmailText: 'What is your email address?',
  contentEmail: '',
  contentPhone: '',
  contentWhatsapp: '',
  contentVideo: '',
  contentAppointment: '',
  avatarFieldValue: '', // Added by Nidhi Sharma for Avatar Field
  avatarFieldLabel: '',
  appointmentFieldLabel: '',
  videoFieldLabel: '',
  whatsappFieldLabel: '',
  phoneFieldLabel: '',
  emailLabel: '',
  questionExamples: [
    {
      heading: 'Welcome Video Link',
      question: 'https_vide0_welcome',
      label: 'Video',
    },
    {
      heading: 'Welcome Book Appointment Link',
      question: 'https_calendaly_welcome',
      label: 'Book an appointment',
    },
    {
      heading: "Call Link (if bot don't answer",
      question: 'https_Call_welcome',
      label: 'Call',
    },
    {
      heading: "WhatsApp Link (if bot don't answer",
      question: 'https_WhatsApp_welcome',
      label: 'WhatsApp',
    },
    {
      heading: "Email Link (if bot don't answer",
      question: 'https_Email_welcome',
      label: 'Email',
    },
  ],
  welcomeMessages: ['Hello! How can I assist you today?'],
  welcomeMessage: 'Hello! How can I assist you today?',
  customCSS: '',
  prompt:
    'You are a very enthusiastic bot who loves to help people! Your name is {{chatbotName}} and you are designed to respond only based on the given context, outputted in Markdown format.',
  defaultAnswer: "I don't know how to answer that",
  launcherIcon: {
    id: 'icon1',
    svgElement: `<svg 
                focusable="false" 
                stroke="currentColor" 
                fill="none" 
                stroke-width="2" 
                viewBox="0 0 24 24"
                stroke-linecap="round" 
                stroke-linejoin="round" 
                height="1em" 
                width="1em" 
                xmlns="http://www.w3.org/2000/svg"
                style=" width: 38px; height: 38px;">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <path
                    d="M5.821 4.91c3.898 -2.765 9.469 -2.539 13.073 .536c3.667 3.127 4.168 8.238 1.152 11.897c-2.842 3.447 -7.965 4.583 -12.231 2.805l-.232 -.101l-4.375 .931l-.075 .013l-.11 .009l-.113 -.004l-.044 -.005l-.11 -.02l-.105 -.034l-.1 -.044l-.076 -.042l-.108 -.077l-.081 -.074l-.073 -.083l-.053 -.075l-.065 -.115l-.042 -.106l-.031 -.113l-.013 -.075l-.009 -.11l.004 -.113l.005 -.044l.02 -.11l.022 -.072l1.15 -3.451l-.022 -.036c-2.21 -3.747 -1.209 -8.392 2.411 -11.118l.23 -.168z"
                    stroke-width="0" fill="currentColor"></path>
              </svg>`,
  },
  offlineMsgHeading: 'Offline message',
  offlineMsgDescription:
    'Please fill out the form below and we will get back to you as soon as possible.',
  nameFieldLabel: 'Name',
  nameFieldPlaceholder: 'Enter your name',
  emailFieldLabel: 'Email',
  emailFieldPlaceholder: 'Enter your email',
  msgFieldLabel: 'Message',
  msgFieldPlaceholder: 'Enter your message',
  requiredFieldMsg: 'This field is required',
  invalidEmailMsg: 'Please enter a valid email',

  privacyPolicyLabel: '',
  privacyPolicyLink: '',
  termsAndConditionsLabel: '',
  termsAndConditionsLink: '',

  formSubmitBtnLabel: 'Submit',
  formSubmitBtnSubmittingText: 'Submitting...',
  formSubmitSuccessMsg: 'Your message sent successfully!',
  formSubmitErrorMsg: 'Oops! Something went wrong',
  formSendAgainBtnLabel: 'Send again',
  formTryAgainBtnLabel: 'Try again',
  model: GPTModels.GPT_4O_MINI,
  thankYouMailTemplate: thankYouMailTemplate,
  isThankYouEmailEnabled: true,
  leadCollectionData: [{ phoneNumber: false, address: false }],
};

import { LauncherIconsSVGs } from './LauncherIconSVGs';

// export function getDomainFromUrl(url: string) {
//   if (!url) return '';
//   const matches = url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i);
//   const domain = matches && matches[1]; // domain will be null if no match is found
//   return (domain || '').replace('www.', '');
// }

export function getDomainFromUrl(url: string) {
  if (!url) return '';

  // Ensure protocol exists
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r =
      (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >>
      (c === 'x' ? 0 : 4);
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

export function getBrowserName(userAgent: string) {
  if (!userAgent) return 'Other';

  // Detect ARC Welder
  if (userAgent.indexOf('ARC') > -1) {
    return 'ARC Welder';
  }

  // Detect Chrome
  if (
    userAgent.indexOf('Chrome') > -1 &&
    userAgent.indexOf('Edg') === -1 &&
    userAgent.indexOf('OPR') === -1
  ) {
    return 'Google Chrome';
  }

  // Detect Firefox
  if (userAgent.indexOf('Firefox') > -1) {
    return 'Mozilla Firefox';
  }

  // Detect Safari
  if (userAgent.indexOf('Safari') > -1 && userAgent.indexOf('Chrome') === -1) {
    return 'Safari';
  }

  // Detect Internet Explorer or Legacy Edge
  if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) {
    return 'Microsoft Internet Explorer';
  }

  // Detect Edge (Chromium)
  if (userAgent.indexOf('Edg') > -1) {
    return 'Microsoft Edge';
  }

  // Detect Opera
  if (userAgent.indexOf('Opera') > -1 || userAgent.indexOf('OPR') > -1) {
    return 'Opera';
  }

  // Other
  return 'Other';
}

export const chatWidgetDefaultValues = {
  backgroundColor: '#000',
  heading: 'I am your AI assistant',
  description: `Ask me anything. I'll try to answer based on the data from this website.`,
  chatInputPlaceholderText: 'Type your message',
  thankyouTextPlaceholderText: 'Type your content here...',
  assistantTabHeader: 'AI assistant',
  offlineMsgTabHeader: 'Offline message',
  readMoreText: 'Read more:',
  emailLabel: 'Email',
  avatarFieldLabel: 'Email',
  appointmentFieldLabel: 'Appointment',
  videoFieldLabel: 'Video',
  whatsappFieldLabel: 'Whatsapp',
  phoneFieldLabel: 'Phone',
  emailFieldLabel: 'Email',
  showIconPopup: true,
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
    svgElement: LauncherIconsSVGs.get('icon1'),
  },
  offlineMsgHeading: 'Offline message',
  offlineMsgDescription:
    'Please fill out the form below and we will get back to you as soon as possible.',
  nameFieldLabel: 'Name',
  nameFieldPlaceholder: 'Enter your name',
  privacypolicyLabel: '',
  privacypolicyValue: '',
  termsandconditionsLabel: '',
  termsandconditionsValue: '',
  emailFieldPlaceholder: 'Enter your email',
  msgFieldLabel: 'Message',
  msgFieldPlaceholder: 'Enter your message',
  requiredFieldMsg: 'This field is required',
  invalidEmailMsg: 'Please enter a valid email',
  formSubmitBtnLabel: 'Submit',
  formSubmitBtnSubmittingText: 'Submitting...',
  formSubmitSuccessMsg: 'Your message sent successfully!',
  formSubmitErrorMsg: 'Oops! Something went wrong',
  formSendAgainBtnLabel: 'Send again',
  formTryAgainBtnLabel: 'Try again',
  model: 'gpt-3.5-turbo',
  leadCollectionData: [{ phoneNumber: false, address: false }],
  isThankYouEmailEnabled: true,
  thankyouEmailText: '',
};

export const chatWidgetDefaultValuesForVakmangids = {
  backgroundColor: '#000',
  heading: 'Ik ben uw AI-assistent',
  description: `Vraag me alles. Ik zal proberen te antwoorden op basis van de gegevens van deze website.`,
  chatInputPlaceholderText: 'Typ uw bericht',
  assistantTabHeader: 'AI-assistent',
  offlineMsgTabHeader: 'Offline bericht',
  readMoreText: 'Lees meer:',
  fontColor: '#FFF',
  borderRadius: '12px',
  placement: 'rechts',
  offlineMessage: false,
  showReadMore: true,
  showAsPopup: false,
  popupDelay: 3000,
  collectEmail: false,
  adminEmail: '',
  collectEmailText: 'Wat is uw e-mailadres?',
  contentEmail: '',
  contentPhone: '',
  contentWhatsapp: '',
  contentVideo: '',
  emailLabel: '',
  avatarFieldValue: '',
  avatarFieldLabel: '',
  appointmentFieldLabel: 'Appointment',
  videoFieldLabel: 'Video',
  whatsappFieldLabel: 'Whatsapp',
  phoneFieldLabel: 'Phone',
  contentAppointment: '',
  questionExamples: [
    {
      heading: 'Welkomstvideo Link',
      question: 'https_vide0_welcome',
      label: 'Video',
    },
    {
      heading: 'Welkom Afspraak Boeken Link',
      question: 'https_calendaly_welcome',
      label: 'Boek een afspraak',
    },
    {
      heading: 'Bel Link (als bot niet antwoordt)',
      question: 'https_Call_welcome',
      label: 'Bellen',
    },
    {
      heading: 'WhatsApp Link (als bot niet antwoordt)',
      question: 'https_WhatsApp_welcome',
      label: 'WhatsApp',
    },
    {
      heading: 'E-mail Link (als bot niet antwoordt)',
      question: 'https_Email_welcome',
      label: 'E-mail',
    },
  ],
  welcomeMessages: ['Hallo! Hoe kan ik u vandaag helpen?'],
  welcomeMessage: 'Hallo! Hoe kan ik u vandaag helpen?',
  customCSS: '',
  prompt:'You are {{chatbotName}}, an experienced sales assistant designed to help visitors understand the benefits of the services offered on the website and guide them towards taking the next steps. Your responses should be SHORT, PRECISE, AND ACCURATE based on the given context. You should remember the visitor details they provide in the entire conversation by taking reference from the pastMessages, and avoid asking for these details again and again in the entire conversation. Guide visitors towards the goal, which you can analyze from the website. Do not ask for these details in the very first response. Instead, start with a friendly introduction and gather necessary information naturally as the conversation progresses.### Key Instructions:**Visitor Details Collection:** Collect the following details:1. FirstName 2.LastName3. Email4.Phone5. City6.Service Type 7.Location 8. category9. subCategory10. jobDescription.Ask these details one at a time in a conversational manner, ensuring the visitor comfort. Confirm collected details before moving to the next.**Sequential Flow for Details Collection:** - Ask for **firstName** first, then **lastName** **email** and **phone**.- Once firstName,lastName, email, and phone are collected, ask for **city**.- After collecting city,, ask for **postalCode**.- After collecting postal code ask for **serviceType**.- Once serviceType is collected, ask for **location**.-Once location is collected ask for **category**.- Once category is collected,ask for the **subCategory**-After collecting subCategory Finally,Ask for **jobDescription**.Always check if the visitor has already provided the details before asking again.Ask a relevant question at the end every time by analyzing the whole conversation from the pastMessages.You also provide these services as they are not included in the content Transport companiesCoach,rental,Rent a bus,bus trips,Airport transportation,Taxi.Remember type of service should be the query visitor is asking about.',
  // prompt:'U bent een zeer enthousiaste bot die graag mensen helpt! Uw naam is {{chatbotName}} en u bent ontworpen om alleen te reageren op basis van de gegeven context, uitvoer in Markdown-indeling.',
  defaultAnswer: 'Ik weet niet hoe ik daarop moet antwoorden',
  launcherIcon: {
    id: 'icon1',
    svgElement: LauncherIconsSVGs.get('icon1'),
  },
  offlineMsgHeading: 'Offline bericht',
  offlineMsgDescription:
    'Vul het onderstaande formulier in en wij nemen zo spoedig mogelijk contact met u op.',
  nameFieldLabel: 'Naam',
  nameFieldPlaceholder: 'Voer uw naam in',
  privacypolicyLabel: '',
  privacypolicyValue: '',
  termsandconditionsLabel: '',
  termsandconditionsValue: '',
  emailFieldLabel: 'E-mail',
  emailFieldPlaceholder: 'Voer uw e-mail in',
  msgFieldLabel: 'Bericht',
  msgFieldPlaceholder: 'Voer uw bericht in',
  requiredFieldMsg: 'Dit veld is verplicht',
  invalidEmailMsg: 'Voer een geldig e-mailadres in',
  formSubmitBtnLabel: 'Verzenden',
  formSubmitBtnSubmittingText: 'Verzenden...',
  formSubmitSuccessMsg: 'Uw bericht is succesvol verzonden!',
  formSubmitErrorMsg: 'Oeps! Er is iets misgegaan',
  formSendAgainBtnLabel: 'Opnieuw verzenden',
  formTryAgainBtnLabel: 'Opnieuw proberen',
  model: 'gpt-3.5-turbo',
  leadCollectionData: [{ phoneNumber: false, address: false }],
  isThankYouEmailEnabled: true,
  thankyouEmailText: '',
};

// export function formatNumber(num:number, precision = 0) {
//   const map = [
//     { suffix: 'T', threshold: 1e12 },
//     { suffix: 'B', threshold: 1e9 },
//     { suffix: 'M', threshold: 1e6 },
//     { suffix: 'K', threshold: 1e3 },
//     { suffix: '', threshold: 1 },
//   ];

//   const found = map.find((x) => Math.abs(num) >= x.threshold);
//   if (found) {
//     const formatted = (num / found.threshold).toFixed(precision) + found.suffix;
//     return formatted;
//   }

//   return num;
// }
export function formatNumber(num: number, precision?: number) {
  const map = [
    { suffix: 'T', threshold: 1e12 },
    { suffix: 'B', threshold: 1e9 },
    { suffix: 'M', threshold: 1e6 },
    { suffix: 'K', threshold: 1e3 },
    { suffix: '', threshold: 1 },
  ];

  const found = map.find((x) => Math.abs(num) >= x.threshold);
  if (!found) return num?.toString();

  const divided = num / found.threshold;
  let result: string;

  if (precision === undefined) {
    result = divided.toString();
  } else {
    const factor = Math.pow(10, precision);
    const truncated = Math.floor(divided * factor) / factor;
    result = truncated.toString();
  }

  return result + found.suffix;
}

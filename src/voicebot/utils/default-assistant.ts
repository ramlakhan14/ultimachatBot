import { IUpdateAssistant } from '../interfaces/vapi-key-config.interface';

const FEMALE_VOICE_ID = 'jECSILWxg8xmZ7q2QNZ5'; //'en-US-JennyNeural'; //indian Voice fooWT6UekrufC2qHLDa3
const MALE_VOICE_ID = 'mCQMfsqGDT6IDkEKR20a'; //'en-US-GuyNeural'; // in

const DEFAULTS = {
  name: 'VANI',
  companyName: 'Ultimate AI',
  firstMessage: 'Hi there! I hope I’m not catching you at a bad time.',
  endCallMessage:
    'Thank you for taking the time to discuss your needs with me today. Our team will be in touch with more information soon. Have a great day!',
  campaignName: 'Lead Generation',
  voiceMailMessage:
    "Hello, this is VANI. I'm calling to discuss how our solutions might help your business operations. I'll try reaching you again, or feel free to call us back at your convenience.",
  isEmotionRecognitionEnabled: true,
  language: 'en',
};

const getDefaultAssistant = (
  toolIds?: string[],
  assistantId?: string,
  assistantData?: IUpdateAssistant,
) => {
  const {
    userId,
    knowledgebaseId,
    assistantName = DEFAULTS.name,
    language = DEFAULTS.language,
    voiceCharacter,
    prompt,
    companyName = DEFAULTS.companyName,
    waitSeconds = 0.4,
    knowledgeBaseFiles = [],
  } = assistantData || {};
  const systemPrompt = prompt;

  const voiceId = voiceCharacter;

  return {
    transcriber: {
      model: 'nova-3',
      language: 'multi',
      numerals: false,
      provider: 'deepgram',
      endpointing: 150,
      confidenceThreshold: 0.4,
    },
    model: {
      // model: 'claude-3-7-sonnet-20250219',
      model: 'claude-sonnet-4-5-20250929',
      provider: 'anthropic',
      toolIds: toolIds,
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.3,
      maxTokens: 300,
      emotionRecognitionEnabled: DEFAULTS.isEmotionRecognitionEnabled,
      ...(knowledgeBaseFiles.length > 0 && {
        knowledgeBase: {
          fileIds: knowledgeBaseFiles,
          provider: 'google',
        },
      }),
    },

    // voice: {
    // model: 'eleven_multilingual_v2',
    // speed: 1,
    // voiceId: voiceId,
    // provider: '11labs',
    // stability: 0.7,
    // similarityBoost: 0.6,
    // inputPunctuationBoundaries: ['。'],
    // style: 0.0, // Add this to reduce unpredictability
    // },
    voice: {
      speed: 1,
      voiceId: 'en-US-JennyNeural',
      provider: 'azure',
      inputPunctuationBoundaries: ['。'],
    },
    clientMessages: [
      'conversation-update',
      'function-call',
      'hang',
      'model-output',
      'speech-update',
      'status-update',
      'transfer-update',
      'transcript',
      'tool-calls',
      'user-interrupted',
      'voice-input',
      'workflow.node.started',
      'tool-calls-result',
      'metadata',
    ],
    serverMessages: [
      'end-of-call-report',
      'function-call',
      'hang',
      'status-update',
      'tool-calls',
      'transfer-destination-request',
      'user-interrupted',
    ],
    name: assistantName,
    firstMessage: `Hello, this is VANI calling from ${companyName}. We work with organizations across various industries to help optimize their processes and improve overall performance. Do you have a moment to discuss your business needs?`,
    // forwardingPhoneNumber:"forwardingPhoneNumber",
    voicemailMessage:
      `Hello, this is ${assistantName} calling on behalf of ${companyName}. I'm reaching out to share some information that may be relevant to you. I'll try again later, or you can return the call at your convenience.` ||
      DEFAULTS.voiceMailMessage,
    endCallMessage: DEFAULTS.endCallMessage,
    dialKeypadFunctionEnabled: false,
    hipaaEnabled: false,
    backgroundSound: 'off',
    backchannelingEnabled: true,
    maxDurationSeconds: 900, //maximum number of seconds that the call will last.
    backgroundDenoisingEnabled: true,
    messagePlan: {
      idleMessages: [
        'Are you still there?',
        'Just a moment, please.',
        "I'll be with you shortly.",
        'Please wait while I process this.',
        'Thank you for your patience.',
        "Please hold on, I'm booking that for you.",
        'I appreciate your patience.',
        'Thanks for waiting.',
      ],
    },
    analysisPlan: {
      summaryPlan: {
        messages: [
          {
            content:
              'You are an expert note-taker. You will be given a transcript of a outbound call to a customer. The objective of the call is to gather information about the customer experience. Summarize the call in 2-3 sentences, if applicable.\n\n',
            role: 'system',
          },
          {
            content:
              'Here is the transcript:\n\n{{transcript}}\n\n. Here is the ended reason of the call:\n\n{{endedReason}}\n\n',
            role: 'user',
          },
        ],
      },
      structuredDataPlan: {
        enabled: true,
        messages: [
          {
            content:
              'You will be given a transcript of a outbound call that occurred between the Assistant and the caller. If caller agrees to give the answer. Extract the following information:\n\nAge:"Would you please let me know your age?" \n\nJson Schema:\n{{schema}}\n\nOnly respond with the JSON.',
            role: 'system',
          },
          {
            content:
              'Here is the transcript:\n\n{{transcript}}\n\n. Here is the ended reason of the call:\n\n{{endedReason}}\n\n',
            role: 'user',
          },
        ],
      },
      successEvaluationPlan: {
        rubric: 'PercentageScale',
        messages: [
          {
            content:
              '📊 Voice AI Call Success Evaluation Prompt\nEvaluate the success of a voice AI outbound call based on the lead\'s engagement level:\n\n100% Success (Excellent):\nThe meeting is successfully booked through the assistant.\n\n60% Success (Average):\nThe caller shows interest but isn’t ready to move forward right now — may ask to be contacted later.\n\n20% Success (Low):\nThe caller listens briefly and disconnects the call without any interaction or meaningful response.\n\n0% Success (Fail):\nThe caller clearly expresses disinterest and says “do not call me again” or similar — this should also trigger suppression logic.\n\n"Based on the lead\'s response, assign a success score using this scale. This helps us continuously evaluate assistant performance and campaign effectiveness."\n\nRubric:\n\n{{rubric}}\n\nOnly respond with the evaluation result.',
            role: 'system',
          },
          {
            content:
              'Here is the transcript of the call:\n\n{{transcript}}\n\n. Here is the ended reason of the call:\n\n{{endedReason}}\n\n',
            role: 'user',
          },
          {
            content:
              'Here was the system prompt of the call:\n\n{{systemPrompt}}\n\n',
            role: 'user',
          },
        ],
      },
    },
    startSpeakingPlan: {
      waitSeconds: waitSeconds || 0.05, //changed 0.1 to 0.05
      transcriptionEndpointingPlan: {
        onPunctuationSeconds: 0.1,
        onNoPunctuationSeconds: 0.1, //changed from 0.5 to 0.1
        onNumberSeconds: 0.5,
      },
      smartEndpointingEnabled: 'livekit',
    },
    stopSpeakingPlan: {
      numWords: 0,
      voiceSeconds: 0.15,
      backoffSeconds: 0.2, //changed from 0.8 to 0.2
      acknowledgementPhrases: [
        'yeah',
        'yes',
        'okay',
        'ok',
        'right',
        'mm-hmm',
        'uh-huh',
      ],
    },
    server: {
      url: assistantData?.webhookUrl
        ? assistantData?.webhookUrl
        : process.env.ADVANCE_VAPI_SERVERURL,
      headers: {
        userid: userId || null,
        knowledgebaseId: knowledgebaseId || null,
      },
    },
    voicemailDetection: {
      provider: 'vapi',
      backoffPlan: {
        startAtSeconds: 5,
        frequencySeconds: 5,
        maxRetries: 6,
      },
      beepMaxAwaitSeconds: 15,
    },
    // serverUrl: process.env.ADVANCE_VAPI_SERVERURL,
    endCallFunctionEnabled: true,
  };
};

export default getDefaultAssistant;

export type AssistantData = {
  userId: string;
  inboundBotId: string;
  knowledgebaseId: string;
  botName?: string;
  language?: string;
  voiceCharacter?: string;
  waitSeconds?: number;
  prompt?: string;
  assistantId?: string;
  toolIds?: string[];
  knowledgeBaseFiles?: string[];
  INBOUND_BOT_SERVER_URL?: string;
};

const DEFAULTS = {
  name: 'VANI',
  companyName: 'Ultimate AI',
  firstMessage:
    "Hello! I'm VANI, your virtual assistant. I’m here to help you with any questions or information you need.",
  endCallMessage:
    'Thank you for taking the time to speak with me today. Our team will follow up with you shortly. Have a wonderful day!',
  language: 'en',
};
const getDefaultInboundBot = (
  promptFromChatGPT: string,
  toolIds?: string[],
  assistantData?: AssistantData,
) => {
  const {
    userId,
    inboundBotId,
    botName: rawBotName,
    language = DEFAULTS.language,
    voiceCharacter,
    waitSeconds = 0.4,
    knowledgeBaseFiles,
    INBOUND_BOT_SERVER_URL,
    knowledgebaseId,
  } = assistantData;

  // Ensure botName has a valid value, fallback to DEFAULTS.name if empty or not provided
  const botName =
    rawBotName && rawBotName.trim().length > 0
      ? rawBotName.trim()
      : DEFAULTS.name;

  // Generate dynamic firstMessage with bot name, or use custom one if provided
  const firstMessage =
    `Hello! I'm ${botName}, your virtual assistant. I'm here to help you with any questions or information you need.` ||
    DEFAULTS.firstMessage;

  const voiceId = voiceCharacter;
  const { endCallMessage } = DEFAULTS;
  const systemPrompt = promptFromChatGPT;

  return {
    transcriber: {
      model: 'nova-3',
      language: language || 'multi',
      numerals: false,
      provider: 'deepgram',
      endpointing: 300,
      confidenceThreshold: 0.4,
    },
    model: {
      model: 'claude-sonnet-4-5-20250929',
      provider: 'anthropic',
      toolIds: toolIds || [],
      messages: [{ role: 'system', content: systemPrompt }],
      temperature: 0.7, // 0.7 for natural conversation variance
      maxTokens: 800, // 800 for complete responses
      emotionRecognitionEnabled: true,
      ...(knowledgeBaseFiles.length > 0 && {
        knowledgeBase: {
          fileIds: knowledgeBaseFiles,
          provider: 'google',
        },
      }),
    },
    voice: {
      speed: 1,
      voiceId: voiceId || 'es-ES-IsidoraMultilingualNeural',
      provider: 'azure',
      inputPunctuationBoundaries: ['。'],
    },
    firstMessage,
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
    name: botName,
    endCallMessage,
    dialKeypadFunctionEnabled: false,
    hipaaEnabled: false,
    backgroundSound: 'office',
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
            content: `You are a note-taking assistant bot. Use this system prompt to summarize the call appropriately:\n\n${systemPrompt}\n\nSummarize the call in 3-4 sentences, if applicable.`,
            role: 'system',
          },
          {
            content:
              'Here is the transcript:\n\n{{transcript}}\n\nHere is the ended reason of the call:\n\n{{endedReason}}\n\n',
            role: 'user',
          },
        ],
      },
      structuredDataPlan: {
        enabled: true,
        messages: [
          {
            content: `You will be given a transcript of a call between the assistant and the caller. Use this system prompt to guide data extraction:\n\n${systemPrompt}\n\nOnly respond with JSON.`,
            role: 'system',
          },
          {
            content:
              'Here is the transcript:\n\n{{transcript}}\n\nHere is the ended reason of the call:\n\n{{endedReason}}\n\n',
            role: 'user',
          },
        ],
      },
      successEvaluationPlan: {
        rubric: 'PercentageScale',
        messages: [
          {
            content: `📊 Voice AI Call Success Evaluation Prompt\nUse this system prompt to evaluate the call:\n\n${systemPrompt}\n\nAssign a success score based on the engagement level of the lead.`,
            role: 'system',
          },
          {
            content:
              'Here is the transcript of the call:\n\n{{transcript}}\n\nHere is the ended reason of the call:\n\n{{endedReason}}\n\n',
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
      waitSeconds: waitSeconds || 0.1,
      transcriptionEndpointingPlan: {
        onPunctuationSeconds: 0.1,
        onNoPunctuationSeconds: 1.5,
        onNumberSeconds: 0.5,
      },
      smartEndpointingEnabled: 'livekit',
    },
    stopSpeakingPlan: { numWords: 0 },
    server: {
      url: INBOUND_BOT_SERVER_URL,
      headers: {
        userid: userId || null,
        inboundBotId: inboundBotId || null,
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
    endCallFunctionEnabled: true,
  };
};

export default getDefaultInboundBot;

export function generatePayloadForBookingAppointmentTool(userId: string) {
  return {
    type: 'function',
    function: {
      name: '_BookAppointment',
      strict: false,
      description: 'This tool is used for the appointment Booking',
      parameters: {
        type: 'object',
        properties: {
          _email: {
            description:
              'this is a email field to get the email address from the caller',
            type: 'string',
          },
          _dateAndTime: {
            description: 'This is meeting date and Time given by the caller.',
            type: 'string',
          },
          _fullName: {
            description: 'This is a name field.',
            type: 'string',
          },
          _slot: {
            description: 'This is the slot field , chosen by the caller.',
            type: 'string',
          },
          _address: {
            description: 'this will store  the caller address',
            type: 'string',
          },
          _firstQuestion: {
            description: 'This is the first question asked by the caller',
            type: 'string',
          },
          _secondQuestion: {
            description: 'This is the second question asked by the caller',
            type: 'string',
          },
          _thirdQuestion: {
            description: 'This is the third question asked by the caller',
            type: 'string',
          },
        },
        required: [],
      },
    },
    messages: [],
    server: {
      url: process.env.TOOL_VAPI_BOOKING,
      headers: {
        userid: userId,
      },
    },
    async: false,
  };
}

export function generatePayloadForCheckBookingSlotTool(userId: string) {
  return {
    type: 'function',
    function: {
      name: '_CheckBookingSlot',
      strict: true,
      description:
        'This tool is used to check the available slots for the appointment',
      parameters: {
        type: 'object',
        properties: {
          _dateAndTime: {
            description: 'this is a date and time field for appointment',
            type: 'string',
          },
        },
        required: [],
      },
    },
    messages: [],
    server: {
      url: process.env.TOOL_VAPI_CHECKSLOT,
      headers: {
        userid: userId,
      },
    },
    async: false,
  };
}

export function addToSuppressListTool(userId: string) {
  return {
    type: 'function',
    function: {
      name: '_AddToSuppressList',
      strict: true,
      description:
        'Adds the current caller’s phone number to the suppression list to prevent future calls.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    messages: [],
    server: {
      url: process.env.TOOL_VAPI_SUPPRESSION,
      headers: {
        userid: userId,
      },
    },
    async: false,
  };
}

export function generatePayloadForTransferCallTool(
  callForwardingNumbers?: {
    name: string;
    number: string;
    customMessage: string;
  }[],
  toolName = 'transfer_call_tool',
  systemNumber?: string,
) {
  return {
    type: 'transferCall',
    destinations: callForwardingNumbers?.map(
      ({ name, number, customMessage }) => ({
        type: 'number',
        number,
        ...(systemNumber ? { callerId: systemNumber } : {}),
        message:
          customMessage ||
          `Transferring your call to ${name} at ${number}. Please hold while we connect you.`,
        description: `Transfer the call to ${name} at ${number}. Choose this destination if the caller asks to speak with ${name} or if the conversation suggests they need help from ${name}'s department.`,
        transferPlan: {
          mode: 'warm-transfer-wait-for-operator-to-speak-first-and-then-say-message',
          message: `Hello ${name}, this call is being forwarded to you through Vapi. The caller requested to speak with you or your department.`,
        },
      }),
    ),
    function: {
      name: toolName,
      description:
        'Use this function to transfer the call to the right person or department when the caller asks for it or when the assistant understands from the conversation that a transfer is needed.',
      parameters: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            enum: callForwardingNumbers?.map(({ number }) => number),
            description:
              'The phone number to transfer the call to, chosen based on what the caller requests or what the assistant infers from the conversation.',
          },
        },
        required: [],
      },
    },
    messages: [],
  };
}

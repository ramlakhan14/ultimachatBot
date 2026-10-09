// Set to true if you want to test with rich dummy data, or false to use live backend APIs
export const USE_DUMMY_DATA = false;

export const dummyUsersData = [
  { _id: 'all', name: 'User Account', email: 'User Account' },
  {
    _id: '69bbe3ae646111de433f5404',
    name: 'anchale@cvinfotech.com',
    email: 'anchale@cvinfotech.com',
  },
  {
    _id: '69d3827a5826d07b246f69c3',
    name: 'nishab@yopmail.com',
    email: 'nishab@yopmail.com',
  },
  {
    _id: '69d36e425826d07b246f69c2',
    name: 'nisha@yopmail.com',
    email: 'nisha@yopmail.com',
  },
];

// 12 Months All-Year Overview Data with 20 Models
export const dummyYearlyOverviewData = {
  groupBy: 'month',
  from: '2026-01-01',
  to: '2026-12-31',
  totalSpend: 2850.96, // Updated total
  todaySpend: 236.0,
  chartData: [
    // January
    {
      period: '2026-01',
      label: '1',
      models: {
        'text-embedding-ada-002': {
          requests: 120,
          inputTokens: 50000,
          outputTokens: 0,
          costUsd: 5.2,
        },
        'gpt-5-mini': {
          requests: 450,
          inputTokens: 180000,
          outputTokens: 90000,
          costUsd: 2.8,
        },
        'gpt-4o-mini': {
          requests: 380,
          inputTokens: 150000,
          outputTokens: 85000,
          costUsd: 3.5,
        },
        'claude-3-haiku': {
          requests: 200,
          inputTokens: 80000,
          outputTokens: 40000,
          costUsd: 4.2,
        },
        'claude-3-sonnet': {
          requests: 150,
          inputTokens: 70000,
          outputTokens: 35000,
          costUsd: 6.8,
        },
        'claude-3-opus': {
          requests: 80,
          inputTokens: 40000,
          outputTokens: 20000,
          costUsd: 12.5,
        },
        'gemini-pro': {
          requests: 300,
          inputTokens: 120000,
          outputTokens: 60000,
          costUsd: 3.0,
        },
        'gemini-ultra': {
          requests: 60,
          inputTokens: 30000,
          outputTokens: 15000,
          costUsd: 9.8,
        },
        'llama-3-70b': {
          requests: 180,
          inputTokens: 90000,
          outputTokens: 45000,
          costUsd: 7.2,
        },
        'llama-3-8b': {
          requests: 420,
          inputTokens: 200000,
          outputTokens: 100000,
          costUsd: 2.1,
        },
        'mistral-large': {
          requests: 140,
          inputTokens: 60000,
          outputTokens: 30000,
          costUsd: 5.6,
        },
        'mistral-medium': {
          requests: 350,
          inputTokens: 160000,
          outputTokens: 80000,
          costUsd: 3.8,
        },
        'mistral-small': {
          requests: 500,
          inputTokens: 220000,
          outputTokens: 110000,
          costUsd: 1.9,
        },
        'cohere-command': {
          requests: 220,
          inputTokens: 100000,
          outputTokens: 50000,
          costUsd: 4.5,
        },
        'cohere-embed': {
          requests: 180,
          inputTokens: 75000,
          outputTokens: 0,
          costUsd: 3.2,
        },
        'dall-e-3': {
          requests: 50,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 15.0,
        },
        'dall-e-2': {
          requests: 100,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 7.5,
        },
        'whisper-large': {
          requests: 90,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 4.8,
        },
        't5-xxl': {
          requests: 250,
          inputTokens: 110000,
          outputTokens: 55000,
          costUsd: 2.5,
        },
        'bert-large': {
          requests: 320,
          inputTokens: 130000,
          outputTokens: 0,
          costUsd: 1.8,
        },
      },
      totalCostUsd: 108.5,
    },
    // February
    {
      period: '2026-02',
      label: '2',
      models: {
        'text-embedding-ada-002': {
          requests: 150,
          inputTokens: 60000,
          outputTokens: 0,
          costUsd: 6.3,
        },
        'gpt-5-mini': {
          requests: 300,
          inputTokens: 140000,
          outputTokens: 70000,
          costUsd: 1.6,
        },
        'gpt-4o-mini': {
          requests: 420,
          inputTokens: 190000,
          outputTokens: 95000,
          costUsd: 4.6,
        },
        'claude-3-haiku': {
          requests: 180,
          inputTokens: 75000,
          outputTokens: 37000,
          costUsd: 3.9,
        },
        'claude-3-sonnet': {
          requests: 130,
          inputTokens: 65000,
          outputTokens: 32000,
          costUsd: 6.2,
        },
        'claude-3-opus': {
          requests: 70,
          inputTokens: 35000,
          outputTokens: 18000,
          costUsd: 11.8,
        },
        'gemini-pro': {
          requests: 280,
          inputTokens: 115000,
          outputTokens: 58000,
          costUsd: 2.8,
        },
        'gemini-ultra': {
          requests: 55,
          inputTokens: 28000,
          outputTokens: 14000,
          costUsd: 9.2,
        },
        'llama-3-70b': {
          requests: 160,
          inputTokens: 85000,
          outputTokens: 42000,
          costUsd: 6.5,
        },
        'llama-3-8b': {
          requests: 400,
          inputTokens: 190000,
          outputTokens: 95000,
          costUsd: 2.0,
        },
        'mistral-large': {
          requests: 125,
          inputTokens: 55000,
          outputTokens: 28000,
          costUsd: 5.2,
        },
        'mistral-medium': {
          requests: 330,
          inputTokens: 155000,
          outputTokens: 78000,
          costUsd: 3.5,
        },
        'mistral-small': {
          requests: 480,
          inputTokens: 210000,
          outputTokens: 105000,
          costUsd: 1.8,
        },
        'cohere-command': {
          requests: 200,
          inputTokens: 95000,
          outputTokens: 48000,
          costUsd: 4.2,
        },
        'cohere-embed': {
          requests: 165,
          inputTokens: 70000,
          outputTokens: 0,
          costUsd: 3.0,
        },
        'dall-e-3': {
          requests: 45,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 14.0,
        },
        'dall-e-2': {
          requests: 90,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 7.0,
        },
        'whisper-large': {
          requests: 85,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 4.5,
        },
        't5-xxl': {
          requests: 230,
          inputTokens: 105000,
          outputTokens: 52000,
          costUsd: 2.3,
        },
        'bert-large': {
          requests: 300,
          inputTokens: 125000,
          outputTokens: 0,
          costUsd: 1.7,
        },
      },
      totalCostUsd: 102.3,
    },
    // March
    {
      period: '2026-03',
      label: '3',
      models: {
        'text-embedding-ada-002': {
          requests: 80,
          inputTokens: 30000,
          outputTokens: 0,
          costUsd: 2.4,
        },
        'gpt-5-mini': {
          requests: 620,
          inputTokens: 250000,
          outputTokens: 120000,
          costUsd: 5.4,
        },
        'gpt-4o-mini': {
          requests: 310,
          inputTokens: 130000,
          outputTokens: 65000,
          costUsd: 3.2,
        },
        'claude-3-haiku': {
          requests: 250,
          inputTokens: 100000,
          outputTokens: 50000,
          costUsd: 5.1,
        },
        'claude-3-sonnet': {
          requests: 170,
          inputTokens: 80000,
          outputTokens: 40000,
          costUsd: 7.5,
        },
        'claude-3-opus': {
          requests: 90,
          inputTokens: 45000,
          outputTokens: 22000,
          costUsd: 13.2,
        },
        'gemini-pro': {
          requests: 350,
          inputTokens: 140000,
          outputTokens: 70000,
          costUsd: 3.5,
        },
        'gemini-ultra': {
          requests: 70,
          inputTokens: 35000,
          outputTokens: 18000,
          costUsd: 10.5,
        },
        'llama-3-70b': {
          requests: 200,
          inputTokens: 95000,
          outputTokens: 48000,
          costUsd: 7.8,
        },
        'llama-3-8b': {
          requests: 450,
          inputTokens: 210000,
          outputTokens: 105000,
          costUsd: 2.2,
        },
        'mistral-large': {
          requests: 155,
          inputTokens: 68000,
          outputTokens: 34000,
          costUsd: 6.0,
        },
        'mistral-medium': {
          requests: 380,
          inputTokens: 175000,
          outputTokens: 88000,
          costUsd: 4.0,
        },
        'mistral-small': {
          requests: 520,
          inputTokens: 235000,
          outputTokens: 118000,
          costUsd: 2.0,
        },
        'cohere-command': {
          requests: 240,
          inputTokens: 108000,
          outputTokens: 54000,
          costUsd: 4.8,
        },
        'cohere-embed': {
          requests: 190,
          inputTokens: 80000,
          outputTokens: 0,
          costUsd: 3.4,
        },
        'dall-e-3': {
          requests: 55,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 16.0,
        },
        'dall-e-2': {
          requests: 105,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 8.0,
        },
        'whisper-large': {
          requests: 95,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 5.0,
        },
        't5-xxl': {
          requests: 270,
          inputTokens: 115000,
          outputTokens: 58000,
          costUsd: 2.7,
        },
        'bert-large': {
          requests: 340,
          inputTokens: 135000,
          outputTokens: 0,
          costUsd: 1.9,
        },
      },
      totalCostUsd: 110.0,
    },
    // April
    {
      period: '2026-04',
      label: '4',
      models: {
        'text-embedding-ada-002': {
          requests: 40,
          inputTokens: 20000,
          outputTokens: 0,
          costUsd: 1.1,
        },
        'gpt-5-mini': {
          requests: 810,
          inputTokens: 320000,
          outputTokens: 160000,
          costUsd: 8.8,
        },
        'gpt-4o-mini': {
          requests: 120,
          inputTokens: 50000,
          outputTokens: 25000,
          costUsd: 1.1,
        },
        'claude-3-haiku': {
          requests: 300,
          inputTokens: 120000,
          outputTokens: 60000,
          costUsd: 6.0,
        },
        'claude-3-sonnet': {
          requests: 200,
          inputTokens: 90000,
          outputTokens: 45000,
          costUsd: 8.5,
        },
        'claude-3-opus': {
          requests: 100,
          inputTokens: 50000,
          outputTokens: 25000,
          costUsd: 14.5,
        },
        'gemini-pro': {
          requests: 400,
          inputTokens: 160000,
          outputTokens: 80000,
          costUsd: 4.0,
        },
        'gemini-ultra': {
          requests: 80,
          inputTokens: 40000,
          outputTokens: 20000,
          costUsd: 11.5,
        },
        'llama-3-70b': {
          requests: 220,
          inputTokens: 105000,
          outputTokens: 52000,
          costUsd: 8.2,
        },
        'llama-3-8b': {
          requests: 480,
          inputTokens: 220000,
          outputTokens: 110000,
          costUsd: 2.3,
        },
        'mistral-large': {
          requests: 170,
          inputTokens: 72000,
          outputTokens: 36000,
          costUsd: 6.3,
        },
        'mistral-medium': {
          requests: 400,
          inputTokens: 185000,
          outputTokens: 92000,
          costUsd: 4.2,
        },
        'mistral-small': {
          requests: 540,
          inputTokens: 245000,
          outputTokens: 122000,
          costUsd: 2.1,
        },
        'cohere-command': {
          requests: 260,
          inputTokens: 112000,
          outputTokens: 56000,
          costUsd: 5.0,
        },
        'cohere-embed': {
          requests: 200,
          inputTokens: 85000,
          outputTokens: 0,
          costUsd: 3.5,
        },
        'dall-e-3': {
          requests: 60,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 17.0,
        },
        'dall-e-2': {
          requests: 110,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 8.5,
        },
        'whisper-large': {
          requests: 100,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 5.2,
        },
        't5-xxl': {
          requests: 290,
          inputTokens: 120000,
          outputTokens: 60000,
          costUsd: 2.9,
        },
        'bert-large': {
          requests: 360,
          inputTokens: 140000,
          outputTokens: 0,
          costUsd: 2.0,
        },
      },
      totalCostUsd: 115.2,
    },
    // May
    {
      period: '2026-05',
      label: '5',
      models: {
        'text-embedding-ada-002': {
          requests: 130,
          inputTokens: 55000,
          outputTokens: 0,
          costUsd: 5.3,
        },
        'gpt-5-mini': {
          requests: 390,
          inputTokens: 160000,
          outputTokens: 80000,
          costUsd: 2.5,
        },
        'gpt-4o-mini': {
          requests: 360,
          inputTokens: 140000,
          outputTokens: 70000,
          costUsd: 3.2,
        },
        'claude-3-haiku': {
          requests: 210,
          inputTokens: 85000,
          outputTokens: 42000,
          costUsd: 4.3,
        },
        'claude-3-sonnet': {
          requests: 155,
          inputTokens: 72000,
          outputTokens: 36000,
          costUsd: 6.9,
        },
        'claude-3-opus': {
          requests: 82,
          inputTokens: 41000,
          outputTokens: 20000,
          costUsd: 12.6,
        },
        'gemini-pro': {
          requests: 310,
          inputTokens: 125000,
          outputTokens: 62000,
          costUsd: 3.1,
        },
        'gemini-ultra': {
          requests: 62,
          inputTokens: 31000,
          outputTokens: 15500,
          costUsd: 9.9,
        },
        'llama-3-70b': {
          requests: 185,
          inputTokens: 92000,
          outputTokens: 46000,
          costUsd: 7.3,
        },
        'llama-3-8b': {
          requests: 425,
          inputTokens: 205000,
          outputTokens: 102000,
          costUsd: 2.1,
        },
        'mistral-large': {
          requests: 145,
          inputTokens: 62000,
          outputTokens: 31000,
          costUsd: 5.7,
        },
        'mistral-medium': {
          requests: 355,
          inputTokens: 165000,
          outputTokens: 82000,
          costUsd: 3.9,
        },
        'mistral-small': {
          requests: 510,
          inputTokens: 225000,
          outputTokens: 112000,
          costUsd: 1.9,
        },
        'cohere-command': {
          requests: 225,
          inputTokens: 102000,
          outputTokens: 51000,
          costUsd: 4.6,
        },
        'cohere-embed': {
          requests: 185,
          inputTokens: 77000,
          outputTokens: 0,
          costUsd: 3.3,
        },
        'dall-e-3': {
          requests: 52,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 15.2,
        },
        'dall-e-2': {
          requests: 102,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 7.6,
        },
        'whisper-large': {
          requests: 92,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 4.9,
        },
        't5-xxl': {
          requests: 255,
          inputTokens: 112000,
          outputTokens: 56000,
          costUsd: 2.6,
        },
        'bert-large': {
          requests: 325,
          inputTokens: 132000,
          outputTokens: 0,
          costUsd: 1.8,
        },
      },
      totalCostUsd: 109.7,
    },
    // June
    {
      period: '2026-06',
      label: '6',
      models: {
        'text-embedding-ada-002': {
          requests: 70,
          inputTokens: 28000,
          outputTokens: 0,
          costUsd: 2.4,
        },
        'gpt-5-mini': {
          requests: 680,
          inputTokens: 270000,
          outputTokens: 130000,
          costUsd: 5.4,
        },
        'gpt-4o-mini': {
          requests: 330,
          inputTokens: 135000,
          outputTokens: 68000,
          costUsd: 3.2,
        },
        'claude-3-haiku': {
          requests: 260,
          inputTokens: 105000,
          outputTokens: 52000,
          costUsd: 5.2,
        },
        'claude-3-sonnet': {
          requests: 175,
          inputTokens: 82000,
          outputTokens: 41000,
          costUsd: 7.6,
        },
        'claude-3-opus': {
          requests: 92,
          inputTokens: 46000,
          outputTokens: 23000,
          costUsd: 13.4,
        },
        'gemini-pro': {
          requests: 360,
          inputTokens: 145000,
          outputTokens: 72000,
          costUsd: 3.6,
        },
        'gemini-ultra': {
          requests: 72,
          inputTokens: 36000,
          outputTokens: 18000,
          costUsd: 10.6,
        },
        'llama-3-70b': {
          requests: 205,
          inputTokens: 98000,
          outputTokens: 49000,
          costUsd: 7.9,
        },
        'llama-3-8b': {
          requests: 455,
          inputTokens: 215000,
          outputTokens: 108000,
          costUsd: 2.2,
        },
        'mistral-large': {
          requests: 158,
          inputTokens: 69000,
          outputTokens: 34500,
          costUsd: 6.1,
        },
        'mistral-medium': {
          requests: 385,
          inputTokens: 178000,
          outputTokens: 89000,
          costUsd: 4.1,
        },
        'mistral-small': {
          requests: 525,
          inputTokens: 238000,
          outputTokens: 119000,
          costUsd: 2.0,
        },
        'cohere-command': {
          requests: 245,
          inputTokens: 110000,
          outputTokens: 55000,
          costUsd: 4.9,
        },
        'cohere-embed': {
          requests: 195,
          inputTokens: 82000,
          outputTokens: 0,
          costUsd: 3.5,
        },
        'dall-e-3': {
          requests: 57,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 16.2,
        },
        'dall-e-2': {
          requests: 108,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 8.1,
        },
        'whisper-large': {
          requests: 97,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 5.1,
        },
        't5-xxl': {
          requests: 275,
          inputTokens: 118000,
          outputTokens: 59000,
          costUsd: 2.8,
        },
        'bert-large': {
          requests: 345,
          inputTokens: 138000,
          outputTokens: 0,
          costUsd: 1.9,
        },
      },
      totalCostUsd: 111.5,
    },
    // July
    {
      period: '2026-07',
      label: '7',
      models: {
        'text-embedding-ada-002': {
          requests: 160,
          inputTokens: 65000,
          outputTokens: 0,
          costUsd: 6.3,
        },
        'gpt-5-mini': {
          requests: 280,
          inputTokens: 120000,
          outputTokens: 60000,
          costUsd: 1.6,
        },
        'gpt-4o-mini': {
          requests: 450,
          inputTokens: 200000,
          outputTokens: 100000,
          costUsd: 4.6,
        },
        'claude-3-haiku': {
          requests: 190,
          inputTokens: 78000,
          outputTokens: 39000,
          costUsd: 4.0,
        },
        'claude-3-sonnet': {
          requests: 140,
          inputTokens: 68000,
          outputTokens: 34000,
          costUsd: 6.4,
        },
        'claude-3-opus': {
          requests: 75,
          inputTokens: 38000,
          outputTokens: 19000,
          costUsd: 12.0,
        },
        'gemini-pro': {
          requests: 290,
          inputTokens: 118000,
          outputTokens: 59000,
          costUsd: 2.9,
        },
        'gemini-ultra': {
          requests: 58,
          inputTokens: 29000,
          outputTokens: 14500,
          costUsd: 9.4,
        },
        'llama-3-70b': {
          requests: 168,
          inputTokens: 88000,
          outputTokens: 44000,
          costUsd: 6.7,
        },
        'llama-3-8b': {
          requests: 410,
          inputTokens: 195000,
          outputTokens: 98000,
          costUsd: 2.0,
        },
        'mistral-large': {
          requests: 132,
          inputTokens: 58000,
          outputTokens: 29000,
          costUsd: 5.4,
        },
        'mistral-medium': {
          requests: 340,
          inputTokens: 158000,
          outputTokens: 79000,
          costUsd: 3.6,
        },
        'mistral-small': {
          requests: 490,
          inputTokens: 215000,
          outputTokens: 108000,
          costUsd: 1.8,
        },
        'cohere-command': {
          requests: 210,
          inputTokens: 98000,
          outputTokens: 49000,
          costUsd: 4.3,
        },
        'cohere-embed': {
          requests: 172,
          inputTokens: 72000,
          outputTokens: 0,
          costUsd: 3.1,
        },
        'dall-e-3': {
          requests: 48,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 14.5,
        },
        'dall-e-2': {
          requests: 95,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 7.2,
        },
        'whisper-large': {
          requests: 88,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 4.6,
        },
        't5-xxl': {
          requests: 240,
          inputTokens: 108000,
          outputTokens: 54000,
          costUsd: 2.4,
        },
        'bert-large': {
          requests: 310,
          inputTokens: 128000,
          outputTokens: 0,
          costUsd: 1.7,
        },
      },
      totalCostUsd: 105.8,
    },
    // August
    {
      period: '2026-08',
      label: '8',
      models: {
        'text-embedding-ada-002': {
          requests: 40,
          inputTokens: 18000,
          outputTokens: 0,
          costUsd: 1.1,
        },
        'gpt-5-mini': {
          requests: 850,
          inputTokens: 340000,
          outputTokens: 170000,
          costUsd: 8.9,
        },
        'gpt-4o-mini': {
          requests: 110,
          inputTokens: 48000,
          outputTokens: 24000,
          costUsd: 1.0,
        },
        'claude-3-haiku': {
          requests: 310,
          inputTokens: 125000,
          outputTokens: 62000,
          costUsd: 6.2,
        },
        'claude-3-sonnet': {
          requests: 210,
          inputTokens: 95000,
          outputTokens: 48000,
          costUsd: 8.8,
        },
        'claude-3-opus': {
          requests: 105,
          inputTokens: 52000,
          outputTokens: 26000,
          costUsd: 14.8,
        },
        'gemini-pro': {
          requests: 420,
          inputTokens: 168000,
          outputTokens: 84000,
          costUsd: 4.2,
        },
        'gemini-ultra': {
          requests: 85,
          inputTokens: 42000,
          outputTokens: 21000,
          costUsd: 11.8,
        },
        'llama-3-70b': {
          requests: 230,
          inputTokens: 108000,
          outputTokens: 54000,
          costUsd: 8.4,
        },
        'llama-3-8b': {
          requests: 490,
          inputTokens: 225000,
          outputTokens: 112000,
          costUsd: 2.4,
        },
        'mistral-large': {
          requests: 178,
          inputTokens: 75000,
          outputTokens: 38000,
          costUsd: 6.5,
        },
        'mistral-medium': {
          requests: 410,
          inputTokens: 190000,
          outputTokens: 95000,
          costUsd: 4.3,
        },
        'mistral-small': {
          requests: 550,
          inputTokens: 248000,
          outputTokens: 124000,
          costUsd: 2.1,
        },
        'cohere-command': {
          requests: 270,
          inputTokens: 115000,
          outputTokens: 58000,
          costUsd: 5.2,
        },
        'cohere-embed': {
          requests: 205,
          inputTokens: 88000,
          outputTokens: 0,
          costUsd: 3.6,
        },
        'dall-e-3': {
          requests: 63,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 17.5,
        },
        'dall-e-2': {
          requests: 115,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 8.8,
        },
        'whisper-large': {
          requests: 103,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 5.4,
        },
        't5-xxl': {
          requests: 300,
          inputTokens: 125000,
          outputTokens: 62000,
          costUsd: 3.0,
        },
        'bert-large': {
          requests: 370,
          inputTokens: 145000,
          outputTokens: 0,
          costUsd: 2.1,
        },
      },
      totalCostUsd: 118.0,
    },
    // September
    {
      period: '2026-09',
      label: '9',
      models: {
        'text-embedding-ada-002': {
          requests: 135,
          inputTokens: 58000,
          outputTokens: 0,
          costUsd: 5.3,
        },
        'gpt-5-mini': {
          requests: 370,
          inputTokens: 155000,
          outputTokens: 78000,
          costUsd: 2.5,
        },
        'gpt-4o-mini': {
          requests: 370,
          inputTokens: 145000,
          outputTokens: 72000,
          costUsd: 3.2,
        },
        'claude-3-haiku': {
          requests: 215,
          inputTokens: 88000,
          outputTokens: 44000,
          costUsd: 4.4,
        },
        'claude-3-sonnet': {
          requests: 158,
          inputTokens: 74000,
          outputTokens: 37000,
          costUsd: 7.0,
        },
        'claude-3-opus': {
          requests: 84,
          inputTokens: 42000,
          outputTokens: 21000,
          costUsd: 12.8,
        },
        'gemini-pro': {
          requests: 315,
          inputTokens: 128000,
          outputTokens: 64000,
          costUsd: 3.2,
        },
        'gemini-ultra': {
          requests: 64,
          inputTokens: 32000,
          outputTokens: 16000,
          costUsd: 10.0,
        },
        'llama-3-70b': {
          requests: 188,
          inputTokens: 94000,
          outputTokens: 47000,
          costUsd: 7.4,
        },
        'llama-3-8b': {
          requests: 430,
          inputTokens: 208000,
          outputTokens: 104000,
          costUsd: 2.1,
        },
        'mistral-large': {
          requests: 148,
          inputTokens: 64000,
          outputTokens: 32000,
          costUsd: 5.8,
        },
        'mistral-medium': {
          requests: 360,
          inputTokens: 168000,
          outputTokens: 84000,
          costUsd: 3.9,
        },
        'mistral-small': {
          requests: 515,
          inputTokens: 228000,
          outputTokens: 114000,
          costUsd: 1.9,
        },
        'cohere-command': {
          requests: 228,
          inputTokens: 104000,
          outputTokens: 52000,
          costUsd: 4.7,
        },
        'cohere-embed': {
          requests: 188,
          inputTokens: 79000,
          outputTokens: 0,
          costUsd: 3.3,
        },
        'dall-e-3': {
          requests: 54,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 15.5,
        },
        'dall-e-2': {
          requests: 104,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 7.8,
        },
        'whisper-large': {
          requests: 94,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 5.0,
        },
        't5-xxl': {
          requests: 260,
          inputTokens: 114000,
          outputTokens: 57000,
          costUsd: 2.6,
        },
        'bert-large': {
          requests: 330,
          inputTokens: 134000,
          outputTokens: 0,
          costUsd: 1.8,
        },
      },
      totalCostUsd: 110.5,
    },
    // October
    {
      period: '2026-10',
      label: '10',
      models: {
        'text-embedding-ada-002': {
          requests: 35,
          inputTokens: 15000,
          outputTokens: 0,
          costUsd: 1.1,
        },
        'gpt-5-mini': {
          requests: 840,
          inputTokens: 330000,
          outputTokens: 165000,
          costUsd: 8.9,
        },
        'gpt-4o-mini': {
          requests: 115,
          inputTokens: 49000,
          outputTokens: 24500,
          costUsd: 1.0,
        },
        'claude-3-haiku': {
          requests: 305,
          inputTokens: 122000,
          outputTokens: 61000,
          costUsd: 6.1,
        },
        'claude-3-sonnet': {
          requests: 205,
          inputTokens: 92000,
          outputTokens: 46000,
          costUsd: 8.6,
        },
        'claude-3-opus': {
          requests: 103,
          inputTokens: 51000,
          outputTokens: 25500,
          costUsd: 14.6,
        },
        'gemini-pro': {
          requests: 415,
          inputTokens: 165000,
          outputTokens: 82000,
          costUsd: 4.1,
        },
        'gemini-ultra': {
          requests: 83,
          inputTokens: 41000,
          outputTokens: 20500,
          costUsd: 11.6,
        },
        'llama-3-70b': {
          requests: 225,
          inputTokens: 106000,
          outputTokens: 53000,
          costUsd: 8.3,
        },
        'llama-3-8b': {
          requests: 485,
          inputTokens: 222000,
          outputTokens: 111000,
          costUsd: 2.3,
        },
        'mistral-large': {
          requests: 175,
          inputTokens: 74000,
          outputTokens: 37000,
          costUsd: 6.4,
        },
        'mistral-medium': {
          requests: 405,
          inputTokens: 188000,
          outputTokens: 94000,
          costUsd: 4.2,
        },
        'mistral-small': {
          requests: 545,
          inputTokens: 245000,
          outputTokens: 122000,
          costUsd: 2.1,
        },
        'cohere-command': {
          requests: 265,
          inputTokens: 112000,
          outputTokens: 56000,
          costUsd: 5.1,
        },
        'cohere-embed': {
          requests: 203,
          inputTokens: 86000,
          outputTokens: 0,
          costUsd: 3.5,
        },
        'dall-e-3': {
          requests: 61,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 17.2,
        },
        'dall-e-2': {
          requests: 112,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 8.6,
        },
        'whisper-large': {
          requests: 101,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 5.3,
        },
        't5-xxl': {
          requests: 295,
          inputTokens: 122000,
          outputTokens: 61000,
          costUsd: 2.9,
        },
        'bert-large': {
          requests: 365,
          inputTokens: 142000,
          outputTokens: 0,
          costUsd: 2.0,
        },
      },
      totalCostUsd: 116.8,
    },
    // November
    {
      period: '2026-11',
      label: '11',
      models: {
        'text-embedding-ada-002': {
          requests: 155,
          inputTokens: 62000,
          outputTokens: 0,
          costUsd: 6.3,
        },
        'gpt-5-mini': {
          requests: 290,
          inputTokens: 125000,
          outputTokens: 62000,
          costUsd: 1.6,
        },
        'gpt-4o-mini': {
          requests: 440,
          inputTokens: 195000,
          outputTokens: 98000,
          costUsd: 4.6,
        },
        'claude-3-haiku': {
          requests: 195,
          inputTokens: 80000,
          outputTokens: 40000,
          costUsd: 4.1,
        },
        'claude-3-sonnet': {
          requests: 145,
          inputTokens: 70000,
          outputTokens: 35000,
          costUsd: 6.6,
        },
        'claude-3-opus': {
          requests: 78,
          inputTokens: 39000,
          outputTokens: 19500,
          costUsd: 12.2,
        },
        'gemini-pro': {
          requests: 295,
          inputTokens: 120000,
          outputTokens: 60000,
          costUsd: 3.0,
        },
        'gemini-ultra': {
          requests: 60,
          inputTokens: 30000,
          outputTokens: 15000,
          costUsd: 9.6,
        },
        'llama-3-70b': {
          requests: 172,
          inputTokens: 90000,
          outputTokens: 45000,
          costUsd: 6.8,
        },
        'llama-3-8b': {
          requests: 415,
          inputTokens: 198000,
          outputTokens: 99000,
          costUsd: 2.0,
        },
        'mistral-large': {
          requests: 136,
          inputTokens: 60000,
          outputTokens: 30000,
          costUsd: 5.5,
        },
        'mistral-medium': {
          requests: 345,
          inputTokens: 160000,
          outputTokens: 80000,
          costUsd: 3.7,
        },
        'mistral-small': {
          requests: 495,
          inputTokens: 218000,
          outputTokens: 109000,
          costUsd: 1.9,
        },
        'cohere-command': {
          requests: 215,
          inputTokens: 100000,
          outputTokens: 50000,
          costUsd: 4.4,
        },
        'cohere-embed': {
          requests: 176,
          inputTokens: 74000,
          outputTokens: 0,
          costUsd: 3.1,
        },
        'dall-e-3': {
          requests: 50,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 14.8,
        },
        'dall-e-2': {
          requests: 98,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 7.4,
        },
        'whisper-large': {
          requests: 90,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 4.7,
        },
        't5-xxl': {
          requests: 245,
          inputTokens: 110000,
          outputTokens: 55000,
          costUsd: 2.5,
        },
        'bert-large': {
          requests: 315,
          inputTokens: 130000,
          outputTokens: 0,
          costUsd: 1.8,
        },
      },
      totalCostUsd: 107.5,
    },
    // December
    {
      period: '2026-12',
      label: '12',
      models: {
        'text-embedding-ada-002': {
          requests: 75,
          inputTokens: 29000,
          outputTokens: 0,
          costUsd: 2.4,
        },
        'gpt-5-mini': {
          requests: 660,
          inputTokens: 260000,
          outputTokens: 125000,
          costUsd: 5.4,
        },
        'gpt-4o-mini': {
          requests: 340,
          inputTokens: 138000,
          outputTokens: 69000,
          costUsd: 3.2,
        },
        'claude-3-haiku': {
          requests: 255,
          inputTokens: 102000,
          outputTokens: 51000,
          costUsd: 5.1,
        },
        'claude-3-sonnet': {
          requests: 172,
          inputTokens: 81000,
          outputTokens: 40000,
          costUsd: 7.5,
        },
        'claude-3-opus': {
          requests: 90,
          inputTokens: 45000,
          outputTokens: 22000,
          costUsd: 13.2,
        },
        'gemini-pro': {
          requests: 355,
          inputTokens: 142000,
          outputTokens: 71000,
          costUsd: 3.5,
        },
        'gemini-ultra': {
          requests: 71,
          inputTokens: 35500,
          outputTokens: 17800,
          costUsd: 10.4,
        },
        'llama-3-70b': {
          requests: 202,
          inputTokens: 96000,
          outputTokens: 48000,
          costUsd: 7.8,
        },
        'llama-3-8b': {
          requests: 452,
          inputTokens: 212000,
          outputTokens: 106000,
          costUsd: 2.2,
        },
        'mistral-large': {
          requests: 155,
          inputTokens: 68000,
          outputTokens: 34000,
          costUsd: 6.0,
        },
        'mistral-medium': {
          requests: 382,
          inputTokens: 175000,
          outputTokens: 88000,
          costUsd: 4.0,
        },
        'mistral-small': {
          requests: 522,
          inputTokens: 235000,
          outputTokens: 118000,
          costUsd: 2.0,
        },
        'cohere-command': {
          requests: 242,
          inputTokens: 108000,
          outputTokens: 54000,
          costUsd: 4.8,
        },
        'cohere-embed': {
          requests: 192,
          inputTokens: 80000,
          outputTokens: 0,
          costUsd: 3.4,
        },
        'dall-e-3': {
          requests: 56,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 16.0,
        },
        'dall-e-2': {
          requests: 106,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 8.0,
        },
        'whisper-large': {
          requests: 96,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: 5.0,
        },
        't5-xxl': {
          requests: 272,
          inputTokens: 116000,
          outputTokens: 58000,
          costUsd: 2.7,
        },
        'bert-large': {
          requests: 342,
          inputTokens: 136000,
          outputTokens: 0,
          costUsd: 1.9,
        },
      },
      totalCostUsd: 110.2,
    },
  ],
  modelTotals: {
    'text-embedding-ada-002': { costUsd: 365.32, requests: 1200 },
    'gpt-5-mini': { costUsd: 526.32, requests: 6500 },
    'gpt-4o-mini': { costUsd: 533.84, requests: 3800 },
    'claude-3-haiku': { costUsd: 425.6, requests: 2850 },
    'claude-3-sonnet': { costUsd: 600.2, requests: 1950 },
    'claude-3-opus': { costUsd: 950.8, requests: 1050 },
    'gemini-pro': { costUsd: 320.5, requests: 4100 },
    'gemini-ultra': { costUsd: 780.4, requests: 820 },
    'llama-3-70b': { costUsd: 550.3, requests: 2350 },
    'llama-3-8b': { costUsd: 180.5, requests: 5200 },
    'mistral-large': { costUsd: 480.6, requests: 1850 },
    'mistral-medium': { costUsd: 380.2, requests: 4350 },
    'mistral-small': { costUsd: 160.8, requests: 6100 },
    'cohere-command': { costUsd: 410.5, requests: 2850 },
    'cohere-embed': { costUsd: 290.3, requests: 2250 },
    'dall-e-3': { costUsd: 1200.5, requests: 650 },
    'dall-e-2': { costUsd: 650.2, requests: 1250 },
    'whisper-large': { costUsd: 420.8, requests: 1100 },
    't5-xxl': { costUsd: 220.4, requests: 3150 },
    'bert-large': { costUsd: 150.6, requests: 3950 },
  },
};

export const dummyMonthlyOverviewData = {
  groupBy: 'day',
  from: '2026-07-01',
  to: '2026-07-31',
  totalSpend: 658.32,
  todaySpend: 236.0,
  chartData: Array.from({ length: 31 }, (_, i) => {
    const dayNum = i + 1;
    const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
    const period = `2026-07-${formattedDay}`;

    const r1 = (Math.sin(dayNum * 1.5) + 1) / 2;
    const r2 = (Math.sin(dayNum * 2.3 + 1) + 1) / 2;
    const r3 = (Math.sin(dayNum * 3.1 + 2) + 1) / 2;
    const r4 = (Math.sin(dayNum * 1.7 + 0.5) + 1) / 2;
    const r5 = (Math.sin(dayNum * 2.5 + 1.5) + 1) / 2;
    const r6 = (Math.sin(dayNum * 3.5 + 0.2) + 1) / 2;
    const r7 = (Math.sin(dayNum * 1.2 + 2.5) + 1) / 2;
    const r8 = (Math.sin(dayNum * 2.8 + 3.0) + 1) / 2;
    const r9 = (Math.sin(dayNum * 3.2 + 1.8) + 1) / 2;
    const r10 = (Math.sin(dayNum * 1.8 + 0.8) + 1) / 2;
    const r11 = (Math.sin(dayNum * 2.1 + 2.2) + 1) / 2;
    const r12 = (Math.sin(dayNum * 3.8 + 1.2) + 1) / 2;
    const r13 = (Math.sin(dayNum * 1.4 + 3.5) + 1) / 2;
    const r14 = (Math.sin(dayNum * 2.6 + 0.3) + 1) / 2;
    const r15 = (Math.sin(dayNum * 3.3 + 2.8) + 1) / 2;
    const r16 = (Math.sin(dayNum * 1.9 + 1.1) + 1) / 2;
    const r17 = (Math.sin(dayNum * 2.9 + 0.7) + 1) / 2;
    const r18 = (Math.sin(dayNum * 3.6 + 2.1) + 1) / 2;
    const r19 = (Math.sin(dayNum * 1.6 + 3.2) + 1) / 2;
    const r20 = (Math.sin(dayNum * 2.4 + 1.4) + 1) / 2;

    return {
      period,
      label: `${dayNum}`,
      models: {
        'text-embedding-ada-002': {
          requests: 12 + dayNum,
          inputTokens: 1200,
          outputTokens: 0,
          costUsd: Number((1.5 + r1 * 4.5).toFixed(2)),
        },
        'gpt-5-mini': {
          requests: 24 + dayNum * 2,
          inputTokens: 5400,
          outputTokens: 2800,
          costUsd: Number((2.0 + r2 * 5.2).toFixed(2)),
        },
        'gpt-4o-mini': {
          requests: 18 + dayNum,
          inputTokens: 4100,
          outputTokens: 1900,
          costUsd: Number((2.2 + r3 * 4.8).toFixed(2)),
        },
        'claude-3-haiku': {
          requests: 15 + dayNum,
          inputTokens: 3000,
          outputTokens: 1500,
          costUsd: Number((1.8 + r4 * 4.2).toFixed(2)),
        },
        'claude-3-sonnet': {
          requests: 10 + dayNum,
          inputTokens: 2500,
          outputTokens: 1200,
          costUsd: Number((2.5 + r5 * 5.5).toFixed(2)),
        },
        'claude-3-opus': {
          requests: 8 + dayNum,
          inputTokens: 2000,
          outputTokens: 1000,
          costUsd: Number((3.0 + r6 * 6.0).toFixed(2)),
        },
        'gemini-pro': {
          requests: 20 + dayNum,
          inputTokens: 3500,
          outputTokens: 1700,
          costUsd: Number((1.5 + r7 * 3.8).toFixed(2)),
        },
        'gemini-ultra': {
          requests: 6 + dayNum,
          inputTokens: 1800,
          outputTokens: 900,
          costUsd: Number((2.8 + r8 * 5.8).toFixed(2)),
        },
        'llama-3-70b': {
          requests: 14 + dayNum,
          inputTokens: 2800,
          outputTokens: 1400,
          costUsd: Number((2.3 + r9 * 4.8).toFixed(2)),
        },
        'llama-3-8b': {
          requests: 22 + dayNum,
          inputTokens: 3800,
          outputTokens: 1900,
          costUsd: Number((1.2 + r10 * 3.5).toFixed(2)),
        },
        'mistral-large': {
          requests: 12 + dayNum,
          inputTokens: 2600,
          outputTokens: 1300,
          costUsd: Number((2.0 + r11 * 4.5).toFixed(2)),
        },
        'mistral-medium': {
          requests: 18 + dayNum,
          inputTokens: 3200,
          outputTokens: 1600,
          costUsd: Number((1.7 + r12 * 4.0).toFixed(2)),
        },
        'mistral-small': {
          requests: 25 + dayNum,
          inputTokens: 4000,
          outputTokens: 2000,
          costUsd: Number((1.0 + r13 * 3.2).toFixed(2)),
        },
        'cohere-command': {
          requests: 16 + dayNum,
          inputTokens: 2900,
          outputTokens: 1450,
          costUsd: Number((1.9 + r14 * 4.3).toFixed(2)),
        },
        'cohere-embed': {
          requests: 14 + dayNum,
          inputTokens: 2200,
          outputTokens: 0,
          costUsd: Number((1.4 + r15 * 3.6).toFixed(2)),
        },
        'dall-e-3': {
          requests: 5 + dayNum,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: Number((4.0 + r16 * 8.0).toFixed(2)),
        },
        'dall-e-2': {
          requests: 8 + dayNum,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: Number((2.5 + r17 * 5.0).toFixed(2)),
        },
        'whisper-large': {
          requests: 7 + dayNum,
          inputTokens: 0,
          outputTokens: 0,
          costUsd: Number((1.8 + r18 * 4.0).toFixed(2)),
        },
        't5-xxl': {
          requests: 20 + dayNum,
          inputTokens: 3400,
          outputTokens: 1700,
          costUsd: Number((1.2 + r19 * 3.8).toFixed(2)),
        },
        'bert-large': {
          requests: 24 + dayNum,
          inputTokens: 3600,
          outputTokens: 0,
          costUsd: Number((0.8 + r20 * 3.0).toFixed(2)),
        },
      },
      totalCostUsd: Number(
        Array.from({ length: 20 }, (_, idx) => {
          const r = (Math.sin(dayNum * (1.5 + idx * 0.3) + idx * 0.5) + 1) / 2;
          return 1.0 + r * 5.0;
        })
          .reduce((a, b) => a + b, 0)
          .toFixed(2),
      ),
    };
  }),
  modelTotals: {
    'text-embedding-ada-002': { costUsd: 365.32, requests: 450 },
    'gpt-5-mini': { costUsd: 526.32, requests: 1200 },
    'gpt-4o-mini': { costUsd: 533.84, requests: 890 },
    'claude-3-haiku': { costUsd: 325.6, requests: 780 },
    'claude-3-sonnet': { costUsd: 450.2, requests: 520 },
    'claude-3-opus': { costUsd: 680.8, requests: 310 },
    'gemini-pro': { costUsd: 280.5, requests: 950 },
    'gemini-ultra': { costUsd: 520.4, requests: 260 },
    'llama-3-70b': { costUsd: 380.3, requests: 600 },
    'llama-3-8b': { costUsd: 160.5, requests: 1100 },
    'mistral-large': { costUsd: 340.6, requests: 520 },
    'mistral-medium': { costUsd: 280.2, requests: 850 },
    'mistral-small': { costUsd: 140.8, requests: 1300 },
    'cohere-command': { costUsd: 300.5, requests: 720 },
    'cohere-embed': { costUsd: 220.3, requests: 600 },
    'dall-e-3': { costUsd: 850.5, requests: 180 },
    'dall-e-2': { costUsd: 480.2, requests: 350 },
    'whisper-large': { costUsd: 320.8, requests: 290 },
    't5-xxl': { costUsd: 190.4, requests: 780 },
    'bert-large': { costUsd: 130.6, requests: 920 },
  },
};

// // 12 Months All-Year Overview Data with 4 Models (Testing Dynamic Model Graph & Legend)
// export const dummyYearlyOverviewData = {
//   groupBy: 'month',
//   from: '2026-01-01',
//   to: '2026-12-31',
//   totalSpend: 1425.48,
//   todaySpend: 236.0,
//   chartData: [
//     {
//       period: '2026-01',
//       label: '1',
//       models: {
//         'text-embedding-ada-002': {
//           requests: 120,
//           inputTokens: 50000,
//           outputTokens: 0,
//           costUsd: 5.2,
//         },
//         'gpt-5-mini': {
//           requests: 450,
//           inputTokens: 180000,
//           outputTokens: 90000,
//           costUsd: 2.8,
//         },
//         'gpt-4o-mini': {
//           requests: 380,
//           inputTokens: 150000,
//           outputTokens: 85000,
//           costUsd: 3.5,
//         },
//         'gpt-4o': {
//           requests: 90,
//           inputTokens: 40000,
//           outputTokens: 20000,
//           costUsd: 2.5,
//         },
//       },
//       totalCostUsd: 14.0,
//     },
//     {
//       period: '2026-02',
//       label: '2',
//       models: {
//         'text-embedding-ada-002': {
//           requests: 150,
//           inputTokens: 60000,
//           outputTokens: 0,
//           costUsd: 6.3,
//         },
//         'gpt-5-mini': {
//           requests: 300,
//           inputTokens: 140000,
//           outputTokens: 70000,
//           costUsd: 1.6,
//         },
//         'gpt-4o-mini': {
//           requests: 420,
//           inputTokens: 190000,
//           outputTokens: 95000,
//           costUsd: 4.6,
//         },
//         'gpt-4o': {
//           requests: 110,
//           inputTokens: 50000,
//           outputTokens: 25000,
//           costUsd: 3.1,
//         },
//       },
//       totalCostUsd: 15.6,
//     },
//     {
//       period: '2026-03',
//       label: '3',
//       models: {
//         'text-embedding-ada-002': {
//           requests: 80,
//           inputTokens: 30000,
//           outputTokens: 0,
//           costUsd: 2.4,
//         },
//         'gpt-5-mini': {
//           requests: 620,
//           inputTokens: 250000,
//           outputTokens: 120000,
//           costUsd: 5.4,
//         },
//         'gpt-4o-mini': {
//           requests: 310,
//           inputTokens: 130000,
//           outputTokens: 65000,
//           costUsd: 3.2,
//         },
//         'gpt-4o': {
//           requests: 85,
//           inputTokens: 35000,
//           outputTokens: 18000,
//           costUsd: 2.2,
//         },
//       },
//       totalCostUsd: 13.2,
//     },
//     {
//       period: '2026-04',
//       label: '4',
//       models: {
//         'text-embedding-ada-002': {
//           requests: 40,
//           inputTokens: 20000,
//           outputTokens: 0,
//           costUsd: 1.1,
//         },
//         'gpt-5-mini': {
//           requests: 810,
//           inputTokens: 320000,
//           outputTokens: 160000,
//           costUsd: 8.8,
//         },
//         'gpt-4o-mini': {
//           requests: 120,
//           inputTokens: 50000,
//           outputTokens: 25000,
//           costUsd: 1.1,
//         },
//         'gpt-4o': {
//           requests: 60,
//           inputTokens: 25000,
//           outputTokens: 12000,
//           costUsd: 1.8,
//         },
//       },
//       totalCostUsd: 12.8,
//     },
//     {
//       period: '2026-05',
//       label: '5',
//       models: {
//         'text-embedding-ada-002': {
//           requests: 130,
//           inputTokens: 55000,
//           outputTokens: 0,
//           costUsd: 5.3,
//         },
//         'gpt-5-mini': {
//           requests: 390,
//           inputTokens: 160000,
//           outputTokens: 80000,
//           costUsd: 2.5,
//         },
//         'gpt-4o-mini': {
//           requests: 360,
//           inputTokens: 140000,
//           outputTokens: 70000,
//           costUsd: 3.2,
//         },
//         'gpt-4o': {
//           requests: 100,
//           inputTokens: 42000,
//           outputTokens: 21000,
//           costUsd: 2.8,
//         },
//       },
//       totalCostUsd: 13.8,
//     },
//     {
//       period: '2026-06',
//       label: '6',
//       models: {
//         'text-embedding-ada-002': {
//           requests: 70,
//           inputTokens: 28000,
//           outputTokens: 0,
//           costUsd: 2.4,
//         },
//         'gpt-5-mini': {
//           requests: 680,
//           inputTokens: 270000,
//           outputTokens: 130000,
//           costUsd: 5.4,
//         },
//         'gpt-4o-mini': {
//           requests: 330,
//           inputTokens: 135000,
//           outputTokens: 68000,
//           costUsd: 3.2,
//         },
//         'gpt-4o': {
//           requests: 95,
//           inputTokens: 38000,
//           outputTokens: 19000,
//           costUsd: 2.6,
//         },
//       },
//       totalCostUsd: 13.6,
//     },
//     {
//       period: '2026-07',
//       label: '7',
//       models: {
//         'text-embedding-ada-002': {
//           requests: 160,
//           inputTokens: 65000,
//           outputTokens: 0,
//           costUsd: 6.3,
//         },
//         'gpt-5-mini': {
//           requests: 280,
//           inputTokens: 120000,
//           outputTokens: 60000,
//           costUsd: 1.6,
//         },
//         'gpt-4o-mini': {
//           requests: 450,
//           inputTokens: 200000,
//           outputTokens: 100000,
//           costUsd: 4.6,
//         },
//         'gpt-4o': {
//           requests: 125,
//           inputTokens: 55000,
//           outputTokens: 28000,
//           costUsd: 3.5,
//         },
//       },
//       totalCostUsd: 16.0,
//     },
//     {
//       period: '2026-08',
//       label: '8',
//       models: {
//         'text-embedding-ada-002': {
//           requests: 40,
//           inputTokens: 18000,
//           outputTokens: 0,
//           costUsd: 1.1,
//         },
//         'gpt-5-mini': {
//           requests: 850,
//           inputTokens: 340000,
//           outputTokens: 170000,
//           costUsd: 8.9,
//         },
//         'gpt-4o-mini': {
//           requests: 110,
//           inputTokens: 48000,
//           outputTokens: 24000,
//           costUsd: 1.0,
//         },
//         'gpt-4o': {
//           requests: 70,
//           inputTokens: 30000,
//           outputTokens: 15000,
//           costUsd: 2.1,
//         },
//       },
//       totalCostUsd: 13.1,
//     },
//     {
//       period: '2026-09',
//       label: '9',
//       models: {
//         'text-embedding-ada-002': {
//           requests: 135,
//           inputTokens: 58000,
//           outputTokens: 0,
//           costUsd: 5.3,
//         },
//         'gpt-5-mini': {
//           requests: 370,
//           inputTokens: 155000,
//           outputTokens: 78000,
//           costUsd: 2.5,
//         },
//         'gpt-4o-mini': {
//           requests: 370,
//           inputTokens: 145000,
//           outputTokens: 72000,
//           costUsd: 3.2,
//         },
//         'gpt-4o': {
//           requests: 105,
//           inputTokens: 44000,
//           outputTokens: 22000,
//           costUsd: 2.9,
//         },
//       },
//       totalCostUsd: 13.9,
//     },
//     {
//       period: '2026-10',
//       label: '10',
//       models: {
//         'text-embedding-ada-002': {
//           requests: 35,
//           inputTokens: 15000,
//           outputTokens: 0,
//           costUsd: 1.1,
//         },
//         'gpt-5-mini': {
//           requests: 840,
//           inputTokens: 330000,
//           outputTokens: 165000,
//           costUsd: 8.9,
//         },
//         'gpt-4o-mini': {
//           requests: 115,
//           inputTokens: 49000,
//           outputTokens: 24500,
//           costUsd: 1.0,
//         },
//         'gpt-4o': {
//           requests: 75,
//           inputTokens: 32000,
//           outputTokens: 16000,
//           costUsd: 2.2,
//         },
//       },
//       totalCostUsd: 13.2,
//     },
//     {
//       period: '2026-11',
//       label: '11',
//       models: {
//         'text-embedding-ada-002': {
//           requests: 155,
//           inputTokens: 62000,
//           outputTokens: 0,
//           costUsd: 6.3,
//         },
//         'gpt-5-mini': {
//           requests: 290,
//           inputTokens: 125000,
//           outputTokens: 62000,
//           costUsd: 1.6,
//         },
//         'gpt-4o-mini': {
//           requests: 440,
//           inputTokens: 195000,
//           outputTokens: 98000,
//           costUsd: 4.6,
//         },
//         'gpt-4o': {
//           requests: 120,
//           inputTokens: 52000,
//           outputTokens: 26000,
//           costUsd: 3.3,
//         },
//       },
//       totalCostUsd: 15.8,
//     },
//     {
//       period: '2026-12',
//       label: '12',
//       models: {
//         'text-embedding-ada-002': {
//           requests: 75,
//           inputTokens: 29000,
//           outputTokens: 0,
//           costUsd: 2.4,
//         },
//         'gpt-5-mini': {
//           requests: 660,
//           inputTokens: 260000,
//           outputTokens: 125000,
//           costUsd: 5.4,
//         },
//         'gpt-4o-mini': {
//           requests: 340,
//           inputTokens: 138000,
//           outputTokens: 69000,
//           costUsd: 3.2,
//         },
//         'gpt-4o': {
//           requests: 90,
//           inputTokens: 39000,
//           outputTokens: 19500,
//           costUsd: 2.5,
//         },
//       },
//       totalCostUsd: 13.5,
//     },
//   ],
//   modelTotals: {
//     'text-embedding-ada-002': { costUsd: 365.32, requests: 1200 },
//     'gpt-5-mini': { costUsd: 526.32, requests: 6500 },
//     'gpt-4o-mini': { costUsd: 533.84, requests: 3800 },
//     'gpt-4o': { costUsd: 310.5, requests: 1150 },
//   },
// };

// // 31-Day Specific Month Overview Data
// export const dummyMonthlyOverviewData = {
//   groupBy: 'day',
//   from: '2026-07-01',
//   to: '2026-07-31',
//   totalSpend: 658.32,
//   todaySpend: 236.0,
//   chartData: Array.from({ length: 31 }, (_, i) => {
//     const dayNum = i + 1;
//     const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
//     const period = `2026-07-${formattedDay}`;

//     const r1 = (Math.sin(dayNum * 1.5) + 1) / 2;
//     const r2 = (Math.sin(dayNum * 2.3 + 1) + 1) / 2;
//     const r3 = (Math.sin(dayNum * 3.1 + 2) + 1) / 2;
//     const r4 = (Math.sin(dayNum * 4.2 + 3) + 1) / 2;

//     const adaVal = Number((1.5 + r1 * 4.5).toFixed(2));
//     const gpt5Val = Number((2.0 + r2 * 5.2).toFixed(2));
//     const gpt4oVal = Number((2.2 + r3 * 4.8).toFixed(2));
//     const gpt4Val = Number((1.0 + r4 * 3.5).toFixed(2));
//     const totalVal = Number((adaVal + gpt5Val + gpt4oVal + gpt4Val).toFixed(2));

//     return {
//       period,
//       label: `${dayNum}`,
//       models: {
//         'text-embedding-ada-002': {
//           requests: 12 + dayNum,
//           inputTokens: 1200,
//           outputTokens: 0,
//           costUsd: adaVal,
//         },
//         'gpt-5-mini': {
//           requests: 24 + dayNum * 2,
//           inputTokens: 5400,
//           outputTokens: 2800,
//           costUsd: gpt5Val,
//         },
//         'gpt-4o-mini': {
//           requests: 18 + dayNum,
//           inputTokens: 4100,
//           outputTokens: 1900,
//           costUsd: gpt4oVal,
//         },
//         'gpt-4o': {
//           requests: 8 + dayNum,
//           inputTokens: 2100,
//           outputTokens: 1100,
//           costUsd: gpt4Val,
//         },
//       },
//       totalCostUsd: totalVal,
//     };
//   }),
//   modelTotals: {
//     'text-embedding-ada-002': { costUsd: 365.32, requests: 450 },
//     'gpt-5-mini': { costUsd: 526.32, requests: 1200 },
//     'gpt-4o-mini': { costUsd: 533.84, requests: 890 },
//     'gpt-4o': { costUsd: 210.5, requests: 310 },
//   },
// };

// 50 Details Table Items for rich pagination testing
export const dummyAllDetailsDataList = Array.from({ length: 50 }, (_, i) => {
  const idx = i + 1;
  const day = 31 - (i % 30);
  const formattedDay = day < 10 ? `0${day}` : `${day}`;
  const month = '07';
  const year = '2026';
  const dateStr = `${formattedDay}/${month}/${year}`;
  const isoStr = `${year}-${month}-${formattedDay}`;

  const modelsList =
    idx % 4 === 0
      ? [
          'text-embedding-ada-002',
          'gpt-5-mini',
          'gpt-4o-mini',
          'gpt-4o',
          'claude-3-haiku',
          'claude-3-sonnet',
          'claude-3-opus',
        ]
      : idx % 3 === 0
      ? ['text-embedding-ada-002', 'gpt-5-mini', 'gpt-4o-mini']
      : idx % 2 === 0
      ? ['gpt-5-mini', 'gpt-4o-mini']
      : ['gpt-5-mini'];

  const requestCount = Math.floor(500 + Math.sin(idx * 7) * 400 + idx * 50);
  const inputTokens = Math.floor(
    100000 + Math.cos(idx * 3) * 80000 + idx * 5000,
  );
  const outputTokens = Math.floor(
    50000 + Math.sin(idx * 5) * 40000 + idx * 2500,
  );

  return {
    index: idx,
    date: dateStr,
    isoDate: isoStr,
    models: modelsList,
    requestCount,
    inputTokens,
    outputTokens,
  };
});

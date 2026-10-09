import { Logger } from '@nestjs/common';
import { Collection, ObjectId, SortDirection } from 'mongodb';
import {
  CursorPaginatedResponse,
  LimitOffsetPaginatedReponse,
} from './@types/nest.types';
import * as crypto from 'node:crypto';
import * as path from 'path';
import { promises as fs } from 'fs';
import { HttpException } from '@nestjs/common';

export async function getCursorPaginatedResponse<T = any>(
  collection: Collection<any>,
  filter: Record<string, any>,
  projection: Record<string, any>,
  sortField: string,
  sortType: SortDirection,
  pageSize: number,
  before?: string,
  after?: string,
): Promise<CursorPaginatedResponse<T>> {
  let results;
  let next: ObjectId;
  let prev: ObjectId;
  const itemsPerPage = pageSize + 1;
  const sort = {
    [sortField]: sortType,
  };

  if (before) {
    if (sortType === 1) {
      results = await collection
        .find(
          { ...filter, _id: { $lt: new ObjectId(before) } },
          { projection, limit: itemsPerPage, sort },
        )
        .toArray();
    } else {
      results = await collection
        .find(
          { ...filter, _id: { $gt: new ObjectId(before) } },
          { projection, limit: itemsPerPage, sort },
        )
        .toArray();
    }
    if (results.length === itemsPerPage) {
      prev = results[1]._id;
      results = results.slice(1);
    }
    next = results[results.length - 1]._id;
  }

  if (after) {
    if (sortType === 1) {
      results = await collection
        .find(
          { ...filter, _id: { $gt: new ObjectId(after) } },
          { projection, limit: itemsPerPage, sort },
        )
        .toArray();
    } else {
      results = await collection
        .find(
          { ...filter, _id: { $lt: new ObjectId(after) } },
          { projection, limit: itemsPerPage, sort },
        )
        .toArray();
    }
    if (results.length === itemsPerPage) {
      next = results[results.length - 2]._id;
      results = results.slice(0, -1);
    }
    prev = results[0]._id;
  }

  if (!before && !after) {
    results = await collection
      .find({ ...filter }, { projection, limit: itemsPerPage, sort })
      .toArray();
    if (results.length === itemsPerPage) {
      next = results[results.length - 2]._id;
      results = results.slice(0, -1);
    }
  }

  const count = await collection.countDocuments(filter);

  const response: CursorPaginatedResponse<T> = {
    results,
    count,
    before: prev?.toHexString(),
    after: next?.toHexString(),
  };

  return response;
}

export async function getLimitOffsetPaginatedResponse<T = any>(
  collection: Collection<any>,
  filter: Record<string, any>,
  projection: Record<string, any>,
  sortField: string,
  sortType: SortDirection,
  pageSize: number,
  page: number = 1,
  searchQuery?: string,
  searchFields: string[] = [],
): Promise<LimitOffsetPaginatedReponse<T>> {

  const sort = { [sortField]: sortType };

  // 🔥 Apply dynamic search
const finalFilter = { ...filter };

if (searchQuery?.trim() && searchFields.length) {
  const orConditions = searchFields.map(field => ({
    [field]: { $regex: searchQuery, $options: 'i' },
  }));

  finalFilter.$or = orConditions;
}

  const skip = (page - 1) * pageSize;

  const [results, count] = await Promise.all([
    collection
      .find(finalFilter, {
        projection,
        limit: pageSize,
        skip,
        sort,
      })
      .toArray(),
    collection.countDocuments(finalFilter),
  ]);

  return {
    results,
    pages: Math.ceil(count / pageSize),
    totalCount: count,
  };
}

/** *************************************************
 * RETRY FN WITH EXPONENTIAL BACKOFF
 ************************************************** */

/**
 * Wait for the given milliseconds
 * @param {number} milliseconds The given time to wait
 * @returns {Promise} A fulfilled promise after the given time has passed
 */
function waitFor(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

/**
 * Execute a promise and retry with exponential backoff
 * based on the maximum retry attempts it can perform
 * @param {Promise} promise promise to be executed
 * @param {function} onRetry callback executed on every retry
 * @param {number} maxRetries The maximum number of retries to be attempted
 * @returns {Promise} The result of the given promise passed in
 */
function retry(
  promise: () => Promise<any>,
  onRetry: () => void,
  maxRetries: number,
  initialDelay = 100,
) {
  // Notice that we declare an inner function here
  // so we can encapsulate the retries and don't expose
  // it to the caller. This is also a recursive function
  async function retryWithBackoff(retries) {
    try {
      // Make sure we don't wait on the first attempt
      if (retries > 0) {
        // Here is where the magic happens.
        // on every retry, we exponentially increase the time to wait.
        // Here is how it looks for a `maxRetries` = 4
        // (2 ** 1) * 100 = 200 ms
        // (2 ** 2) * 100 = 400 ms
        // (2 ** 3) * 100 = 800 ms
        const timeToWait = 2 ** retries * initialDelay;
        await waitFor(timeToWait);
      }
      return await promise();
    } catch (e) {
      // only retry if we didn't reach the limit
      // otherwise, let the caller handle the error
      if (retries < maxRetries) {
        onRetry?.();
        return retryWithBackoff(retries + 1);
      } else {
        Logger.warn('Max retries reached. Bubbling the error up', 'retryWithBackoff');
        throw e;
      }
    }
  }

  return retryWithBackoff(0);
}

/** *************************************************
 * ENCRYPT / DECRYPT
 ************************************************** */

// Encrypt data using the symmetric key
function encryptData(data: string, key: string) {
  const keyBuf = Buffer.from(key, 'hex') as any;
  const iv = crypto.randomBytes(16) as any; // 16 bytes for AES
  const cipher = crypto.createCipheriv('aes-256-cbc', keyBuf, iv) as any;
  const encryptedBuffer = Buffer.concat([
    cipher.update(data, 'utf8'),
    cipher.final(),
  ]);
  return {
    encryptedData: encryptedBuffer.toString('hex'),
    iv: iv.toString('hex'),
  };
}

// Decrypt data using the symmetric key and IV
function decryptData(encryptedData: string, key: string, iv: string) {
  const keyBuf = Buffer.from(key, 'hex') as any;

  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    keyBuf,
    Buffer.from(iv, 'hex') as any,
  ) as any;
  const decryptedBuffer = Buffer.concat([
    decipher.update(Buffer.from(encryptedData, 'hex')),
    decipher.final(),
  ]);
  return decryptedBuffer.toString('utf8');
}

// common function for generating results from openAi
function getPromptTemplate(ctx: any, chatbotType?: string) {
  const ctxString = JSON.stringify(ctx, null, 2);
  if (chatbotType == 'vakmangids') {
    return [
      {
        role: 'system',
        content:
          'You are a smart assistant that extracts contact details of a user like firstName, lastName, email, phone,city,postalCode,serviceType,location,category,subCategory and jobDescription from user responses. If any detail is missing, do not return a value for that key and return value for the available key ',
      },
      {
        role: 'user',
        content: ctxString, // dynamic content passed here
      },
      {
        role: 'assistant',
        content:
          'Extract the mentioned following details as an object from the above text:\n\n1. firstName \n2. lastName\n3. email\n4. phone\n5. city\n6.postalCode \n7.serviceType \n8.location \n9. category\n10.subCategory\n11.jobDescription\n\nIf any detail is not provided, leave that particular detail out.',
      },
    ];
  } else {
    return [
      {
        role: 'system',
        content:
          'You are a smart assistant that extracts contact details of a user like name, email, phone, and address from user responses. If any detail is missing, do not return a value for that key.',
      },
      {
        role: 'user',
        content: ctxString, // dynamic content passed here
      },
      {
        role: 'assistant',
        content:
          'Extract the mentioned following details as an object from the above text:\n\n- name\n- email\n- phone\n- address\n\nIf any detail is not provided, leave it out.',
      },
    ];
  }
}

async function getSlotsPrompt(userMessage, previousMessage) {
  const currentDate = new Date();
  const todayStr = currentDate.toISOString().split('T')[0];
  const dayAfterTomorrowStr = new Date(
    currentDate.getTime() + 2 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split('T')[0];

  return [
    {
      role: 'system',
      content: `You are a date extraction assistant. Your task is to extract or determine a date from any user message and ALWAYS return a date in JSON format.

                Parse dates from various formats including:
                - Specific dates (e.g. "March 14", "14th March", "2024-03-14")
                - Relative dates ("today", "tomorrow", "day after tomorrow", "next week")
                - Natural language ("next Monday", "coming Friday", "in 3 days")

                Rules for date selection:
                1. If a specific date is mentioned: Use that exact date
                2. If "today" is mentioned: Use current date (${todayStr})
                3. If "tomorrow" is mentioned: Use tomorrow's date
                4. If no clear date is provided: Default to day after tomorrow (${dayAfterTomorrowStr})
                5. If the parsed date is BEFORE today's date (${todayStr}), return:
                   {"error": "Date is in the past. Please provide a current or future date."}
                Current reference date is: ${currentDate}
                You must ALWAYS return a JSON object with a "date" field in YYYY-MM-DD format, or "error" if the date is in the past. Never return an empty string.
                Example response format: {"date": "2024-01-15"}
                Example response for past date: {"error": "Date is in the past. Please provide a current or future date."}
      `,
    },
    {
      role: 'user',
      content: userMessage,
    },
    {
      role: 'assistant',
      content: `The previous messages was: ${previousMessage}`,
    },
  ];
}

async function getCalenderDataFromStatus(userMessage: any) {
  const currentDate = new Date();
  return [
    {
      role: 'system',
      content: `You are a highly efficient assistant designed to extract structured information from user messages. Your task is to identify and output the following data whenever relevant:\n1. **Email**: Extract the user's email address.\n2. **Time**: Extract the date and time in ISO 8601 format (e.g., '2025-01-15T10:00:00Z') based on the user's message and use the current date and time: ${currentDate} as the reference.\n3. **Demo Confirmation**: Set the demo flag to true if the booking is confirmed, or false if the intent is negative or unclear.Always respond with a valid JSON object without any additional formatting or text### Notes:\n- If any data is missing or not mentioned, return an empty string for email or time and false for the demo flag.\n- Ensure accurate parsing of dates and times mentioned in natural language.`,
    },
    {
      role: 'user',
      content: userMessage,
    },
  ];
}

async function readFileAsync(filePath: any) {
  try {
    // Construct the file path
    const fullPath = path.join(process.cwd(), filePath);

    // Read the file asynchronously
    const data = await fs.readFile(fullPath, 'utf8');
    return data;
  } catch (error) {
    throw new HttpException('Error reading JSON File', error.message);
  }
}

export {
  retry as retryWithBackoff,
  encryptData,
  decryptData,
  getPromptTemplate,
  readFileAsync,
  getSlotsPrompt,
  getCalenderDataFromStatus,
};

import { CleanedHtmlData } from './readability.types';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import * as TurndownService from 'turndown';
import * as sanitizeHtml from 'sanitize-html';
import * as he from 'he';
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

turndown.addRule('pre', {
  filter: 'pre',
  replacement: (content: string, node: any) => {
    const lang = node.getAttribute('data-language') || '';
    return `\n\n\`\`\`${lang}\n${content.trim()}\n\`\`\`\n\n`;
  },
});

function getCleanedHtmlContent(html: string): CleanedHtmlData | null {
  const sanitizedHtml = sanitizeHtml(html);
  // Decode HTML entities
  const decodedHtml = he.decode(sanitizedHtml);

  let doc: any;
  try {
    doc = new JSDOM(decodedHtml);
  } catch (error) {
    console.error('Error initializing JSDOM:', error.message);
    return null;
  }
  const reader = new Readability(doc.window.document);
  // let result: any;
  const result = reader.parse();
  if (result === null) return null;
  const md = turndown.turndown(result.content);
  return {
    htmlContent: result.content,
    textContent: result.textContent,
    markdownContent: md,
  };
}

export { getCleanedHtmlContent };

import { Logger } from '@nestjs/common';
import { JSDOM } from 'jsdom';
import he from 'he';
export function extractCleanTextContent(htmlContent: string): string {
  try {
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;
    let text = document.documentElement.textContent;
    text = text.replace(/\s+/g, ' ');
    text = text.replace(/(\r\n|\n|\r)+/g, '\n');
    text = text.trim();
    text = text.replace(/"""/g, '"');
    text = text.replace(/<script[^>]*>(.|\n)*?<\/script>/g, '');
    text = text.replace(/<style[^>]*>(.|\n)*?<\/style>/g, '');
    text = text.replace(/[\u0000-\u001F\u007F]/g, ''); // Remove control characters
    text = text.replace(/<meta[^>]*>/g, '');
    text = text.replace(/<link[^>]*>/g, '');
    text = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return text;
  } catch (error) {
    Logger.warn(`HTML parsing failed, falling back to regex: ${error?.message}`, 'extractCleanTextContent');
    return htmlContent
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Remove multiple spaces
      .replace(/(\r\n|\n|\r)+/g, '\n') // Remove multiple newlines
      .trim(); // Remove leading/trailing whitespace
  }
}

export function parseAndBeautifyEmail(dataText: string) {
  // Remove MIME boundaries
  dataText = dataText.replace(/--\S+/g, '').trim();

  // Split sections by content type
  const plainTextMatch = dataText.match(
    /Content-Type: text\/plain; charset="UTF-8".*?Content-Transfer-Encoding: quoted-printable\s*(.*?)\s*(?=Content-Type:|$)/s,
  );
  const htmlTextMatch = dataText.match(
    /Content-Type: text\/html; charset="UTF-8".*?Content-Transfer-Encoding: quoted-printable\s*(.*?)\s*(?=--|$)/s,
  );

  // Decode quoted-printable content
  const decodeQuotedPrintable = (text) => {
    return he.decode(
      text
        .replace(/=\n/g, '')
        .replace(/=([A-Fa-f0-9]{2})/g, (_, hex) =>
          String.fromCharCode(parseInt(hex, 16)),
        ),
    );
  };

  const plainText = plainTextMatch
    ? decodeQuotedPrintable(plainTextMatch[1])
    : '';
  const htmlText = htmlTextMatch ? decodeQuotedPrintable(htmlTextMatch[1]) : '';

  return { plainText, htmlText };
}

export function extractFirstQuotedPrintable(dataText: string) {
  const match = dataText.match(
    /Content-Transfer-Encoding: quoted-printable\s*(.*?)\s*(?=Content-Type:|--|$)/s,
  );

  if (!match) return 'No quoted-printable content found.';

  const encodedText = match[1];
  // Decode quoted-printable content without relying on he.decode
  const decodedText = encodedText
    .replace(/=\n/g, '')
    .replace(/=([A-Fa-f0-9]{2})/g, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );

  return decodedText.trim();
}

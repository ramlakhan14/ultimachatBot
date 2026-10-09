interface RowData {
  phoneNumber?: string;
  email?: string;
  websiteUrl?: string;
  [key: string]: any;
}

// export interface ValidationResult {
//   validPhoneCount: number;
//   validEmailCount: number;
//   validWebsiteCount: number;
//   invalidPhoneCount: number;
//   invalidEmailCount: number;
//   invalidWebsiteCount: number;
//   duplicatePhoneCount: number;
//   duplicateEmailCount: number;
//   allRows: any[];
//   validRows: any[];
// }

// export function validateLeads(parsedData: RowData[]): ValidationResult {
//   const phoneRegex = /^\+\d+$/;
//   const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//   const websiteRegex =
//     /^(https?:\/\/)?([\w\-]+\.)+[\w\-]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/i;

//   const detailedRows: any[] = [];
//   const validRows: any[] = [];

//   let validPhoneCount = 0;
//   let validEmailCount = 0;
//   let validWebsiteCount = 0;

//   let invalidPhoneCount = 0;
//   let invalidEmailCount = 0;
//   let invalidWebsiteCount = 0;

//   let duplicatePhoneCount = 0;
//   let duplicateEmailCount = 0;

//   const seenPhoneNumbers = new Set<string>();
//   const seenEmails = new Set<string>();

//   parsedData.forEach((row: any, index: number) => {
//     Object.keys(row).forEach((key) => {
//       const value = row[key];
//       if (typeof value === 'string') {
//         row[key] = value
//           .trim()
//           .replace(/^"(.*)"$/, '$1')
//           .replace(/^'(.*)'$/, '$1');
//       } else {
//         row[key] = value ?? '';
//       }
//     });

//     let phone = (row.phoneNumber || '')
//       .replace(/[\s\-()]/g, '')
//       .replace(/^00/, '+');
//     // Ensure phone starts with + if not then add dfault + and merge with country code if available
//     if (phone !== '' && !phone.startsWith('+')) {
//       const countryCode = (row.countryCode || '').trim();
//       // if (countryCode !== '') {
//       const cleanedCountryCode = countryCode.replace(/[\s\-()]/g, '');
//       phone = `+${cleanedCountryCode}${phone}`;
//       // } else {
//       //   phone = `+${phone}`;
//     }

//     const email = (row.email || '').trim().toLowerCase();
//     const website = (row.websiteUrl || '').trim();

//     row.phoneNumber = phone;
//     row.email = email;
//     row.websiteUrl = website;

//     const phoneNumberDigits = phone.replace('+', '');
//     const isPhoneValid =
//       phoneRegex.test(phone) &&
//       phoneNumberDigits.length >= 9 &&
//       phoneNumberDigits.length <= 15;

//     const isWebsiteValid = website === '' || websiteRegex.test(website);

//     let isEmailInvalid = false;
//     let isEmailDuplicate = false;

//     if (email === '') {
//       isEmailInvalid = true;
//       invalidEmailCount++;
//     } else {
//       const isEmailValid = emailRegex.test(email);
//       isEmailInvalid = !isEmailValid;
//       isEmailDuplicate = seenEmails.has(email);

//       if (isEmailValid && !isEmailDuplicate) validEmailCount++;
//       else invalidEmailCount++;

//       if (isEmailDuplicate) duplicateEmailCount++;
//       else seenEmails.add(email);
//     }

//     const isPhoneDuplicate = seenPhoneNumbers.has(phone);
//     const isPhoneInvalid = !isPhoneValid;
//     const isWebsiteInvalid = !isWebsiteValid;

//     if (isPhoneInvalid) {
//       invalidPhoneCount++;
//     } else if (isPhoneDuplicate) {
//       duplicatePhoneCount++;
//     } else {
//       validPhoneCount++;
//       seenPhoneNumbers.add(phone);
//     }

//     const rowNumber = index + 2;

//     const detailedRow = {
//       ...row,
//       rowNumber,
//       isPhoneInvalid,
//       isEmailInvalid,
//       isWebsiteInvalid,
//       isPhoneDuplicate,
//       isEmailDuplicate,
//     };

//     detailedRows.push(detailedRow);

//     const isFullyValid =
//       !isPhoneInvalid &&
//       !isEmailInvalid &&
//       !isWebsiteInvalid &&
//       !isPhoneDuplicate &&
//       !isEmailDuplicate;

//     if (isFullyValid) {
//       validRows.push({
//         ...row,
//         rowNumber,
//       });
//     }
//   });

//   return {
//     validPhoneCount,
//     validEmailCount,
//     validWebsiteCount,
//     invalidPhoneCount,
//     invalidEmailCount,
//     invalidWebsiteCount,
//     duplicatePhoneCount,
//     duplicateEmailCount,
//     allRows: detailedRows,
//     validRows,
//   };
// }

export interface ValidationResult {
  validPhoneCount: number;
  validEmailCount: number;
  validWebsiteCount: number;
  invalidPhoneCount: number;
  invalidEmailCount: number;
  invalidWebsiteCount: number;
  duplicatePhoneCount: number;
  duplicateEmailCount: number;
  validBusinessNameCount: number;
  invalidBusinessNameCount: number;
  duplicateBusinessCount: number;
  allRows: any[];
  validRows: any[];
}

export function validateLeads(
  parsedData: RowData[],
  options?: { voicebotMode?: boolean; requirePhone?: boolean; requireEmail?: boolean },
): ValidationResult {
  const voicebotMode = options?.voicebotMode ?? false;
  const requirePhone = options?.requirePhone ?? true;
  const requireEmail = options?.requireEmail ?? true;

  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const websiteRegex =
    /^(https?:\/\/)?([\w\-]+\.)+[\w\-]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?$/i;

  const detailedRows: any[] = [];
  const validRows: any[] = [];

  let validPhoneCount = 0;
  let validEmailCount = 0;
  let validWebsiteCount = 0;

  let invalidPhoneCount = 0;
  let invalidEmailCount = 0;
  let invalidWebsiteCount = 0;

  let duplicatePhoneCount = 0;
  let duplicateEmailCount = 0;
  let validBusinessNameCount = 0;
  let invalidBusinessNameCount = 0;
  let duplicateBusinessCount = 0;

  const seenPhoneNumbers = new Set<string>();
  const seenEmails = new Set<string>();
  const seenBusinessNames = new Set<string>();

  parsedData.forEach((row: any, index: number) => {
    Object.keys(row).forEach((key) => {
      const value = row[key];
      if (typeof value === 'string') {
        row[key] = value
          .trim()
          .replace(/^"(.*)"$/, '$1')
          .replace(/^'(.*)'$/, '$1');
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        // preserve numbers and booleans as-is (e.g. rating, reviews)
      } else if (value === null || value === undefined) {
        row[key] = value ?? null;
      }
    });

    let phone = (row.phoneNumber || '')
      .toString()
      .replace(/[\s\-()]/g, '')
      .replace(/^00/, '+');
    // Ensure phone starts with + if not then add dfault + and merge with country code if available
    if (phone !== '' && !phone.startsWith('+')) {
      const countryCode = (row.countryCode || '').toString().trim();
      const cleanedCountryCode = countryCode.replace(/[\s\-()]/g, '');

      // Remove any leading zeros from phone number
      const cleanedPhone = phone.replace(/^0+/, '');
      phone = `+${cleanedCountryCode}${cleanedPhone}`;
    }

    // Additional validation for Indian numbers
    const isPhoneValid = (() => {
      if (!phoneRegex.test(phone)) return false;

      // For Indian numbers (+91), ensure total length is appropriate
      if (phone.startsWith('+91')) {
        const digitsAfterCountryCode = phone.substring(3);
        // Indian mobile numbers should be 10 digits
        return (
          digitsAfterCountryCode.length === 10 &&
          /^[6-9]\d{9}$/.test(digitsAfterCountryCode)
        );
      }

      const phoneNumberDigits = phone.replace('+', '');
      return phoneNumberDigits.length >= 9 && phoneNumberDigits.length <= 15;
    })();

    const email = (row.email || row.Email || '').trim().toLowerCase();
    const website = (row.websiteUrl || '').trim();
    const businessName = (row.businessName || row.BusinessName || '').trim();
    const companyName = (row.companyName || row.CompanyName || '')
      .toString()
      .trim();

    row.phoneNumber = phone;
    row.email = email;
    row.websiteUrl = website;
    row.businessName = businessName || companyName;
    row.companyName = companyName || businessName;

    const isWebsiteValid = voicebotMode
      ? website !== '' && websiteRegex.test(website)
      : website === '' || websiteRegex.test(website);
    const isBusinessNameValid =
      typeof businessName === 'string' && businessName?.length >= 2;

    const normalizedBusiness = businessName.toLowerCase();
    const isBusinessDuplicate = seenBusinessNames.has(normalizedBusiness);

    if (isBusinessNameValid && !isBusinessDuplicate) {
      validBusinessNameCount++;
      if (!voicebotMode) {
        seenBusinessNames.add(normalizedBusiness);
      }
    } else {
      invalidBusinessNameCount++;
      if (isBusinessDuplicate) {
        duplicateBusinessCount++;
      }
    }

    let isEmailInvalid = false;
    let isEmailDuplicate = false;

    if (email === '') {
      isEmailInvalid = true;
      invalidEmailCount++;
    } else {
      const isEmailValid = emailRegex.test(email);
      isEmailInvalid = !isEmailValid;
      isEmailDuplicate = seenEmails.has(email);

      if (isEmailValid && !isEmailDuplicate) {
        validEmailCount++;
      } else {
        invalidEmailCount++;
      }

      if (isEmailDuplicate) {
        duplicateEmailCount++;
      } else {
        seenEmails.add(email);
      }
    }

    const isPhoneDuplicate = seenPhoneNumbers.has(phone);
    const isPhoneInvalid = !isPhoneValid;
    const isWebsiteInvalid = !isWebsiteValid;

    if (isPhoneInvalid) {
      invalidPhoneCount++;
    } else if (isPhoneDuplicate) {
      duplicatePhoneCount++;
    } else {
      validPhoneCount++;
      seenPhoneNumbers.add(phone);
    }

    const rowNumber = index + 2;

    const isCompanyNameInvalid = companyName === '';

    const detailedRow = {
      ...row,
      rowNumber,
      isPhoneInvalid,
      isEmailInvalid,
      isWebsiteInvalid,
      isPhoneDuplicate,
      isEmailDuplicate,
      isBusinessNameInvalid: !isBusinessNameValid,
      isBusinessDuplicate,
      isCompanyNameInvalid,
    };

    detailedRows.push(detailedRow);

    // ── VALID ROWS LOGIC ───────────────────────────────────────────────────
    if (voicebotMode) {
      /*
       * Voicebot mode validation:
       * - Phone must be valid AND unique (hard requirement)
       * - Website URL must be present and valid
       * - Email must be present and valid
       * - Company name must be present
       */
      const isValidForVoicebot =
        !isPhoneInvalid &&
        !isPhoneDuplicate &&
        !isWebsiteInvalid &&
        !isEmailInvalid &&
        !isCompanyNameInvalid;

      if (isValidForVoicebot) {
        validRows.push(detailedRow);
      }
    } else {
      /*
       * Default (original) mode:
       * - All fields must be valid and unique
       * - Phone can be exempted via requirePhone: false for sources that
       *   structurally never have one (e.g. LinkedIn profile scraping) -
       *   without it, every row from such a source is unconditionally
       *   invalid regardless of how good the email/website data is.
       */
      const isFullyValid =
        (!requirePhone || (!isPhoneInvalid && !isPhoneDuplicate)) &&
        (!requireEmail || (!isEmailInvalid && !isEmailDuplicate)) &&
        !isWebsiteInvalid &&
        isBusinessNameValid &&
        !isBusinessDuplicate;

      if (isFullyValid) {
        validRows.push(detailedRow);
      }
    }
  });

  return {
    validPhoneCount,
    validEmailCount,
    validWebsiteCount,
    invalidPhoneCount,
    invalidEmailCount,
    invalidWebsiteCount,
    duplicatePhoneCount,
    duplicateEmailCount,
    validBusinessNameCount,
    invalidBusinessNameCount,
    duplicateBusinessCount,
    allRows: detailedRows,
    validRows,
  };
}

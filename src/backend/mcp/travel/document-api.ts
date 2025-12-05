
export interface PassportInfo {
  passportNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  nationality: string;
  issuingCountry: string;
  issueDate: string;
  expiryDate: string;
}

export interface PaymentMethodInfo {
  type: 'credit_card' | 'debit_card' | 'company_card';
  last4Digits: string;
  cardHolder: string;
  expiryDate: string;
  brand: string;
}

const mockPassports: Map<string, PassportInfo> = new Map([
  ['P12345678', {
    passportNumber: 'P12345678',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: '1990-01-15',
    nationality: 'US',
    issuingCountry: 'US',
    issueDate: '2020-01-01',
    expiryDate: '2030-01-01',
  }],
  ['P87654321', {
    passportNumber: 'P87654321',
    firstName: 'Jane',
    lastName: 'Smith',
    dateOfBirth: '1985-05-20',
    nationality: 'US',
    issuingCountry: 'US',
    issueDate: '2019-06-15',
    expiryDate: '2029-06-15',
  }],
]);

const mockPaymentMethods: Map<string, PaymentMethodInfo> = new Map([
  ['4111', {
    type: 'credit_card',
    last4Digits: '4111',
    cardHolder: 'John Doe',
    expiryDate: '12/2027',
    brand: 'Visa',
  }],
  ['5555', {
    type: 'company_card',
    last4Digits: '5555',
    cardHolder: 'Company Travel',
    expiryDate: '06/2028',
    brand: 'Mastercard',
  }],
]);

export async function getPassport(payload: { passportNumber: string }): Promise<PassportInfo> {
  if (!payload.passportNumber) {
    throw new Error('Missing required field: passportNumber');
  }

  const passport = mockPassports.get(payload.passportNumber);
  if (!passport) {
    throw new Error(`Passport not found: ${payload.passportNumber}`);
  }

  const expiryDate = new Date(passport.expiryDate);
  const today = new Date();
  
  if (expiryDate < today) {
    throw new Error(`Passport ${payload.passportNumber} has expired on ${passport.expiryDate}`);
  }

  return passport;
}

export async function validatePassport(payload: { passportNumber: string; expiryDate: string }): Promise<{ valid: boolean; message: string }> {
  if (!payload.passportNumber || !payload.expiryDate) {
    throw new Error('Missing required fields: passportNumber, expiryDate');
  }

  const passport = mockPassports.get(payload.passportNumber);
  if (!passport) {
    return {
      valid: false,
      message: `Passport ${payload.passportNumber} not found in system`,
    };
  }

  const expiryDate = new Date(payload.expiryDate);
  const today = new Date();
  const sixMonthsFromNow = new Date();
  sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

  if (expiryDate < today) {
    return {
      valid: false,
      message: 'Passport has expired',
    };
  }

  if (expiryDate < sixMonthsFromNow) {
    return {
      valid: false,
      message: 'Passport must be valid for at least 6 months from travel date',
    };
  }

  return {
    valid: true,
    message: 'Passport is valid',
  };
}

export async function getPaymentMethod(payload: { last4Digits: string }): Promise<PaymentMethodInfo> {
  if (!payload.last4Digits) {
    throw new Error('Missing required field: last4Digits');
  }

  const paymentMethod = mockPaymentMethods.get(payload.last4Digits);
  if (!paymentMethod) {
    throw new Error(`Payment method not found: ending in ${payload.last4Digits}`);
  }

  return paymentMethod;
}

export async function validatePaymentMethod(payload: { last4Digits: string; expiryDate: string }): Promise<{ valid: boolean; message: string }> {
  if (!payload.last4Digits || !payload.expiryDate) {
    throw new Error('Missing required fields: last4Digits, expiryDate');
  }

  const paymentMethod = mockPaymentMethods.get(payload.last4Digits);
  if (!paymentMethod) {
    return {
      valid: false,
      message: `Payment method ending in ${payload.last4Digits} not found`,
    };
  }

  const [month, year] = payload.expiryDate.split('/').map(s => parseInt(s, 10));
  const expiryDate = new Date(year, month - 1);
  const today = new Date();

  if (expiryDate < today) {
    return {
      valid: false,
      message: 'Payment method has expired',
    };
  }

  return {
    valid: true,
    message: 'Payment method is valid',
  };
}

export async function uploadDocument(payload: { 
  documentType: string; 
  travelerId: string; 
  fileBuffer: Buffer; 
  mimeType: string 
}): Promise<{ documentId: string; uploadUrl: string }> {
  if (!payload.documentType || !payload.travelerId || !payload.fileBuffer) {
    throw new Error('Missing required fields: documentType, travelerId, fileBuffer');
  }

  if (payload.fileBuffer.length > 10 * 1024 * 1024) {
    throw new Error('File size exceeds maximum allowed size of 10MB');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (!allowedTypes.includes(payload.mimeType)) {
    throw new Error(`Invalid file type: ${payload.mimeType}. Allowed types: ${allowedTypes.join(', ')}`);
  }

  const documentId = `DOC-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const uploadUrl = `/mock/documents/${documentId}`;

  return {
    documentId,
    uploadUrl,
  };
}

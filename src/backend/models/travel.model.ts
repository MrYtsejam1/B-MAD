export enum TravelStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  BOOKED = 'BOOKED',
  CANCELLED = 'CANCELLED',
  REJECTED = 'REJECTED',
}

export enum TravelStep {
  DESTINATION = 'destination',
  DATES = 'dates',
  TRAVELERS = 'travelers',
  FLIGHTS = 'flights',
  HOTELS = 'hotels',
  DOCUMENTS = 'documents',
  PAYMENT = 'payment',
  REVIEW = 'review',
}

export interface TravelBooking {
  bookingId: string;
  userId: string;
  destination: string;
  startDate: string;
  endDate: string;
  travelers: Traveler[];
  flights?: FlightSelection[];
  hotels?: HotelSelection[];
  documents?: TravelDocument[];
  paymentMethod?: PaymentMethod;
  status: TravelStatus;
  currentStep: TravelStep;
  createdAt: string;
  submittedAt?: string;
  approvedAt?: string;
  bookedAt?: string;
  totalCost?: number;
  currency?: string;
}

export interface Traveler {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string;
  passportNumber?: string;
  passportExpiry?: string;
}

export interface FlightSelection {
  flightId: string;
  airline: string;
  flightNumber: string;
  departure: string;
  arrival: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  currency: string;
}

export interface HotelSelection {
  hotelId: string;
  name: string;
  address: string;
  checkIn: string;
  checkOut: string;
  roomType: string;
  pricePerNight: number;
  totalPrice: number;
  currency: string;
}

export interface TravelDocument {
  documentId: string;
  type: 'passport' | 'visa' | 'id_card';
  travelerId: string;
  documentNumber: string;
  expiryDate: string;
  issuingCountry: string;
  uploadUrl?: string;
}

export interface PaymentMethod {
  type: 'credit_card' | 'debit_card' | 'company_card';
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  billingAddress?: string;
}

export interface TravelBookingRequest {
  destination: string;
  startDate: string;
  endDate: string;
  travelers: Traveler[];
  flights?: FlightSelection[];
  hotels?: HotelSelection[];
  documents?: TravelDocument[];
  paymentMethod?: PaymentMethod;
}

export interface TravelBookingResponse {
  bookingId: string;
  status: TravelStatus;
  currentStep: TravelStep;
  nextSteps: TravelStep[];
  message: string;
  createdAt: string;
}

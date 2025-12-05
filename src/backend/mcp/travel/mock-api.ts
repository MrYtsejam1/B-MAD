import { TravelStore } from './travel-store';
import {
  TravelBooking,
  TravelBookingRequest,
  TravelBookingResponse,
  TravelStatus,
  TravelStep,
} from '../../models/travel.model';

const store = TravelStore.getInstance();

export async function book(payload: TravelBookingRequest): Promise<TravelBookingResponse> {
  if (!payload.destination || !payload.startDate || !payload.endDate || !payload.travelers || payload.travelers.length === 0) {
    throw new Error('Missing required fields: destination, startDate, endDate, travelers');
  }

  const startDate = new Date(payload.startDate);
  const endDate = new Date(payload.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format. Expected ISO 8601 (YYYY-MM-DD)');
  }

  if (startDate < today) {
    throw new Error('Start date cannot be in the past');
  }

  if (endDate <= startDate) {
    throw new Error('End date must be after start date');
  }

  for (const traveler of payload.travelers) {
    if (!traveler.firstName || !traveler.lastName || !traveler.email) {
      throw new Error('Each traveler must have firstName, lastName, and email');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(traveler.email)) {
      throw new Error(`Invalid email format: ${traveler.email}`);
    }
  }

  const bookingId = store.generateBookingId();
  const now = new Date().toISOString();

  const currentStep = determineCurrentStep(payload);
  const nextSteps = determineNextSteps(currentStep, payload);

  const booking: TravelBooking = {
    bookingId,
    userId: 'demo-user',
    destination: payload.destination,
    startDate: payload.startDate,
    endDate: payload.endDate,
    travelers: payload.travelers,
    flights: payload.flights,
    hotels: payload.hotels,
    documents: payload.documents,
    paymentMethod: payload.paymentMethod,
    status: TravelStatus.DRAFT,
    currentStep,
    createdAt: now,
  };

  if (payload.flights && payload.hotels) {
    const flightCost = payload.flights.reduce((sum, f) => sum + f.price, 0);
    const hotelCost = payload.hotels.reduce((sum, h) => sum + h.totalPrice, 0);
    booking.totalCost = flightCost + hotelCost;
    booking.currency = payload.flights[0]?.currency || 'USD';
  }

  store.save(booking);

  if (nextSteps.length === 0) {
    store.updateStatus(bookingId, TravelStatus.SUBMITTED);
    booking.status = TravelStatus.SUBMITTED;
    booking.submittedAt = now;
  }

  return {
    bookingId,
    status: booking.status,
    currentStep,
    nextSteps,
    message: nextSteps.length > 0 
      ? `Booking created. Please complete: ${nextSteps.join(', ')}`
      : 'Booking submitted successfully. Awaiting approval.',
    createdAt: now,
  };
}

export async function status(payload: { bookingId: string }): Promise<any> {
  if (!payload.bookingId) {
    throw new Error('Missing required field: bookingId');
  }

  const booking = store.get(payload.bookingId);
  if (!booking) {
    throw new Error(`Booking not found: ${payload.bookingId}`);
  }

  return {
    bookingId: booking.bookingId,
    status: booking.status,
    currentStep: booking.currentStep,
    destination: booking.destination,
    startDate: booking.startDate,
    endDate: booking.endDate,
    travelers: booking.travelers.length,
    totalCost: booking.totalCost,
    currency: booking.currency,
    createdAt: booking.createdAt,
    submittedAt: booking.submittedAt,
    approvedAt: booking.approvedAt,
    bookedAt: booking.bookedAt,
  };
}

export async function update(payload: { bookingId: string; updates: Partial<TravelBookingRequest> }): Promise<any> {
  if (!payload.bookingId) {
    throw new Error('Missing required field: bookingId');
  }

  const booking = store.get(payload.bookingId);
  if (!booking) {
    throw new Error(`Booking not found: ${payload.bookingId}`);
  }

  if (payload.updates.destination) booking.destination = payload.updates.destination;
  if (payload.updates.startDate) booking.startDate = payload.updates.startDate;
  if (payload.updates.endDate) booking.endDate = payload.updates.endDate;
  if (payload.updates.travelers) booking.travelers = payload.updates.travelers;
  if (payload.updates.flights) booking.flights = payload.updates.flights;
  if (payload.updates.hotels) booking.hotels = payload.updates.hotels;
  if (payload.updates.documents) booking.documents = payload.updates.documents;
  if (payload.updates.paymentMethod) booking.paymentMethod = payload.updates.paymentMethod;

  booking.currentStep = determineCurrentStep(booking);
  const nextSteps = determineNextSteps(booking.currentStep, booking);

  if (nextSteps.length === 0 && booking.status === TravelStatus.DRAFT) {
    store.updateStatus(booking.bookingId, TravelStatus.SUBMITTED);
    booking.status = TravelStatus.SUBMITTED;
    booking.submittedAt = new Date().toISOString();
  }

  store.save(booking);

  return {
    bookingId: booking.bookingId,
    status: booking.status,
    currentStep: booking.currentStep,
    nextSteps,
    message: 'Booking updated successfully',
  };
}

function determineCurrentStep(booking: Partial<TravelBookingRequest>): TravelStep {
  if (!booking.destination) return TravelStep.DESTINATION;
  if (!booking.startDate || !booking.endDate) return TravelStep.DATES;
  if (!booking.travelers || booking.travelers.length === 0) return TravelStep.TRAVELERS;
  if (!booking.flights || booking.flights.length === 0) return TravelStep.FLIGHTS;
  if (!booking.hotels || booking.hotels.length === 0) return TravelStep.HOTELS;
  if (!booking.documents || booking.documents.length === 0) return TravelStep.DOCUMENTS;
  if (!booking.paymentMethod) return TravelStep.PAYMENT;
  return TravelStep.REVIEW;
}

function determineNextSteps(currentStep: TravelStep, booking: Partial<TravelBookingRequest>): TravelStep[] {
  const allSteps = [
    TravelStep.DESTINATION,
    TravelStep.DATES,
    TravelStep.TRAVELERS,
    TravelStep.FLIGHTS,
    TravelStep.HOTELS,
    TravelStep.DOCUMENTS,
    TravelStep.PAYMENT,
    TravelStep.REVIEW,
  ];

  const currentIndex = allSteps.indexOf(currentStep);
  const nextSteps: TravelStep[] = [];

  for (let i = currentIndex; i < allSteps.length; i++) {
    const step = allSteps[i];
    
    switch (step) {
      case TravelStep.DESTINATION:
        if (!booking.destination) nextSteps.push(step);
        break;
      case TravelStep.DATES:
        if (!booking.startDate || !booking.endDate) nextSteps.push(step);
        break;
      case TravelStep.TRAVELERS:
        if (!booking.travelers || booking.travelers.length === 0) nextSteps.push(step);
        break;
      case TravelStep.FLIGHTS:
        if (!booking.flights || booking.flights.length === 0) nextSteps.push(step);
        break;
      case TravelStep.HOTELS:
        if (!booking.hotels || booking.hotels.length === 0) nextSteps.push(step);
        break;
      case TravelStep.DOCUMENTS:
        if (!booking.documents || booking.documents.length === 0) nextSteps.push(step);
        break;
      case TravelStep.PAYMENT:
        if (!booking.paymentMethod) nextSteps.push(step);
        break;
    }
  }

  return nextSteps;
}

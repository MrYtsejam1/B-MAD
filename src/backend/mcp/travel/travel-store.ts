import { TravelBooking, TravelStatus, TravelStep } from '../../models/travel.model';

export class TravelStore {
  private static instance: TravelStore;
  private bookings: Map<string, TravelBooking> = new Map();

  private constructor() {}

  static getInstance(): TravelStore {
    if (!TravelStore.instance) {
      TravelStore.instance = new TravelStore();
    }
    return TravelStore.instance;
  }

  generateBookingId(): string {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `TRV-${dateStr}-${random}`;
  }

  save(booking: TravelBooking): void {
    this.bookings.set(booking.bookingId, booking);
  }

  get(bookingId: string): TravelBooking | undefined {
    return this.bookings.get(bookingId);
  }

  getByUser(userId: string): TravelBooking[] {
    return Array.from(this.bookings.values())
      .filter(booking => booking.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  updateStatus(bookingId: string, status: TravelStatus): boolean {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      return false;
    }

    booking.status = status;
    const now = new Date().toISOString();

    switch (status) {
      case TravelStatus.SUBMITTED:
        booking.submittedAt = now;
        break;
      case TravelStatus.APPROVED:
        booking.approvedAt = now;
        break;
      case TravelStatus.BOOKED:
        booking.bookedAt = now;
        break;
    }

    this.bookings.set(bookingId, booking);
    return true;
  }

  updateStep(bookingId: string, step: TravelStep): boolean {
    const booking = this.bookings.get(bookingId);
    if (!booking) {
      return false;
    }

    booking.currentStep = step;
    this.bookings.set(bookingId, booking);
    return true;
  }

  clear(): void {
    this.bookings.clear();
  }
}

import { TravelBooking } from '../../models/travel.model';

export interface BookingPayload {
  booking: TravelBooking;
  payload: any;
  humanReadable: string;
  validation: {
    valid: boolean;
    errors?: string[];
    warnings?: string[];
  };
}

export class BookingPayloadService {
  async generatePayload(booking: TravelBooking): Promise<BookingPayload> {
    const validation = this.validateBooking(booking);

    const payload = this.buildAPIPayload(booking);

    const humanReadable = this.generateConfirmation(booking);

    return {
      booking,
      payload,
      humanReadable,
      validation,
    };
  }

  private validateBooking(booking: TravelBooking): { valid: boolean; errors?: string[]; warnings?: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!booking.destination) errors.push('Destination is required');
    if (!booking.startDate) errors.push('Start date is required');
    if (!booking.endDate) errors.push('End date is required');
    if (!booking.travelers || booking.travelers.length === 0) errors.push('At least one traveler is required');

    if (booking.startDate && booking.endDate) {
      const start = new Date(booking.startDate);
      const end = new Date(booking.endDate);
      
      if (end <= start) {
        errors.push('End date must be after start date');
      }

      const tripDuration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (tripDuration > 30) {
        warnings.push(`Trip duration is ${tripDuration} days. Consider breaking into multiple bookings.`);
      }
    }

    if (booking.travelers) {
      for (const traveler of booking.travelers) {
        if (!traveler.firstName || !traveler.lastName || !traveler.email) {
          errors.push(`Traveler ${traveler.id} is missing required fields`);
        }
      }
    }

    if (!booking.flights || booking.flights.length === 0) {
      warnings.push('No flights selected');
    }

    if (!booking.hotels || booking.hotels.length === 0) {
      warnings.push('No hotels selected');
    }

    if (!booking.documents || booking.documents.length === 0) {
      warnings.push('No travel documents provided');
    } else {
      const travelersWithoutPassports = booking.travelers.filter(
        t => !booking.documents?.some(d => d.travelerId === t.id && d.type === 'passport')
      );
      
      if (travelersWithoutPassports.length > 0) {
        warnings.push(`${travelersWithoutPassports.length} traveler(s) missing passport information`);
      }
    }

    if (!booking.paymentMethod) {
      errors.push('Payment method is required');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private buildAPIPayload(booking: TravelBooking): any {
    return {
      bookingReference: booking.bookingId,
      traveler: {
        userId: booking.userId,
        primaryContact: booking.travelers[0],
      },
      itinerary: {
        destination: booking.destination,
        departureDate: booking.startDate,
        returnDate: booking.endDate,
        duration: this.calculateDuration(booking.startDate, booking.endDate),
      },
      travelers: booking.travelers.map(t => ({
        id: t.id,
        name: {
          first: t.firstName,
          last: t.lastName,
        },
        contact: {
          email: t.email,
          phone: t.phone,
        },
        dateOfBirth: t.dateOfBirth,
        passport: {
          number: t.passportNumber,
          expiry: t.passportExpiry,
        },
      })),
      flights: booking.flights?.map(f => ({
        id: f.flightId,
        airline: f.airline,
        flightNumber: f.flightNumber,
        route: {
          from: f.departure,
          to: f.arrival,
        },
        schedule: {
          departure: f.departureTime,
          arrival: f.arrivalTime,
        },
        pricing: {
          amount: f.price,
          currency: f.currency,
        },
      })),
      accommodations: booking.hotels?.map(h => ({
        id: h.hotelId,
        name: h.name,
        address: h.address,
        stay: {
          checkIn: h.checkIn,
          checkOut: h.checkOut,
          nights: this.calculateDuration(h.checkIn, h.checkOut),
        },
        room: {
          type: h.roomType,
        },
        pricing: {
          perNight: h.pricePerNight,
          total: h.totalPrice,
          currency: h.currency,
        },
      })),
      documents: booking.documents?.map(d => ({
        id: d.documentId,
        type: d.type,
        travelerId: d.travelerId,
        number: d.documentNumber,
        expiry: d.expiryDate,
        issuingCountry: d.issuingCountry,
        uploadUrl: d.uploadUrl,
      })),
      payment: booking.paymentMethod ? {
        method: booking.paymentMethod.type,
        cardNumber: this.maskCardNumber(booking.paymentMethod.cardNumber),
        cardHolder: booking.paymentMethod.cardHolder,
        expiry: booking.paymentMethod.expiryDate,
      } : undefined,
      pricing: {
        total: booking.totalCost,
        currency: booking.currency || 'USD',
        breakdown: this.calculatePriceBreakdown(booking),
      },
      metadata: {
        createdAt: booking.createdAt,
        submittedAt: booking.submittedAt,
        status: booking.status,
        currentStep: booking.currentStep,
      },
    };
  }

  private generateConfirmation(booking: TravelBooking): string {
    const duration = this.calculateDuration(booking.startDate, booking.endDate);
    const travelerNames = booking.travelers.map(t => `${t.firstName} ${t.lastName}`).join(', ');

    let confirmation = `
TRAVEL BOOKING CONFIRMATION
===========================

Booking Reference: ${booking.bookingId}
Status: ${booking.status}

TRIP DETAILS
------------
Destination: ${booking.destination}
Dates: ${booking.startDate} to ${booking.endDate} (${duration} days)
Travelers: ${booking.travelers.length} - ${travelerNames}

`;

    if (booking.flights && booking.flights.length > 0) {
      confirmation += `FLIGHTS\n-------\n`;
      for (const flight of booking.flights) {
        confirmation += `${flight.airline} ${flight.flightNumber}\n`;
        confirmation += `  ${flight.departure} → ${flight.arrival}\n`;
        confirmation += `  Departure: ${flight.departureTime}\n`;
        confirmation += `  Arrival: ${flight.arrivalTime}\n`;
        confirmation += `  Price: ${flight.currency} ${flight.price.toFixed(2)}\n\n`;
      }
    }

    if (booking.hotels && booking.hotels.length > 0) {
      confirmation += `ACCOMMODATIONS\n--------------\n`;
      for (const hotel of booking.hotels) {
        const nights = this.calculateDuration(hotel.checkIn, hotel.checkOut);
        confirmation += `${hotel.name}\n`;
        confirmation += `  ${hotel.address}\n`;
        confirmation += `  Check-in: ${hotel.checkIn}\n`;
        confirmation += `  Check-out: ${hotel.checkOut} (${nights} nights)\n`;
        confirmation += `  Room: ${hotel.roomType}\n`;
        confirmation += `  Total: ${hotel.currency} ${hotel.totalPrice.toFixed(2)}\n\n`;
      }
    }

    if (booking.totalCost) {
      confirmation += `TOTAL COST\n----------\n`;
      confirmation += `${booking.currency || 'USD'} ${booking.totalCost.toFixed(2)}\n\n`;
    }

    if (booking.paymentMethod) {
      confirmation += `PAYMENT METHOD\n--------------\n`;
      confirmation += `${booking.paymentMethod.type.replace('_', ' ').toUpperCase()}\n`;
      confirmation += `Card: ${this.maskCardNumber(booking.paymentMethod.cardNumber)}\n`;
      confirmation += `Holder: ${booking.paymentMethod.cardHolder}\n\n`;
    }

    confirmation += `Created: ${new Date(booking.createdAt).toLocaleString()}\n`;
    if (booking.submittedAt) {
      confirmation += `Submitted: ${new Date(booking.submittedAt).toLocaleString()}\n`;
    }

    return confirmation;
  }

  private calculateDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  private maskCardNumber(cardNumber: string): string {
    if (cardNumber.length < 4) return '****';
    return `**** **** **** ${cardNumber.slice(-4)}`;
  }

  private calculatePriceBreakdown(booking: TravelBooking): any {
    const breakdown: any = {};

    if (booking.flights && booking.flights.length > 0) {
      breakdown.flights = booking.flights.reduce((sum, f) => sum + f.price, 0);
    }

    if (booking.hotels && booking.hotels.length > 0) {
      breakdown.hotels = booking.hotels.reduce((sum, h) => sum + h.totalPrice, 0);
    }

    return breakdown;
  }
}

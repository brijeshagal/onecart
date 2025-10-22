/**
 * Test Payment Cards for Development and Testing
 * WARNING: Use only for testing purposes. Never use in production.
 * 
 * IMPORTANT PAYMENT GATEWAY BEHAVIOR:
 * - In TEST MODE: Payment cancellation will result in a SUCCESSFUL payment
 * - To test payment cancellation on UPI: Use LIVE MODE instead of test mode
 * 
 * TEST MODE: Suitable for testing payment completion flows and general payment integration
 * LIVE MODE: Required for testing payment cancellation, refunds, and UPI-specific scenarios
 */

export interface TestCard {
  cardNumber: string;
  cardType: 'VISA' | 'MASTERCARD';
  cvv: string;
  expiryMonth: number;
  expiryYear: number;
  region: 'INDIAN' | 'INTERNATIONAL';
  description?: string;
  requiresAddressCollection?: boolean;
  addressDetails?: TestCardAddress;
}

export interface TestCardAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface TestPaymentCardsObject {
  indian: {
    mastercard: TestCard[];
    visa: TestCard[];
  };
  international: {
    mastercard: TestCard[];
    visa: TestCard[];
  };
}

/**
 * Test payment cards for development and testing
 * All CVVs should be random 3-digit numbers
 * All expiry dates should be set to future dates
 */
export const testPaymentCards: TestPaymentCardsObject = {
  indian: {
    mastercard: [
      {
        cardNumber: '2305324257848228',
        cardType: 'MASTERCARD',
        cvv: '123', // Use random CVV for each test
        expiryMonth: 12,
        expiryYear: 2026,
        region: 'INDIAN',
        description: 'Indian Mastercard - Test Card 1',
      },
    ],
    visa: [
      {
        cardNumber: '4386289407660153',
        cardType: 'VISA',
        cvv: '456', // Use random CVV for each test
        expiryMonth: 6,
        expiryYear: 2026,
        region: 'INDIAN',
        description: 'Indian Visa - Test Card 1',
      },
    ],
  },
  international: {
    mastercard: [
      {
        cardNumber: '5421139306090628',
        cardType: 'MASTERCARD',
        cvv: '789', // Use random CVV for each test
        expiryMonth: 3,
        expiryYear: 2027,
        region: 'INTERNATIONAL',
        description: 'International Mastercard - Test Card 1',
      },
      {
        cardNumber: '5105105105105100',
        cardType: 'MASTERCARD',
        cvv: '234', // Use random CVV for each test
        expiryMonth: 9,
        expiryYear: 2027,
        region: 'INTERNATIONAL',
        description: 'International Mastercard - Test Card 2 (Requires Address Collection)',
        requiresAddressCollection: true,
        addressDetails: {
          line1: '21 Applegate Apartment',
          line2: 'Rockledge Street',
          city: 'New York',
          state: 'New York',
          country: 'US',
          zipCode: '11561',
        },
      },
      {
        cardNumber: '5104060000000008',
        cardType: 'MASTERCARD',
        cvv: '567', // Use random CVV for each test
        expiryMonth: 12,
        expiryYear: 2027,
        region: 'INTERNATIONAL',
        description: 'International Mastercard - Test Card 3',
      },
    ],
    visa: [
      {
        cardNumber: '4012888888881881',
        cardType: 'VISA',
        cvv: '890', // Use random CVV for each test
        expiryMonth: 6,
        expiryYear: 2027,
        region: 'INTERNATIONAL',
        description: 'International Visa - Test Card 1',
      },
    ],
  },
};

/**
 * UPI Payment Testing Guidelines
 * 
 * TEST MODE:
 * - All UPI payments will be processed immediately
 * - Payment cancellation will NOT actually cancel the payment
 * - Use for integration and flow testing only
 * 
 * LIVE MODE (for cancellation testing):
 * - Use live mode when you need to test actual payment cancellation
 * - Use live mode for refund flow testing
 * - Be cautious with live mode as it may involve actual transactions
 * 
 * Recommended Test Flow:
 * 1. Test payment completion: Use TEST MODE with test cards
 * 2. Test payment cancellation: Use LIVE MODE with test cards
 * 3. Test address collection: Use international test card 5105105105105100
 * 4. Test multiple cards: Use getRandomTestCard() or specific getTestCard(region, type)
 */
export const UPI_TESTING_GUIDELINES = {
  testMode: {
    description: 'Payment cancellation results in successful payment',
    recommendation: 'Use for happy path and general integration testing',
    cancellationBehavior: 'WILL NOT CANCEL - results in successful payment',
  },
  liveMode: {
    description: 'Payment cancellation works as expected',
    recommendation: 'Use for cancellation and refund flow testing',
    cancellationBehavior: 'WILL CANCEL - as expected',
  },
};

/**
 * Get a specific test card by region and type
 * @param region - 'INDIAN' or 'INTERNATIONAL'
 * @param cardType - 'VISA' or 'MASTERCARD'
 * @param index - Index of the card (default: 0)
 * @returns TestCard object or null if not found
 */
export const getTestCard = (
  region: 'INDIAN' | 'INTERNATIONAL',
  cardType: 'VISA' | 'MASTERCARD',
  index: number = 0
): TestCard | null => {
  try {
    if (region === 'INDIAN') {
      if (cardType === 'VISA') {
        return testPaymentCards.indian.visa[index] || null;
      } else {
        return testPaymentCards.indian.mastercard[index] || null;
      }
    } else {
      if (cardType === 'VISA') {
        return testPaymentCards.international.visa[index] || null;
      } else {
        return testPaymentCards.international.mastercard[index] || null;
      }
    }
  } catch (error) {
    console.error('Error retrieving test card:', error);
    return null;
  }
};

/**
 * Get all test cards
 */
export const getAllTestCards = (): TestPaymentCardsObject => {
  return testPaymentCards;
};

/**
 * Get random test card
 */
export const getRandomTestCard = (): TestCard => {
  const regions: Array<'INDIAN' | 'INTERNATIONAL'> = ['INDIAN', 'INTERNATIONAL'];
  const cardTypes: Array<'VISA' | 'MASTERCARD'> = ['VISA', 'MASTERCARD'];
  
  const randomRegionIndex = Math.floor(Math.random() * regions.length);
  const randomCardTypeIndex = Math.floor(Math.random() * cardTypes.length);
  
  const randomRegion = regions[randomRegionIndex] as 'INDIAN' | 'INTERNATIONAL';
  const randomCardType = cardTypes[randomCardTypeIndex] as 'VISA' | 'MASTERCARD';
  
  const card = getTestCard(randomRegion, randomCardType, 0);
  if (card !== null) {
    return card;
  }
  
  // Fallback to first available card (guaranteed to exist)
  return testPaymentCards.indian.visa[0]!;
};

/**
 * Razorpay Payment Service
 * Handles payment operations like fetching payment details and capturing payments
 * Uses Node.js built-in fetch API (no external dependencies)
 * Reference: https://razorpay.com/docs/api/payments/capture/
 */

import { env } from '../config/env';

/**
 * Razorpay Payment Response Structure
 * Reference: https://razorpay.com/docs/api/payments/capture/
 */
export interface RazorpayPayment {
  id: string;
  entity: 'payment';
  amount: number;
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id: string | null;
  invoice_id: string | null;
  international: boolean;
  method: string;
  amount_refunded: number;
  refund_status: null | 'partial' | 'full';
  captured: boolean;
  description?: string;
  card_id?: string;
  card?: RazorpayCard;
  bank?: string | null;
  wallet?: string | null;
  email?: string;
  contact?: string;
  notes?: Record<string, any>;
  fee?: number;
  tax?: number;
  error_code?: string | null;
  error_description?: string | null;
  error_source?: string | null;
  error_step?: string | null;
  error_reason?: string | null;
  acquirer_data?: Record<string, any>;
  created_at: number;
}

export interface RazorpayCard {
  id: string;
  entity: 'card';
  name?: string;
  last4: string;
  network: string;
  type: string;
  issuer?: string | null;
  international: boolean;
  sub_type: string;
  token_iin?: string | null;
}

export interface CapturePaymentRequest {
  amount: number;
  currency: string;
}

export interface CheckPaymentResponse {
  success: boolean;
  payment?: RazorpayPayment;
  error?: string;
}

export interface CapturePaymentResponse {
  success: boolean;
  payment?: RazorpayPayment;
  error?: string;
}

/**
 * Razorpay Service Class
 * Provides methods to interact with Razorpay Payment API using native fetch
 */
class RazorpayPaymentService {
  private baseURL: string = 'https://api.razorpay.com/v1';
  private keyId: string;
  private keySecret: string;
  private authHeader: string;

  constructor() {
    this.keyId = env.RZPAY_TEST_KEY_ID || '';
    this.keySecret = env.RZPAY_TEST_KEY_SECRET || '';

    if (!this.keyId || !this.keySecret) {
      console.warn(
        '⚠️ Razorpay credentials not configured. Set RZPAY_TEST_KEY_ID and RZPAY_TEST_KEY_SECRET environment variables.'
      );
      this.authHeader = '';
    } else {
      // Create Basic Auth header
      const credentials = Buffer.from(`${this.keyId}:${this.keySecret}`).toString(
        'base64'
      );
      this.authHeader = `Basic ${credentials}`;
    }
  }

  /**
   * Make HTTP request to Razorpay API
   * @param endpoint - API endpoint path
   * @param method - HTTP method (GET, POST, etc.)
   * @param body - Optional request body for POST/PUT requests
   */
  private async makeRequest<T>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: Record<string, any>
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      if (!this.keyId || !this.keySecret) {
        return {
          success: false,
          error: 'Razorpay credentials not configured',
        };
      }

      const url = `${this.baseURL}${endpoint}`;
      const fetchOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authHeader,
        },
      };

      if (body) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          (errorData as any)?.error?.description ||
          (errorData as any)?.message ||
          `HTTP ${response.status}: ${response.statusText}`;
        return {
          success: false,
          error: errorMessage,
        };
      }

      const data: T = (await response.json()) as T;
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to make API request';
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Check/Fetch a payment by ID
   * @param paymentId - Unique identifier of the payment
   * @returns Payment details
   * Reference: https://razorpay.com/docs/api/payments/fetch/
   */
  async checkPayment(paymentId: string): Promise<CheckPaymentResponse> {
    try {
      const result = await this.makeRequest<RazorpayPayment>(
        `/payments/${paymentId}`
      );

      if (result.success && result.data) {
        console.log(`✅ Payment fetched successfully: ${paymentId}`);
        return {
          success: true,
          payment: result.data,
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to fetch payment',
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to fetch payment';
      console.error(`❌ Error fetching payment ${paymentId}:`, errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Capture a payment
   * Changes payment status from 'authorized' to 'captured'
   * Reference: https://razorpay.com/docs/api/payments/capture/
   *
   * @param paymentId - Unique identifier of the payment to capture
   * @param amount - Amount to capture (in smallest currency unit)
   * @param currency - ISO code of the currency (e.g., 'INR', 'USD')
   * @returns Captured payment details
   */
  async capturePayment(
    paymentId: string,
    amount: number,
    currency: string
  ): Promise<CapturePaymentResponse> {
    try {
      // Validate input
      if (!paymentId || amount <= 0 || !currency) {
        return {
          success: false,
          error:
            'Invalid input: paymentId, amount (> 0), and currency are required',
        };
      }

      const requestBody: CapturePaymentRequest = {
        amount,
        currency,
      };

      const result = await this.makeRequest<RazorpayPayment>(
        `/payments/${paymentId}/capture`,
        'POST',
        requestBody
      );

      if (result.success && result.data) {
        console.log(
          `✅ Payment captured successfully: ${paymentId} | Amount: ${amount} ${currency}`
        );
        return {
          success: true,
          payment: result.data,
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to capture payment',
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to capture payment';
      console.error(`❌ Error capturing payment ${paymentId}:`, errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get payment status
   * @param paymentId - Unique identifier of the payment
   * @returns Payment status
   */
  async getPaymentStatus(
    paymentId: string
  ): Promise<RazorpayPayment['status'] | null> {
    try {
      const response = await this.checkPayment(paymentId);
      if (response.success && response.payment) {
        return response.payment.status;
      }
      return null;
    } catch (error) {
      console.error('Error getting payment status:', error);
      return null;
    }
  }

  /**
   * Check if payment is authorized
   * @param paymentId - Unique identifier of the payment
   * @returns true if payment is authorized
   */
  async isPaymentAuthorized(paymentId: string): Promise<boolean> {
    const status = await this.getPaymentStatus(paymentId);
    return status === 'authorized';
  }

  /**
   * Check if payment is captured
   * @param paymentId - Unique identifier of the payment
   * @returns true if payment is captured
   */
  async isPaymentCaptured(paymentId: string): Promise<boolean> {
    const status = await this.getPaymentStatus(paymentId);
    return status === 'captured';
  }
}

// Export singleton instance
export const razorpayService = new RazorpayPaymentService();

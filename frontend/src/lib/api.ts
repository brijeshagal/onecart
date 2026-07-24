import {
  AddressData,
  AddToCartRequest,
  AddToCartResponse,
  ApiResponse,
  CheckoutCartResponse,
  RegisterUserRequest,
  RegisterUserResponse,
  SearchItemsRequest,
  SearchItemsResponse,
  SearchLocationRequest,
  SearchLocationResponse,
  User,
} from "@/types";
import axios, { AxiosResponse } from "axios";
import { Cart } from "./cartStore";

const API_BASE_URL = "http://localhost:4000/api";

class ApiService {
  private client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      "Content-Type": "application/json",
    },
  });

  private async handleResponse<T>(response: AxiosResponse<T>): Promise<T> {
    return response.data;
  }

  private async handleError(error: unknown) {
    let errorMessage = "An error occurred";

    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as {
        response?: { data?: { error?: { message?: string } } };
      };
      errorMessage = axiosError.response?.data?.error?.message || errorMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return errorMessage;
  }

  // User API endpoints
  async registerUser(data: RegisterUserRequest): Promise<RegisterUserResponse> {
    try {
      const response = await this.client.post<RegisterUserResponse>(
        "/user/register",
        data
      );
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: {
          message: errorMessage || "An error occurred",
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getUserProfile(
    userId: string
  ): Promise<ApiResponse<{ user: User; activeCart?: Cart }>> {
    try {
      const response = await this.client.get<
        ApiResponse<{ user: User; activeCart?: Cart }>
      >(`/user/${userId}`);
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: {
          message: errorMessage || "An error occurred",
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getUserByFarcasterFid(fid: string): Promise<ApiResponse<{
    exists: boolean;
    user?: User;
    activeCart?: Cart;
  }>> {
    try {
      const response = await this.client.get<ApiResponse<{
        exists: boolean;
        user?: User;
        activeCart?: Cart;
      }>>(`/user/farcaster/${fid}`);
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: {
          message: errorMessage || "An error occurred",
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async addWalletAddress(
    userId: string,
    walletAddress: string
  ): Promise<
    ApiResponse<{
      walletAddress: string;
      isNew: boolean;
      walletAddresses: string[];
      primaryWalletIndex: number;
    }>
  > {
    try {
      const response = await this.client.post<
        ApiResponse<{
          walletAddress: string;
          isNew: boolean;
          walletAddresses: string[];
          primaryWalletIndex: number;
        }>
      >(`/user/${userId}/wallet-address`, {
        walletAddress,
      });
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: {
          message: errorMessage || "An error occurred",
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Location API endpoints
  async searchLocation(
    request: SearchLocationRequest
  ): Promise<SearchLocationResponse> {
    try {
      const response = await this.client.get<SearchLocationResponse>(
        "/location/search",
        {
          params: request,
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: errorMessage || "An error occurred",
        timestamp: new Date().toISOString(),
      };
    }
  }

  async reverseGeocode(
    lat: number,
    lng: number,
    addressDetailsInfo: any
  ): Promise<
    ApiResponse<{
      location_info: {
        state: string;
        postal_code: string;
        city: string;
      };
      coordinates: { lat: number; lng: number };
      address_details_info: any;
    }>
  > {
    try {
      const response = await this.client.post<
        ApiResponse<{
          location_info: {
            state: string;
            postal_code: string;
            city: string;
          };
          coordinates: { lat: number; lng: number };
          address_details_info: any;
        }>
      >("/location/reverse-geocode", {
        lat,
        lng,
        address_details_info: addressDetailsInfo,
      });
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: {
          message: errorMessage || "An error occurred",
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Feed API endpoints
  async getFeed(request: {
    lat: number;
    lng: number;
    offset?: number;
    limit?: number;
    address?: AddressData;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get<ApiResponse<any>>("/feed", {
        params: {
          lat: request.lat,
          lng: request.lng,
          offset: request.offset || 0,
          limit: request.limit || 20,
          address: request.address ? JSON.stringify(request.address) : undefined,
        },
      });
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: { message: errorMessage || "An error occurred" } as {
          message: string;
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Search Items API endpoints
  async searchItems(request: SearchItemsRequest): Promise<SearchItemsResponse> {
    try {
      const response = await this.client.post<SearchItemsResponse>(
        "/search-items",
        request
      );
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: errorMessage || "An error occurred",
        timestamp: new Date().toISOString(),
      };
    }
  }

  async addToCart(request: AddToCartRequest): Promise<AddToCartResponse> {
    try {
      const response = await this.client.post<AddToCartResponse>(
        "/cart/create",
        request
      );
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: errorMessage || "An error occurred",
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getActiveCart(userId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get<ApiResponse<any>>(
        `/cart/active/${userId}`
      );
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: { message: errorMessage || "An error occurred" } as {
          message: string;
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async decrementProductQuantity(
    userId: string,
    productId: string,
    cartId: string
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.delete<ApiResponse<any>>(
        `/cart/product/decrement/${userId}/${cartId}/${productId}`
      );
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: { message: errorMessage || "An error occurred" } as {
          message: string;
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async incrementProductQuantity(
    userId: string,
    productId: string,
    cartId: string
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post<ApiResponse<any>>(
        `/cart/product/increment/${userId}/${cartId}/${productId}`
      );
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: { message: errorMessage || "An error occurred" } as {
          message: string;
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async removeProductFromCart(
    userId: string,
    productId: string,
    cartId: string
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get<ApiResponse<any>>(
        `/cart/product/remove/${userId}/${cartId}/${productId}`
      );
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: { message: errorMessage || "An error occurred" } as {
          message: string;
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async clearCart(userId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.delete<ApiResponse<any>>(
        `/cart/clear/${userId}`
      );
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: { message: errorMessage || "An error occurred" } as {
          message: string;
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getCartCheckoutDetails(
    userId: string,
    cartId: string,
    receiveAddress: AddressData
  ): Promise<ApiResponse<CheckoutCartResponse>> {
    try {
      const response = await this.client.post<
        ApiResponse<CheckoutCartResponse>
      >(`/cart/checkout/${userId}/${cartId}`, {
        receiveAddress,
      });
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: { message: errorMessage || "An error occurred" } as {
          message: string;
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  // Payment APIs
  async createRazorpayOrder(
    amount: number,
    cartId: string,
    currency: string = "INR"
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post<ApiResponse<any>>(
        "/payment/create-order",
        {
          amount,
          cartId,
          currency,
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: { message: errorMessage || "An error occurred" } as {
          message: string;
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async verifyPayment(
    razorpay_order_id: string,
    razorpay_payment_id: string,
    razorpay_signature: string
  ): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.post<ApiResponse<any>>(
        "/payment/verify",
        {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        }
      );
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: { message: errorMessage || "An error occurred" } as {
          message: string;
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getPaymentDetails(paymentId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get<ApiResponse<any>>(
        `/payment/${paymentId}`
      );
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: { message: errorMessage || "An error occurred" } as {
          message: string;
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  async verifyCryptoPayment(
    userId: string,
    txHash: string,
    expectedAmount: number
  ): Promise<
    ApiResponse<{
      txHash: string;
      sender: string;
      status: string;
      blockNumber: string;
    }>
  > {
    try {
      const response = await this.client.post<
        ApiResponse<{
          txHash: string;
          sender: string;
          status: string;
          blockNumber: string;
        }>
      >("/payment/verify-crypto", {
        userId,
        txHash,
        expectedAmount,
      });
      return this.handleResponse(response);
    } catch (error) {
      const errorMessage = await this.handleError(error);
      return {
        success: false,
        error: { message: errorMessage || "An error occurred" } as {
          message: string;
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
export const apiService = new ApiService();

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

  private async handleError(error: unknown): Promise<never> {
    let errorMessage = "An error occurred";

    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as {
        response?: { data?: { error?: { message?: string } } };
      };
      errorMessage = axiosError.response?.data?.error?.message || errorMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
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
      return this.handleError(error);
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
      return this.handleError(error);
    }
  }

  async addWalletAddress(
    userId: string,
    walletAddress: string
  ): Promise<ApiResponse<{ walletAddress: string; isNew: boolean; walletAddresses: string[]; primaryWalletIndex: number }>> {
    try {
      const response = await this.client.post<
        ApiResponse<{ walletAddress: string; isNew: boolean; walletAddresses: string[]; primaryWalletIndex: number }>
      >(`/user/${userId}/wallet-address`, {
        walletAddress,
      });
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
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
      return this.handleError(error);
    }
  }

  async reverseGeocode(
    lat: number,
    lng: number,
    addressDetailsInfo: any
  ): Promise<ApiResponse<{
    location_info: {
      state: string;
      postal_code: string;
      city: string;
    };
    coordinates: { lat: number; lng: number };
    address_details_info: any;
  }>> {
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
      return this.handleError(error);
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
      return this.handleError(error);
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
      return this.handleError(error);
    }
  }

  async getActiveCart(userId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get<ApiResponse<any>>(
        `/cart/active/${userId}`
      );
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
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
      return this.handleError(error);
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
      return this.handleError(error);
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
      return this.handleError(error);
    }
  }

  async clearCart(userId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.delete<ApiResponse<any>>(
        `/cart/clear/${userId}`
      );
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
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
      return this.handleError(error);
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
      return this.handleError(error);
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
      return this.handleError(error);
    }
  }

  async getPaymentDetails(paymentId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.client.get<ApiResponse<any>>(
        `/payment/${paymentId}`
      );
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async verifyCryptoPayment(
    userId: string,
    txHash: string,
    expectedAmount: number
  ): Promise<ApiResponse<{ txHash: string; sender: string; status: string; blockNumber: string }>> {
    try {
      const response = await this.client.post<
        ApiResponse<{ txHash: string; sender: string; status: string; blockNumber: string }>
      >("/payment/verify-crypto", {
        userId,
        txHash,
        expectedAmount,
      });
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }
}
export const apiService = new ApiService();

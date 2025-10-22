import axios, { AxiosResponse } from 'axios';
import {
  RegisterUserRequest,
  RegisterUserResponse,
  SearchLocationRequest,
  SearchLocationResponse,
  SearchItemsRequest,
  SearchItemsResponse,
  ApiResponse,
  User
} from '@/types';

const API_BASE_URL = 'http://localhost:4000/api';

class ApiService {
  private client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  private async handleResponse<T>(response: AxiosResponse<T>): Promise<T> {
    return response.data;
  }

  private async handleError(error: unknown): Promise<never> {
    let errorMessage = 'An error occurred';
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { data?: { error?: { message?: string } } } };
      errorMessage = axiosError.response?.data?.error?.message || errorMessage;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }

  // User API endpoints
  async registerUser(data: RegisterUserRequest): Promise<RegisterUserResponse> {
    try {
      const response = await this.client.post<RegisterUserResponse>('/user/register', data);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  async getUserProfile(userId: string): Promise<ApiResponse<User>> {
    try {
      const response = await this.client.get<ApiResponse<User>>(`/user/${userId}`);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Location API endpoints
  async searchLocation(request: SearchLocationRequest): Promise<SearchLocationResponse> {
    try {
      const response = await this.client.get<SearchLocationResponse>('/location/search', {
        params: request
      });
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }

  // Search Items API endpoints
  async searchItems(request: SearchItemsRequest): Promise<SearchItemsResponse> {
    try {
      const response = await this.client.post<SearchItemsResponse>('/search-items', request);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export const apiService = new ApiService();

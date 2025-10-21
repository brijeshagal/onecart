import axios, { AxiosResponse } from 'axios';
import {
  RegisterUserRequest,
  RegisterUserResponse,
  SearchLocationRequest,
  SearchLocationResponse,
  ApiResponse,
  User
} from '@/types';

const API_BASE_URL = '/api';

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

  private async handleError(error: any): Promise<never> {
    const errorMessage = error.response?.data?.error?.message || error.message || 'An error occurred';
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
      const response = await this.client.post<SearchLocationResponse>('/search-location', request);
      return this.handleResponse(response);
    } catch (error) {
      return this.handleError(error);
    }
  }
}

export const apiService = new ApiService();

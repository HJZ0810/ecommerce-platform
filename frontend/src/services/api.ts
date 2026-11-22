/**
 * API 请求封装
 * API Request Wrapper
 *
 * @description 统一封装 axios 请求，包含认证令牌、错误处理、请求拦截
 *              Wraps axios with auth token, error handling, interceptors
 * @module services/api
 */

import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import toast from 'react-hot-toast';

/**
 * API 客户端配置
 * @type {import('axios').AxiosInstance}
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 请求拦截器 - 添加认证令牌
 * Request interceptor - add auth token
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 从 localStorage 获取 token / Get token from localStorage
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加客户端 ID / Add client ID
    config.headers['X-Client-Id'] = 'web';

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * 响应拦截器 - 处理错误
 * Response interceptor - handle errors
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Token 过期，尝试刷新 / Token expired, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || '/api/v1'}/auth/refresh`,
          { refresh_token: refreshToken }
        );

        const newToken = response.data.data.access_token;
        localStorage.setItem('access_token', newToken);

        // 重试原请求 / Retry original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return apiClient(originalRequest);
      } catch {
        // 刷新失败，清除凭证并跳转到登录页 / Refresh failed, clear credentials and redirect
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // 显示错误提示 / Show error notification
    const errorMessage = error.response?.data?.error || '请求失败 / Request failed';
    const errorMessageZh = error.response?.data?.error_zh || errorMessage;

    if (error.response?.status !== 401) {
      toast.error(`${errorMessageZh} (${error.response?.status || 'Network Error'})`);
    }

    return Promise.reject(error);
  }
);

/**
 * 通用 API 请求方法
 * Generic API request methods
 */
export const api = {
  /**
   * GET 请求 / GET request
   */
  get: async <T = any>(url: string, config?: any): Promise<T> => {
    const response = await apiClient.get(url, config);
    return response.data;
  },

  /**
   * POST 请求 / POST request
   */
  post: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const response = await apiClient.post(url, data, config);
    return response.data;
  },

  /**
   * PUT 请求 / PUT request
   */
  put: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const response = await apiClient.put(url, data, config);
    return response.data;
  },

  /**
   * DELETE 请求 / DELETE request
   */
  delete: async <T = any>(url: string, config?: any): Promise<T> => {
    const response = await apiClient.delete(url, config);
    return response.data;
  },

  /**
   * PATCH 请求 / PATCH request
   */
  patch: async <T = any>(url: string, data?: any, config?: any): Promise<T> => {
    const response = await apiClient.patch(url, data, config);
    return response.data;
  },
};

export default apiClient;

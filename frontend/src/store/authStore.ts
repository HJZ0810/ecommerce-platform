/**
 * 全局状态管理 - Auth Store
 * Global State Management - Auth Store
 *
 * @description 管理用户认证状态、登录、登出、令牌刷新
 *              Manages authentication state, login, logout, token refresh
 * @module store/authStore
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User } from '@/types/user.types';

/**
 * 认证状态接口
 * @interface AuthState
 */
interface AuthState {
  /** 当前认证用户 / Current authenticated user */
  user: User | null;
  /** 是否正在加载 / Loading state */
  isLoading: boolean;
  /** 是否已认证 / Whether authenticated */
  isAuthenticated: boolean;
}

/**
 * 认证操作接口
 * @interface AuthActions
 */
interface AuthActions {
  /** 设置用户 / Set user */
  setUser: (user: User) => void;
  /** 清除用户 / Clear user */
  clearUser: () => void;
  /** 设置加载状态 / Set loading */
  setLoading: (loading: boolean) => void;
  /** 更新用户资料 / Update user profile */
  updateUser: (updates: Partial<User>) => void;
}

/**
 * 认证 Store
 * @type {AuthState & AuthActions}
 */
export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // 初始状态 / Initial state
      user: null,
      isLoading: false,
      isAuthenticated: false,

      // Actions / 操作
      setUser: (user: User) => {
        set({
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      clearUser: () => {
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...updates },
          });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

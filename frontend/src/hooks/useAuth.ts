import { useMutation } from "@tanstack/react-query";
import type { AxiosError } from "axios";
import toast from "react-hot-toast";

import { axiosClient } from "../lib/axios";
import { useAuthStore, type AuthUser } from "../store/authStore";

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload extends LoginPayload {
  full_name: string;
}

interface AuthApiResponse {
  user: AuthUser;
  tokens: {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    refresh_expires_in: number;
  };
}

function getApiErrorMessage(error: unknown): string {
  const axiosError = error as AxiosError<{ detail?: string; message?: string }>;
  return axiosError.response?.data?.message ?? axiosError.response?.data?.detail ?? "Authentication request failed.";
}

export function useAuth() {
  const loginAction = useAuthStore((state) => state.login);
  const logoutAction = useAuthStore((state) => state.logout);

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const response = await axiosClient.post<AuthApiResponse>("/auth/login", payload);
      return response.data;
    },
    onSuccess: (data) => {
      loginAction(data.user, data.tokens.access_token);
      localStorage.setItem("token", data.tokens.access_token);
      toast.success("Welcome back.");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error));
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const response = await axiosClient.post<AuthApiResponse>("/auth/register", payload);
      return response.data;
    },
    onSuccess: (data) => {
      loginAction(data.user, data.tokens.access_token);
      localStorage.setItem("token", data.tokens.access_token);
      toast.success("Account created successfully.");
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error));
    }
  });

  const logout = async () => {
    try {
      await axiosClient.post("/auth/logout");
    } catch {
      // ignore network/logout API failures, local logout still applies
    } finally {
      logoutAction();
      localStorage.removeItem("token");
      toast.success("Logged out.");
    }
  };

  return {
    loginMutation,
    registerMutation,
    logout
  };
}

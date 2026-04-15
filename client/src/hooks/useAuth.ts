import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";

interface AuthState {
  loading: boolean;
  authenticated: boolean;
  needsSetup: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    loading: true,
    authenticated: false,
    needsSetup: false,
  });

  const checkAuth = useCallback(async () => {
    try {
      const data = await api.get<{ needsSetup: boolean; authenticated: boolean }>(
        "/api/auth/status",
      );
      setState({
        loading: false,
        authenticated: data.authenticated,
        needsSetup: data.needsSetup,
      });
    } catch {
      setState({ loading: false, authenticated: false, needsSetup: true });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const setup = useCallback(async (password: string) => {
    await api.post("/api/auth/setup", { password });
    setState((s) => ({ ...s, authenticated: true, needsSetup: false }));
  }, []);

  const login = useCallback(async (password: string) => {
    await api.post("/api/auth/login", { password });
    setState((s) => ({ ...s, authenticated: true }));
  }, []);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    setState((s) => ({ ...s, authenticated: false }));
  }, []);

  return { ...state, setup, login, logout };
}

import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  getUserDetails,
  postSignInRequest,
  postLogoutRequest,
  postSignUpRequest,
} from "../api/authentication";
import { AuthState } from "../types/index";

const initialAuthState: AuthState = {
  currentUser: null,
  isAuthenticated: false,
  checkedAuth: false,
  error: "",
  signUp: async () => {},
  signIn: async () => {},
  logout: async () => {},
  checkAuthStatus: async () => {},
};

export const AuthContext = createContext<AuthState>(initialAuthState);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = (props: AuthProviderProps) => {
  const [authState, setAuthState] = useState<AuthState>(initialAuthState);

  const signUp = useCallback(
    async (
      firstName: string,
      lastName: string,
      email: string,
      password: string
    ) => {
      const response = await postSignUpRequest(
        firstName,
        lastName,
        email,
        password
      );
      setAuthState((oldValues) => {
        return {
          ...oldValues,
          currentUser: response.user,
          isAuthenticated: true,
        };
      });
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await postSignInRequest(email, password);

    setAuthState((oldValues) => {
      return {
        ...oldValues,
        currentUser: response.user,
        isAuthenticated: true,
      };
    });
  }, []);

  const logout = useCallback(async () => {
    console.log("logout");
    const response = await postLogoutRequest();
    setAuthState((oldValues) => {
      return { ...oldValues, currentUser: null, isAuthenticated: false };
    });
  }, []);

  const checkAuthStatus = useCallback(async () => {
    console.log("checkAuthStatus");
    const response = await getUserDetails();
    console.log("response:", response);

    if (response.user) {
      setAuthState((oldValues) => {
        return {
          ...oldValues,
          currentUser: response.user,
          isAuthenticated: true,
          checkedAuth: true,
        };
      });
    } else {
      setAuthState((oldValues) => {
        return {
          ...oldValues,
          currentUser: null,
          isAuthenticated: false,
          checkedAuth: true,
        };
      });
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      ...authState,
      signUp,
      signIn,
      logout,
      checkAuthStatus,
    }),
    [authState, signUp, signIn, logout, checkAuthStatus]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {props.children}
    </AuthContext.Provider>
  );
};

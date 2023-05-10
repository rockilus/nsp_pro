import {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  postSignInRequest,
  postLogoutRequest,
  postSignUpRequest,
} from "../api/authentication";

interface AuthState {
  currentUser: Record<string, string> | null;
  isAuthenticated: boolean;
  error?: string;
  signUp: (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const initialAuthState: AuthState = {
  currentUser: null,
  isAuthenticated: false,
  error: "",
  signUp: async () => {},
  signIn: async () => {},
  logout: async () => {},
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
      return { ...oldValues, currentUser: {}, isAuthenticated: false };
    });
  }, []);

  const contextValue = useMemo(
    () => ({
      ...authState,
      signUp,
      signIn,
      logout,
    }),
    [authState, signUp, signIn, logout]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {props.children}
    </AuthContext.Provider>
  );
};

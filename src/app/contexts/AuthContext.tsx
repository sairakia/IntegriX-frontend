import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import axios from "axios";
import { clearStoredTokens } from "../api/authTokens";
import { API_BASE_URL, getApiErrorMessage } from "../api/config";

interface User {
  id: string;
  userId: string;
  email: string;
  name: string;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  login: (userId: string, password: string) => Promise<boolean>;
  signup: (
    email: string,
    password: string,
    name: string,
    userId: string
  ) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  updateProfileImage: (imageUrl: string) => void;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  refreshTokenExpiresIn: number;
  user: User;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const syncAuthState = async () => {
      localStorage.removeItem("user");
      clearStoredTokens();

      try {
        const currentUser = await fetchCurrentUser();

        if (currentUser) {
          setUser(currentUser);
          sessionStorage.setItem("user", JSON.stringify(currentUser));
          return;
        }

        const refreshedUser = await refreshTokenAndFetchUser();
        if (refreshedUser) {
          setUser(refreshedUser);
          sessionStorage.setItem("user", JSON.stringify(refreshedUser));
          return;
        }
      } catch {
        clearStoredTokens();
      }

      setUser(null);
      sessionStorage.removeItem("user");
    };

    syncAuthState();
  }, []);

  const fetchCurrentUser = async () => {
    const response = await axios.get<ApiResponse<User>>(`${API_BASE_URL}/user/me`);

    const data = response.data;
    return data.success && data.data ? data.data : null;
  };

  const refreshTokenAndFetchUser = async () => {
    const response = await axios.post<ApiResponse<TokenResponse>>(
      `${API_BASE_URL}/user/refresh`,
      {}
    );

    const data = response.data;
    if (!data.success || !data.data) {
      clearStoredTokens();
      return null;
    }

    return data.data.user;
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    userId: string
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await axios.post<ApiResponse<TokenResponse>>(
        `${API_BASE_URL}/user/signup`,
        {
          email,
          password,
          name,
          userId,
        }
      );

      const data = response.data;

      if (!data.success || !data.data) {
        return { success: false, message: data.message || "회원가입에 실패했습니다." };
      }

      setUser(data.data.user);
      sessionStorage.setItem("user", JSON.stringify(data.data.user));

      return { success: true };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          return { success: false, message: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요." };
        }
        return { success: false, message: getApiErrorMessage(error.response.data, "회원가입에 실패했습니다.") };
      }
      return { success: false, message: "회원가입 처리 중 오류가 발생했습니다." };
    }
  };

  const login = async (userId: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post<ApiResponse<TokenResponse>>(
        `${API_BASE_URL}/user/login`,
        {
          userId,
          password,
        }
      );

      const data = response.data;

      if (!data.success || !data.data) {
        return false;
      }

      setUser(data.data.user);
      sessionStorage.setItem("user", JSON.stringify(data.data.user));

      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    axios.post(`${API_BASE_URL}/user/logout`, {}).catch(() => undefined);

    setUser(null);
    sessionStorage.removeItem("user");
    localStorage.removeItem("user");
    clearStoredTokens();
  };

  const updateProfileImage = (imageUrl: string) => {
    if (!user) return;

    const updatedUser: User = {
      ...user,
      profileImage: imageUrl,
    };

    setUser(updatedUser);
    sessionStorage.setItem("user", JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        logout,
        isAuthenticated: !!user,
        updateProfileImage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

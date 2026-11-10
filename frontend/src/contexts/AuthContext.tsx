import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: number | string;
  email: string;
  nombre?: string;
  apellido?: string;
  rol?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: () => {},
  signOut: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("classkids_token");
    const storedUser = localStorage.getItem("classkids_user");

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as User;
        setToken(storedToken);
        setUser(parsedUser);
      } catch (e) {
        console.error("Error parsing stored user", e);
        localStorage.removeItem("classkids_token");
        localStorage.removeItem("classkids_user");
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, userData: User) => {
    setToken(newToken);
    setUser(userData);
    localStorage.setItem("classkids_token", newToken);
    localStorage.setItem("classkids_user", JSON.stringify(userData));
  };

  const signOut = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("classkids_token");
    localStorage.removeItem("classkids_user");
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
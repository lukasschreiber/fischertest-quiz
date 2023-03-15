import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

export function RequireAuth({ children }) {
    const { authed } = useAuth();
    const location = useLocation();
  
    return authed !== "" ? (
      children
    ) : (
      <Navigate to="/" replace state={{ path: location.pathname }} />
    );
  }
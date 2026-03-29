import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.js";

/**
 * Handles OAuth callback from CoinPay.
 * Receives JWT token via query param and stores it in auth context.
 */
export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setTokenDirectly } = useAuth();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      navigate(`/login?error=${error}`, { replace: true });
      return;
    }

    if (token) {
      setTokenDirectly(token);
      navigate("/", { replace: true });
    } else {
      navigate("/login?error=no_token", { replace: true });
    }
  }, [searchParams, navigate, setTokenDirectly]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent"></div>
        <p className="mt-4 text-sm text-gray-600">Completing sign in...</p>
      </div>
    </div>
  );
}

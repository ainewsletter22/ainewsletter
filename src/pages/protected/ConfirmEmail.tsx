import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authService } from "../../store/authService";
import Logo from "../../components/Logo";

export default function ConfirmEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Invalid verification link.");
        return;
      }

      try {
        await authService.confirmEmail(token);
        setStatus("success");
        setMessage("Email confirmed successfully! You can now log in.");
      } catch (err: any) {
        setStatus("error");
        setMessage(err.response?.data?.message || "Verification failed.");
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center px-4">
      <div className="mb-8">
        <Logo />
      </div>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-10 text-center">
        {status === "loading" && (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
        )}
        {status === "success" && (
          <div className="text-green-500 text-5xl mb-4">check_circle</div>
        )}
        {status === "error" && (
          <div className="text-red-500 text-5xl mb-4">error</div>
        )}
        
        <h2 className="text-xl font-bold text-gray-900 mb-2">Email Verification</h2>
        <p className="text-gray-600 mb-6">{message}</p>

        {status !== "loading" && (
          <button
            onClick={() => navigate("/signIn")}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition-colors"
          >
            Go to Login
          </button>
        )}
      </div>
    </div>
  );
}
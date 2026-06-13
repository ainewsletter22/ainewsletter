import { useState } from "react";
import Logo from "../../components/Logo";
import { useNavigate } from "react-router-dom";
import bottomBluePattern from '../../assets/bottomBluePattern.svg'
import signupImg from '../../assets/signupImg.png'
import user from '../../assets/user.svg'
import email from '../../assets/email.svg'
import view from '../../assets/transparency.svg'
import unview from '../../assets/noTransparency.svg'
import { authService } from "../../store/authService";

function SignUp() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    terms: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.terms) {
      setError("You must agree to the Terms & Conditions.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await authService.register(formData);
      setSuccess(res.data.message || "Registration successful! Please check your email.");
      // Optionally clear form
      setFormData({ firstName: '', lastName: '', email: '', password: '', terms: false });
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col">
      <header className="px-8 py-5">
        <Logo />
      </header>
 
      <div className="flex-1 flex items-center justify-center py-8 ">
        <div className="flex w-full max-w-7xl items-center justify-center gap-25 px-4">
          {/* Left: promo illustration */}
          <div className="hidden md:flex flex-1 items-center justify-center relative">
            <img src={signupImg} alt="" />
          </div>
 
          {/* Right: form */}
          <form onSubmit={handleSubmit} className="flex-1 max-w-md">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              Create Your Account
            </h1>
 
            {/* Notifications */}
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-600 text-xs rounded-lg text-center font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-green-100 border border-green-200 text-green-600 text-xs rounded-lg text-center font-medium">
                {success}
              </div>
            )}

            {/* First / Last */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  First Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Name"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 pr-8"
                  />
                  <img className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 h-auto w-5" src={user} alt="" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Last Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last Name"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 pr-8"
                  />
                  <img className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 h-auto w-5" src={user} alt="" />
                </div>
              </div>
            </div>
 
            {/* Email */}
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Email
            </label>
            <div className="relative mb-4">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Myemail.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 pr-8"
              />
              <img className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 h-auto w-5" src={email} alt="" />
            </div>
 
            {/* Password */}
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Password
            </label>
            <div className="relative mb-4">
              <input
                type={showPass ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 pr-8"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 h-auto w-5"
              >
                {showPass ? (
                  <img className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 h-auto w-5" src={view} alt="" />
                ) : (
                  <img className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 h-auto w-5" src={unview} alt="" />
                )}
              </button>
            </div>
 
            {/* Terms */}
            <label className="flex items-start gap-2 text-xs text-gray-500 mb-5 cursor-pointer">
              <input 
                type="checkbox" 
                name="terms"
                checked={formData.terms}
                onChange={handleChange}
                className="mt-0.5 rounded" 
              />
              <span>
                I agree to the{" "}
                <span className="text-blue-500 hover:underline cursor-pointer">
                  Privacy Policy
                </span>{" "}
                and{" "}
                <span className="text-blue-500 hover:underline cursor-pointer">
                  Terms &amp; Conditions
                </span>{" "}
                of this platform.
              </span>
            </label>
 
            <div className="flex flex-col md:flex-row items-center">
              <button 
                type="submit"
                disabled={isLoading}
                className="w-1/2 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mb-3 disabled:opacity-50"
              >
                {isLoading ? "Creating..." : "Create Account"}
              </button>
  
              <p className="inline-block w-1/2 text-center text-xs text-gray-500">
                Already a member?{" "}
                <button
                  onClick={() => navigate("/signIn")}
                  className="text-blue-500 font-semibold hover:underline"
                >
                  Login
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
 
      {/* Footer wave */}
      <div className="h-10 relative overflow-hidden">
        <img src={bottomBluePattern} className="w-full h-full object-cover" alt="" />
      </div>
    </div>
  );
}

export default SignUp;
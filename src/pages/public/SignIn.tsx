import { useState } from "react";
import Logo from "../../components/Logo";
import { useNavigate } from "react-router-dom";
import bottomBluePattern from '../../assets/bottomBluePattern.svg'
import email from '../../assets/email.svg'
import view from '../../assets/transparency.svg'
import unview from '../../assets/noTransparency.svg'
import signInChatBubbleOne from '../../assets/signInChatBubbleOne.png'
import signInChatBubbleTwo from '../../assets/signInChatBubbleTwo.svg'
import signInChatBubbleThree from '../../assets/signInChatBubbleThree.svg'

function SignIn() {
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Sign In Data:', formData);
  };

  return (
    <div className="min-h-screen flex flex-col bg-blue-50">
      
      {/* Header */}
      <header className="px-8 pt-8 flex items-center justify-center">
        <Logo />
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center relative px-4 py-10">
        

        {/* Card */}
        <div className="w-full relative max-w-lg bg-gray-200 rounded-2xl shadow-2xl px-15 py-15 z-10">

          
        {/* Bubble One — left middle */}
        <img
          src={signInChatBubbleTwo}
          alt=""
          className="absolute -left-50 top-1/3 -translate-y-1/2 w-48 pointer-events-none select-none"
        />

        {/* Bubble Two — top right */}
        <img
          src={signInChatBubbleOne}
          alt=""
          className="absolute -right-50 -top-4 w-44 pointer-events-none select-none"
        />

        {/* Bubble Three — bottom right */}
        <img
          src={signInChatBubbleThree}
          alt=""
          className="absolute -right-30 -bottom-20 w-48 pointer-events-none select-none"
        />

          {/* WELCOME BACK + title above the card */}
          <p className="text-center text-black text-xs font-semibold tracking-widest uppercase ">
            WELCOME BACK
          </p>
          <div className="flex items-end justify-center mb-6">
            <h1 className="text-center font-bold text-3xl text-black">
              Sign in to continue
            </h1>
            <span className="h-2.5 w-2.5 bg-red-400 rounded-full inline-block ml-1 mb-1" />
          </div>

          {/* Email */}
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Email
          </label>
          <div className="relative mb-4">
            <input
              type="email"
              name="email"
              placeholder="myemail.com"
              value={formData.email}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
            />
            <img
              className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4"
              src={email}
              alt=""
            />
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
              placeholder="••••••••••"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <img
                className="h-4 w-4"
                src={showPass ? view : unview}
                alt="toggle password"
              />
            </button>
          </div>

          {/* Forgot / Get Started row */}
          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={() => navigate("/forgotPassword")}
              className="flex items-center gap-1.5 text-xs text-red-500 font-semibold"
            >
              <span className="h-2 w-2 bg-red-500 rounded-full inline-block" />
              Forgot Password
            </button>
            <p className="text-xs text-gray-500">
              Not a member?{" "}
              <button
                type="button"
                onClick={() => navigate("/signUp")}
                className="text-blue-500 font-semibold hover:underline"
              >
                Get Started
              </button>
            </p>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            Sign In
          </button>
        </div>
      </div>

      {/* Footer wave */}
      <div className="relative overflow-hidden">
        <img src={bottomBluePattern} className="w-full" alt="" />
      </div>
    </div>
  );
}

export default SignIn;
import { useState } from "react";
import Logo from "../../components/Logo";
import { useNavigate } from "react-router-dom";
import bottomBluePattern from '../../assets/bottomBluePattern.svg';
import email from '../../assets/email.svg';
import view from '../../assets/transparency.svg';
import unview from '../../assets/noTransparency.svg';
import forgotImg from '../../assets/forgotPasswordHero.svg'; // the right-hand promo image (same across steps 1–3)

// Lock icon — reused across all steps
function LockIcon() {
  return (
    <div className="flex justify-center mb-4">
      <div className="w-12 h-12 rounded-full border-2 border-blue-300 flex items-center justify-center bg-white">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke="#3B82F6" strokeWidth="1.5" />
          <path d="M8 11V7a4 4 0 018 0v4" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="12" cy="16" r="1.5" fill="#3B82F6" />
          <path d="M12 17.5v1.5" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

type Step = 1 | 2 | 3 | 4;

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [emailVal, setEmailVal] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isLastStep = step === 4;

  return (
    <div className="h-screen bg-blue-50 flex flex-col">

      {/* ── Header ── */}
      <header className={`px-8 pt-20 flex ${isLastStep ? 'justify-center' : 'justify-start'}`}>
        <Logo />
      </header>

      {/* ── Main ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">

        {/* Step 4: centered card, no right panel */}
        {isLastStep ? (
          <div className="w-full max-w-md bg-white rounded-2xl shadow-sm px-15 py-15 text-center">
            <LockIcon />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Password Reset Successful
            </h2>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              Your password has been reset successfully.<br />
              Click the link below for instant access.
            </p>
            <button
              onClick={() => navigate('/signIn')}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            >
              Continue <span className="text-base">→</span>
            </button>
          </div>

        ) : (
          /* Steps 1–3: left form card + right promo image */
          <div className="flex w-full max-w-7xl items-center gap-16">

            {/* ── Left: form card ── */}
            <div className="flex-1 max-w-lg">
              <div className="bg-white rounded-2xl shadow-sm px-15 py-15">

                <LockIcon />

                {/* ── Step 1: Forgot Password ── */}
                {step === 1 && (
                  <>
                    <h2 className="text-center text-xl font-bold text-gray-900 mb-1">
                      Forgot your Password
                    </h2>
                    <p className="text-center text-xs text-gray-400 mb-6">
                      we'll send you reset instructions
                    </p>

                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <div className="relative mb-6">
                      <input
                        type="email"
                        placeholder="Myemail.com"
                        value={emailVal}
                        onChange={e => setEmailVal(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 pr-9"
                      />
                      <img
                        src={email}
                        alt=""
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep(2)}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => navigate('/signIn')}
                        className="flex-1 border border-blue-400 text-blue-500 font-semibold py-2.5 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                      >
                        Back to login
                      </button>
                    </div>
                  </>
                )}

                {/* ── Step 2: Check Email ── */}
                {step === 2 && (
                  <>
                    <h2 className="text-center text-xl font-bold text-gray-900 mb-1">
                      Check your email
                    </h2>
                    <p className="text-center text-xs text-gray-400 mb-6">
                      We sent a password reset link to, your@email.com
                    </p>

                    <button
                      onClick={() => setStep(3)}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm mb-3"
                    >
                      Didn't receive the email, Click To Resend
                    </button>
                    <button
                      onClick={() => navigate('/signIn')}
                      className="w-full border border-gray-200 text-gray-600 font-semibold py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      Back to login
                    </button>
                  </>
                )}

                {/* ── Step 3: Create New Password ── */}
                {step === 3 && (
                  <>
                    <h2 className="text-center text-xl font-bold text-gray-900 mb-1">
                      Create New Password
                    </h2>
                    <p className="text-center text-xs text-gray-400 mb-5 leading-relaxed">
                      Your New Password must be different to<br />your previous passwords.
                    </p>

                    {/* Password */}
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-medium text-gray-600">Password</label>
                      <span className="text-xs text-blue-500">Must be at least 8 characters</span>
                    </div>
                    <div className="relative mb-4">
                      <input
                        type={showPass ? "text" : "password"}
                        placeholder="* * * * * * * * *"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <img className="h-4 w-4" src={showPass ? view : unview} alt="toggle" />
                      </button>
                    </div>

                    {/* Confirm Password */}
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative mb-6">
                      <input
                        type={showConfirm ? "text" : "password"}
                        placeholder="* * * * * * * * *"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <img className="h-4 w-4" src={showConfirm ? view : unview} alt="toggle" />
                      </button>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setStep(4)}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => navigate('/signIn')}
                        className="flex-1 border border-blue-400 text-blue-500 font-semibold py-2.5 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                      >
                        Back to login
                      </button>
                    </div>
                  </>
                )}

              </div>
            </div>

            {/* ── Right: promo image (same across steps 1–3) ── */}
            <div className="hidden md:flex flex-1 items-center justify-center">
              <img
                src={forgotImg}
                alt="promo"
                className="w-full rounded-2xl object-cover"
              />
            </div>

          </div>
        )}
      </div>

      {/* ── Footer wave ── */}
      <div className="relative overflow-hidden">
        <img src={bottomBluePattern} className="w-full" alt="" />
      </div>
    </div>
  );
}

export default ForgotPassword;
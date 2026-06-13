import logo from '../assets/mainLogo.png'

function Logo({ dark = false }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-11 h-11 rounded-lg flex items-center justify-center">
       <img src={logo} alt="" />
      </div>
      <span
        className={`font-bold text-xl sm:text-3xl ${
          dark ? "text-white" : "text-gray-600"
        }`}
      >
        Ai Newsletter
      </span>
    </div>
  );
}

export default Logo;
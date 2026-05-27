import heroBannerImg from "../assets/dashboardHero.png"; // the woman with tablet image
import bird from "../assets/bird.png"; // the woman with tablet image

interface HeroBannerProps {
  userName?: string;
  onWatchVideo?: () => void;
  onViewMap?: () => void;
}

export default function HeroBanner({
  userName = "Jamson",
  onWatchVideo,
  onViewMap,
}: HeroBannerProps) {
  return (
    <div className="w-full bg-gray-900 rounded-2xl overflow-hidden flex flex-col-reverse md:flex-row justify-center md:gap-20 min-h-8 pt-6 md:pt-10 relative">

      {/* Left: illustration / promo image */}
      <div className="w-full md:w-105 h-48 md:h-auto relative shrink-0 flex items-end justify-center md:hidden lg:block mt-4 md:mt-0">
        <img
          src={heroBannerImg}
          alt="promo"
          className="h-full md:h-auto md:absolute md:inset-0 object-cover object-top"
        />
      </div>

      {/* Right: welcome copy */}
      <div className="w-full md:w-fit flex flex-col items-center md:items-start text-center md:text-left justify-center px-4 md:px-10 py-6 md:py-8">
        <div className="flex items-center gap-2 mb-2 relative">
          {/* Pencil/wand icon */}
          <img src={bird} className="hidden md:block absolute -top-10 -left-20" alt="" />
          <h2 className="text-white text-xl md:text-2xl font-bold">Welcome, {userName}</h2>
        </div>

        <p className="text-gray-300 text-sm leading-relaxed mb-6 max-w-xs mx-auto md:mx-0">
          Your New account setup is complete. You can start by watching our video tutorials.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button
            onClick={onWatchVideo}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            Watch Tutorial Video
          </button>
          <button
            onClick={onViewMap}
            className="w-full sm:w-auto text-gray-300 text-sm md:text-md font-medium transition-colors hover:underline underline-offset-2 opacity-50"
          >
            View Clients On Google Map
          </button>
        </div>
      </div>
    </div>
  );
}
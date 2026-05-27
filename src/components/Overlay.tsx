function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="relative w-full flex justify-center items-center">{children}</div>
    </div>
  );
}

export default Overlay;

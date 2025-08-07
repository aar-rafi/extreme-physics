const SpaceBackground = () => {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden starfield">
      <div className="space-orb w-[40vw] h-[40vw] left-[-10vw] top-[-10vw] rounded-full bg-gradient-hero animate-[orb_14s_ease-in-out_infinite]" />
      <div className="space-orb w-[30vw] h-[30vw] right-[-8vw] top-[10vh] rounded-full bg-gradient-hero animate-[orb_18s_ease-in-out_infinite]" />
      <div className="space-orb w-[25vw] h-[25vw] left-[30vw] bottom-[-10vw] rounded-full bg-gradient-hero animate-[orb_20s_ease-in-out_infinite]" />
    </div>
  );
};

export default SpaceBackground;

const VerticalEthereal = () => {
  return (
    <div
      aria-hidden="true"
      className="absolute left-0 top-0 h-full z-0 pointer-events-none overflow-hidden"
    >
      <div className="sticky top-0 h-screen flex items-center">
        <div className="writing-vertical-lr font-ethereal font-black tracking-[0.55em] text-foreground/15 select-none whitespace-nowrap text-[45vw] sm:text-[35vw] md:text-[25vw] lg:text-[18vw]">
          ETHEREAL
        </div>
      </div>
    </div>
  );
};

export default VerticalEthereal;

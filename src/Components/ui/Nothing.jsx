import doodlepr from "/doodlepr.png?url";
function Nothing() {
  return (
    <div className="relative  hidden lg:flex flex-col bg-[#EEDEB3] justify-between flex-2  h-[100dvh] w-[100dvw]">
      <div
        className="absolute inset-0 bg-repeat z-0 mr-2"
        style={{
          backgroundImage: `url(${doodlepr})`,
          backgroundSize: "auto",
          backgroundPosition: "top left",
          opacity: 0.5,
        }}
      />
      <div className="w-full h-full flex justify-center items-center text-3xl font-semibold">Start your conversation first</div>
    </div>
  );
}

export default Nothing;

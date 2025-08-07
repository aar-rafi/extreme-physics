const TwoBodyExternal = () => {
  return (
    <main className="container mx-auto py-10">
      <div className="rounded-xl border bg-card p-2 md:p-4">
        <div className="aspect-[16/9] w-full rounded-lg bg-muted/20 overflow-hidden">
          <iframe
            title="Two-Body Simulation"
            src="/2body/index.html"
            className="w-full h-full"
          />
        </div>
      </div>
    </main>
  );
};

export default TwoBodyExternal;



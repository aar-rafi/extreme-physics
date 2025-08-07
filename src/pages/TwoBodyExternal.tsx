import { useEffect } from "react";

const TwoBodyExternal = () => {
  useEffect(() => {
    // Redirect so the external page can use the full window
    window.location.replace("/2body/index.html");
  }, []);

  return (
    <main className="container mx-auto py-10">
      <p className="text-muted-foreground">Loading two-body simulation…</p>
    </main>
  );
};

export default TwoBodyExternal;



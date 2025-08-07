import { useEffect } from "react";

const ProjectileExternal = () => {
  useEffect(() => {
    window.location.replace("/projectile/index.html");
  }, []);

  return (
    <main className="container mx-auto py-10">
      <p className="text-muted-foreground">Loading projectile simulation…</p>
    </main>
  );
};

export default ProjectileExternal;



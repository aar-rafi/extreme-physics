import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import physicsHero from "@/assets/physics-hero.jpg";

const Hero = () => {
  return (
    <header className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero opacity-25" aria-hidden="true" />
      <div className="container mx-auto grid gap-8 lg:grid-cols-2 items-center py-16 lg:py-24">
        <div>
          <p className="text-sm tracking-widest uppercase text-muted-foreground mb-3">Modern Browser Lab</p>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-4">
            Interactive Physics Simulations
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Explore accurate, real‑time simulations of projectile motion and the two‑body problem.
            Tweak parameters, visualize trajectories, and build intuition.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button asChild variant="hero" size="xl">
              <Link to="/projectile" aria-label="Launch Projectile Motion simulation">
                Launch Projectile Motion
              </Link>
            </Button>
            <Button asChild variant="outline" size="xl">
              <Link to="/two-body" aria-label="Explore Two-Body Problem simulation">
                Explore Two‑Body Problem
              </Link>
            </Button>
          </div>
        </div>
        <div className="relative">
          <img
            src={physicsHero}
            alt="Physics trajectories: a glowing projectile arc and two orbiting bodies"
            className="w-full rounded-xl shadow-elegant animate-float"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </div>
      </div>
    </header>
  );
};

export default Hero;

import Hero from "@/components/Hero";
import SimulationCard from "@/components/SimulationCard";
import { SEO } from "@/components/SEO";

const ProjectilePreview = () => (
  <svg viewBox="0 0 200 112" className="w-full h-full">
    <defs>
      <linearGradient id="traj" x1="0" x2="1">
        <stop offset="0%" stopColor="hsl(var(--brand))" />
        <stop offset="100%" stopColor="hsl(var(--brand-2))" />
      </linearGradient>
    </defs>
    <path d="M 10 100 Q 100 10 190 100" fill="none" stroke="url(#traj)" strokeWidth="3" />
    <circle r="4" fill="hsl(var(--brand))">
      <animateMotion dur="3s" repeatCount="indefinite" path="M 10 100 Q 100 10 190 100" />
    </circle>
    <rect x="10" y="100" width="180" height="2" fill="hsl(var(--border))" />
  </svg>
);

const TwoBodyPreview = () => (
  <svg viewBox="0 0 200 112" className="w-full h-full">
    <circle cx="100" cy="56" r="8" fill="hsl(var(--foreground))" />
    <g>
      <circle cx="160" cy="56" r="4" fill="hsl(var(--brand))" />
      <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 100 56" to="360 100 56" dur="5s" repeatCount="indefinite" />
    </g>
    <ellipse cx="100" cy="56" rx="60" ry="28" fill="none" stroke="hsl(var(--border))" />
  </svg>
);

const Index = () => {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Interactive Physics Simulations',
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0' },
    description: 'Accurate, interactive physics simulations for projectile motion and the two-body problem.'
  };

  return (
    <>
      <SEO
        title="Interactive Physics Simulations | Projectile & Two-Body"
        description="Accurate, interactive browser simulations: projectile motion and the two-body problem. Adjust parameters and visualize real physics."
        structuredData={structuredData}
      />

      <Hero />

      <main>
        <section className="container mx-auto py-10">
          <div className="grid gap-6 md:grid-cols-2">
            <SimulationCard
              title="Projectile Motion"
              description="Visualize parabolic trajectories with adjustable speed, angle, and gravity."
              to="/projectile"
              preview={<ProjectilePreview />}
            />
            <SimulationCard
              title="Two‑Body Problem"
              description="Explore gravitational dynamics and orbits with a precise integrator."
              to="/two-body"
              preview={<TwoBodyPreview />}
            />
          </div>
        </section>

        <section className="container mx-auto pb-20">
          <div className="grid gap-6 md:grid-cols-3">
            <article className="rounded-lg border p-6 bg-card shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Accurate by Design</h3>
              <p className="text-muted-foreground">Built with stable numerical methods and consistent units for trustworthy results.</p>
            </article>
            <article className="rounded-lg border p-6 bg-card shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Interactive Controls</h3>
              <p className="text-muted-foreground">Drag, slide, and type to adjust parameters and see instant updates.</p>
            </article>
            <article className="rounded-lg border p-6 bg-card shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Runs in Your Browser</h3>
              <p className="text-muted-foreground">No installs. Fast, responsive, and mobile‑friendly.</p>
            </article>
          </div>
        </section>
      </main>
    </>
  );
};

export default Index;

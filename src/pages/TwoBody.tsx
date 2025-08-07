import { useEffect, useRef, useState } from "react";
import { SEO } from "@/components/SEO";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TwoBody = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [M, setM] = useState(10); // primary mass
  const [m, setm] = useState(1); // secondary mass
  const [distance, setDistance] = useState(12); // initial separation (AU-ish)
  const [speedScale, setSpeedScale] = useState(1);
  const [playing, setPlaying] = useState(true);

  // Physics state
  const stateRef = useRef({
    r1: { x: 0, y: 0 },
    r2: { x: 0, y: 0 },
    v1: { x: 0, y: 0 },
    v2: { x: 0, y: 0 },
  });

  const reset = () => {
    const G = 1; // gravitational constant in sim units
    const R = distance; // separation
    // Center of mass at origin; place bodies on x-axis
    const r1x = - (m / (M + m)) * R;
    const r2x = (M / (M + m)) * R;

    // Circular orbit velocities perpendicular to radius
    const v = Math.sqrt((G * (M + m)) / R);
    // Opposite directions to conserve momentum
    const v1y = (m / (M + m)) * v;
    const v2y = -(M / (M + m)) * v;

    stateRef.current = {
      r1: { x: r1x, y: 0 },
      r2: { x: r2x, y: 0 },
      v1: { x: 0, y: v1y },
      v2: { x: 0, y: v2y },
    };
  };

  const rafRef = useRef<number | null>(null);

  useEffect(() => { reset(); }, [M, m, distance]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const resize = () => {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const G = 1;
    const trails: Array<{x:number,y:number,body:1|2}> = [];

    const step = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Compute acceleration
      const { r1, r2, v1, v2 } = stateRef.current;
      const dx = r2.x - r1.x;
      const dy = r2.y - r1.y;
      const r = Math.hypot(dx, dy);
      const invR3 = 1 / (r * r * r + 1e-6);

      const a1x = G * m * dx * invR3;
      const a1y = G * m * dy * invR3;
      const a2x = -G * M * dx * invR3;
      const a2y = -G * M * dy * invR3;

      const dt = 0.02 * speedScale; // simulation time step

      if (playing) {
        // Velocity Verlet integration
        stateRef.current.r1.x += v1.x * dt + 0.5 * a1x * dt * dt;
        stateRef.current.r1.y += v1.y * dt + 0.5 * a1y * dt * dt;
        stateRef.current.r2.x += v2.x * dt + 0.5 * a2x * dt * dt;
        stateRef.current.r2.y += v2.y * dt + 0.5 * a2y * dt * dt;

        const dx2 = stateRef.current.r2.x - stateRef.current.r1.x;
        const dy2 = stateRef.current.r2.y - stateRef.current.r1.y;
        const r2mag = Math.hypot(dx2, dy2);
        const invR3b = 1 / (r2mag * r2mag * r2mag + 1e-6);

        const na1x = G * m * dx2 * invR3b;
        const na1y = G * m * dy2 * invR3b;
        const na2x = -G * M * dx2 * invR3b;
        const na2y = -G * M * dy2 * invR3b;

        stateRef.current.v1.x += 0.5 * (a1x + na1x) * dt;
        stateRef.current.v1.y += 0.5 * (a1y + na1y) * dt;
        stateRef.current.v2.x += 0.5 * (a2x + na2x) * dt;
        stateRef.current.v2.y += 0.5 * (a2y + na2y) * dt;

        // Trails
        trails.push({ x: stateRef.current.r1.x, y: stateRef.current.r1.y, body: 1 });
        trails.push({ x: stateRef.current.r2.x, y: stateRef.current.r2.y, body: 2 });
        if (trails.length > 800) trails.splice(0, trails.length - 800);
      }

      // Auto scale
      const maxR = Math.max(
        Math.hypot(stateRef.current.r1.x, stateRef.current.r1.y),
        Math.hypot(stateRef.current.r2.x, stateRef.current.r2.y),
        distance
      );
      const scale = Math.min(width, height) * 0.35 / Math.max(1, maxR);

      // Draw trails
      ctx.lineWidth = 1.5;
      trails.forEach((p, i) => {
        const alpha = i / trails.length;
        const colorVar = p.body === 1 ? '--foreground' : '--brand';
        ctx.strokeStyle = `hsl(${getComputedStyle(document.documentElement).getPropertyValue(colorVar)} / ${Math.max(0.1, alpha)})`;
        if (i > 0) {
          const prev = trails[i-1];
          ctx.beginPath();
          ctx.moveTo(centerX + prev.x * scale, centerY + prev.y * scale);
          ctx.lineTo(centerX + p.x * scale, centerY + p.y * scale);
          ctx.stroke();
        }
      });

      // Draw bodies
      const drawBody = (x:number, y:number, radius:number, colorVar:string) => {
        ctx.fillStyle = `hsl(${getComputedStyle(document.documentElement).getPropertyValue(colorVar)})`;
        ctx.beginPath();
        ctx.arc(centerX + x * scale, centerY + y * scale, radius, 0, Math.PI * 2);
        ctx.fill();
      };

      drawBody(stateRef.current.r1.x, stateRef.current.r1.y, Math.max(4, 4 + Math.log(M+1)), '--foreground');
      drawBody(stateRef.current.r2.x, stateRef.current.r2.y, Math.max(3, 3 + Math.log(m+1)), '--brand');

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [M, m, distance, speedScale, playing]);

  return (
    <>
      <SEO
        title="Two‑Body Problem Simulation | Interactive Physics"
        description="Explore gravitational dynamics of two bodies with a stable velocity‑Verlet integrator."
      />
      <main className="container mx-auto py-10">
        <h1 className="sr-only">Two‑Body Problem Simulation</h1>
        <section className="grid lg:grid-cols-[1fr,360px] gap-8 items-start">
          <div className="rounded-xl border bg-card p-2 md:p-4">
            <div className="aspect-[16/9] w-full rounded-lg bg-muted/20 overflow-hidden">
              <canvas ref={canvasRef} className="w-full h-full" />
            </div>
          </div>
          <aside className="rounded-xl border bg-card p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Parameters</h2>
              <label className="text-sm mb-1 block">Primary mass M</label>
              <div className="flex items-center gap-3">
                <Slider value={[M]} min={1} max={50} step={1} onValueChange={(v)=>setM(v[0])} className="flex-1" />
                <Input type="number" value={M} min={1} max={50} onChange={(e)=>setM(Number(e.target.value))} className="w-24" />
              </div>
            </div>
            <div>
              <label className="text-sm mb-1 block">Secondary mass m</label>
              <div className="flex items-center gap-3">
                <Slider value={[m]} min={0.1} max={20} step={0.1} onValueChange={(v)=>setm(Number(v[0].toFixed(1)))} className="flex-1" />
                <Input type="number" value={m} min={0.1} max={20} step={0.1} onChange={(e)=>setm(Number(e.target.value))} className="w-24" />
              </div>
            </div>
            <div>
              <label className="text-sm mb-1 block">Initial separation</label>
              <div className="flex items-center gap-3">
                <Slider value={[distance]} min={4} max={40} step={0.5} onValueChange={(v)=>setDistance(Number(v[0]))} className="flex-1" />
                <Input type="number" value={distance} min={4} max={40} step={0.5} onChange={(e)=>setDistance(Number(e.target.value))} className="w-24" />
              </div>
            </div>
            <div>
              <label className="text-sm mb-1 block">Time scale</label>
              <div className="flex items-center gap-3">
                <Slider value={[speedScale]} min={0.2} max={3} step={0.1} onValueChange={(v)=>setSpeedScale(Number(v[0].toFixed(1)))} className="flex-1" />
                <Input type="number" value={speedScale} min={0.2} max={3} step={0.1} onChange={(e)=>setSpeedScale(Number(e.target.value))} className="w-24" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="hero" onClick={()=>setPlaying(p=>!p)}>{playing ? 'Pause' : 'Play'}</Button>
              <Button variant="outline" onClick={reset}>Reset</Button>
            </div>
          </aside>
        </section>
      </main>
    </>
  );
};

export default TwoBody;

import { useEffect, useRef, useState } from "react";
import { SEO } from "@/components/SEO";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const GRAVITY_DEFAULT = 9.81; // m/s^2

const Projectile = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [speed, setSpeed] = useState(30); // m/s
  const [angleDeg, setAngleDeg] = useState(45);
  const [g, setG] = useState(GRAVITY_DEFAULT);
  const [playing, setPlaying] = useState(true);

  const reset = () => {
    tRef.current = 0;
  };

  const tRef = useRef(0); // time in seconds
  const rafRef = useRef<number | null>(null);

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

    const groundY = () => canvas.height / (window.devicePixelRatio || 1) - 24;

    const draw = () => {
      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, width, height);

      // Axes / ground
      ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--border') ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--border')})` : '#ccc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(16, groundY());
      ctx.lineTo(width - 16, groundY());
      ctx.stroke();

      // Launch params
      const angle = (angleDeg * Math.PI) / 180;
      const vx = speed * Math.cos(angle);
      const vy = speed * Math.sin(angle);

      // Scale for meters->pixels (auto-fit roughly)
      const range = (speed * speed * Math.sin(2 * angle)) / g; // meters
      const xScale = Math.max(4, Math.min(12, (width - 64) / Math.max(10, range)));
      const yScale = xScale;

      // Trajectory path
      ctx.strokeStyle = `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--brand')})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= range; x += range / 200) {
        const t = x / vx;
        const y = vy * t - 0.5 * g * t * t;
        const px = 24 + x * xScale;
        const py = groundY() - y * yScale;
        if (x === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Animate projectile
      const dt = 1 / 60; // seconds per frame
      if (playing) tRef.current += dt;
      const t = tRef.current;
      let x = vx * t;
      let y = vy * t - 0.5 * g * t * t;

      // If below ground, loop
      if (y < 0) {
        tRef.current = 0;
        x = 0; y = 0;
      }

      const px = 24 + x * xScale;
      const py = groundY() - y * yScale;

      // Draw projectile
      ctx.fillStyle = `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--accent')})`;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [speed, angleDeg, g, playing]);

  return (
    <>
      <SEO
        title="Projectile Motion Simulation | Interactive Physics"
        description="Adjust speed, angle, and gravity to visualize accurate projectile motion in real time."
      />
      <main className="container mx-auto py-10">
        <h1 className="sr-only">Projectile Motion Simulation</h1>
        <section className="grid lg:grid-cols-[1fr,360px] gap-8 items-start">
          <div className="rounded-xl border bg-card p-2 md:p-4">
            <div className="aspect-[16/9] w-full rounded-lg bg-muted/20 overflow-hidden">
              <canvas ref={canvasRef} className="w-full h-full" />
            </div>
          </div>
          <aside className="rounded-xl border bg-card p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Launch Parameters</h2>
              <label className="text-sm mb-1 block">Speed (m/s)</label>
              <div className="flex items-center gap-3">
                <Slider value={[speed]} min={5} max={100} step={1} onValueChange={(v)=>setSpeed(v[0])} className="flex-1" />
                <Input type="number" value={speed} min={5} max={100} onChange={(e)=>setSpeed(Number(e.target.value))} className="w-24" />
              </div>
            </div>
            <div>
              <label className="text-sm mb-1 block">Angle (deg)</label>
              <div className="flex items-center gap-3">
                <Slider value={[angleDeg]} min={5} max={85} step={1} onValueChange={(v)=>setAngleDeg(v[0])} className="flex-1" />
                <Input type="number" value={angleDeg} min={5} max={85} onChange={(e)=>setAngleDeg(Number(e.target.value))} className="w-24" />
              </div>
            </div>
            <div>
              <label className="text-sm mb-1 block">Gravity g (m/s²)</label>
              <div className="flex items-center gap-3">
                <Slider value={[g]} min={1} max={20} step={0.1} onValueChange={(v)=>setG(Number(v[0].toFixed(1)))} className="flex-1" />
                <Input type="number" value={g} min={1} max={20} step={0.1} onChange={(e)=>setG(Number(e.target.value))} className="w-24" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="hero" onClick={()=>setPlaying((p)=>!p)}>{playing ? 'Pause' : 'Play'}</Button>
              <Button variant="outline" onClick={reset}>Reset</Button>
            </div>
          </aside>
        </section>
      </main>
    </>
  );
};

export default Projectile;

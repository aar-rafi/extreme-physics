import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Member {
  name: string;
  role: string;
  initials: string;
}

const members: Member[] = [
  { name: "Dr. Alex Chen", role: "Computational Physicist", initials: "AC" },
  { name: "Maya Patel", role: "Frontend Engineer", initials: "MP" },
  { name: "Diego Ramos", role: "Visualization Engineer", initials: "DR" },
];

export default function TeamSection() {
  return (
    <section className="container mx-auto pb-20" aria-labelledby="team-heading">
      <div className="text-center mb-8">
        <p className="text-sm tracking-widest uppercase text-muted-foreground mb-2">Our Crew</p>
        <h2 id="team-heading" className="text-3xl md:text-4xl font-bold">
          <span className="bg-gradient-to-r from-[hsl(var(--brand))] to-[hsl(var(--brand-2))] bg-clip-text text-transparent">
            Meet the Team
          </span>
        </h2>
        <p className="text-muted-foreground mt-3">We craft accurate, real-time simulations for the web.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((m) => (
          <Card key={m.name} className="bg-card/60 backdrop-blur">
            <CardHeader className="flex-row items-center gap-4">
              <Avatar className="h-12 w-12 ring-2 ring-[hsl(var(--brand))/0.35]">
                <AvatarFallback className="font-semibold" aria-hidden>
                  {m.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl">{m.name}</CardTitle>
                <CardDescription>{m.role}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Focused on physics correctness, performance, and delightful UI.
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

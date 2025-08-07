import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useRef } from "react";

interface SimulationCardProps {
  title: string;
  description: string;
  to: string;
  preview: React.ReactNode;
}

const SimulationCard = ({ title, description, to, preview }: SimulationCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <Card
      ref={cardRef}
      className="group relative transition-transform duration-300 hover:-translate-y-1 hover:shadow-elegant"
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-[16/9] rounded-md border bg-muted/20 flex items-center justify-center overflow-hidden mb-4">
          {preview}
        </div>
        <Button asChild variant="link">
          <Link to={to} aria-label={`Open ${title} simulation`}>Open simulation →</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default SimulationCard;

import { createFileRoute } from "@tanstack/react-router";
import { FarshoreApp } from "@/components/game/FarshoreApp";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <FarshoreApp />;
}

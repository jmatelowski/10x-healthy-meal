import React from "react";
import { Button } from "@/components/ui/button";

export const Header: React.FC = () => (
  <header className="flex items-center justify-between mb-8">
    <h1 className="text-3xl font-bold tracking-tight">Your recipes</h1>
    <Button asChild>
      <a href="/recipes/new">Add Recipe</a>
    </Button>
  </header>
);

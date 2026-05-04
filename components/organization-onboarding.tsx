"use client";

import type React from "react";
import { useState } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateOrganization } from "@/hooks/use-organizations";
import { useActiveOrganization } from "@/components/providers/organization-provider";

function makeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function OrganizationOnboarding() {
  const createOrganization = useCreateOrganization();
  const { setActiveOrganizationId } = useActiveOrganization();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [type, setType] = useState("GYM");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    try {
      const organization = await createOrganization.mutateAsync({
        name: name.trim(),
        slug: slug.trim() || makeSlug(name),
        type,
      });

      setActiveOrganizationId(organization.id);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "No se pudo crear la organización.",
      );
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              crea tu organización
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              necesitas una organización activa para usar Box Planner
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="organization-name">nombre</Label>
            <Input
              id="organization-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization-slug">slug opcional</Label>
            <Input
              id="organization-slug"
              value={slug}
              onChange={(event) => setSlug(makeSlug(event.target.value))}
              placeholder={name ? makeSlug(name) : "mi-gimnasio"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization-type">tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="organization-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GYM">gimnasio</SelectItem>
                <SelectItem value="CLUB">club</SelectItem>
                <SelectItem value="PERSONAL">personal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={createOrganization.isPending}
          >
            {createOrganization.isPending ? "creando..." : "crear organización"}
          </Button>
        </form>
      </div>
    </main>
  );
}

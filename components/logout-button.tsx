"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";

interface LogoutButtonProps {
  compact?: boolean;
  className?: string;
}

export function LogoutButton({ compact = false, className }: LogoutButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!session) {
    return null;
  }

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();

    setLoading(true);
    queryClient.clear();

    if (supabase) {
      await supabase.auth.signOut();
    }

    setLoading(false);
    router.replace("/login");
  };

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleLogout}
        disabled={loading}
        className={cn("text-muted-foreground", className)}
        aria-label="cerrar sesión"
      >
        <LogOut className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={handleLogout}
      disabled={loading}
      className={cn("w-full justify-start gap-3", className)}
    >
      <LogOut className="h-4 w-4" />
      {loading ? "cerrando..." : "cerrar sesión"}
    </Button>
  );
}

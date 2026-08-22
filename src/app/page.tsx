"use client";

import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LoginPage } from "@/components/aa/LoginPage";
import { ClientPanel } from "@/components/aa/ClientPanel";
import { AdminPanel } from "@/components/aa/AdminPanel";
import { Loader2 } from "lucide-react";

export default function Page() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <LoginPage />;
  if (user.role === "ADMIN") return <AdminPanel />;
  return <ClientPanel />;
}

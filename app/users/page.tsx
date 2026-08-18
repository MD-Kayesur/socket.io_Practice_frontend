"use client";

import React from "react";
import { UsersTable } from "@/components/users/UsersTable";

export default function UsersPage() {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-center py-10">
      <UsersTable />
    </div>
  );
}

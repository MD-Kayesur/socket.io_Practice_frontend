"use client";

import React from "react";
import { useGetUsersQuery } from "@/redux/api/usersApi";
import { useRouter } from "next/navigation";
import { MessageSquare, UserCheck, Mail, Calendar, Loader2, ArrowLeft } from "lucide-react";

export const UsersTable: React.FC = () => {
  const router = useRouter();
  const { data: users, isLoading, error, refetch } = useGetUsersQuery();

  const handleMessageUser = (user: any) => {
    // Navigate to homepage with chatWith query param
    const encodedUser = encodeURIComponent(
      JSON.stringify({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      })
    );
    router.push(`/?chatWith=${user.id}&userData=${encodedUser}`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-medium mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Messenger
          </button>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-indigo-500" /> Users Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered users in PostgreSQL. Click "Message" to start a live conversation.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
        >
          Refresh List
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="p-12 text-center text-slate-400 bg-slate-900/60 rounded-2xl border border-slate-800 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
          <p className="text-sm font-medium">Fetching registered users from database...</p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-6 text-center bg-rose-950/20 border border-rose-500/30 rounded-2xl text-rose-400 text-sm">
          Failed to load users. Make sure NestJS backend is running on port 8000.
        </div>
      )}

      {/* Users Table */}
      {!isLoading && !error && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-800/80 border-b border-slate-700/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">User</th>
                  <th className="py-3.5 px-6">Email</th>
                  <th className="py-3.5 px-6">Joined Date</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {users && users.length > 0 ? (
                  users.map((user: any) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="py-4 px-6 flex items-center gap-3">
                        <img
                          src={
                            user.avatar ||
                            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80"
                          }
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-700"
                        />
                        <div>
                          <div className="font-semibold text-slate-100">
                            {user.name}
                          </div>
                          <div className="text-[11px] text-emerald-400 font-medium">
                            Active Account
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-300 text-xs font-mono">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          {user.email}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400 text-xs">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
                            : "Recently"}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleMessageUser(user)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Message
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-12 text-center text-slate-500 text-xs"
                    >
                      No users found in database yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

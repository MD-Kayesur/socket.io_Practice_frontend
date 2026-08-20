"use client";

import React, { useState } from "react";
import {
  useLoginMutation,
  useSignupMutation,
  useGoogleAuthMutation,
} from "@/redux/api/authApi";
import { setCredentials } from "@/redux/slices/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import { signInWithGooglePopup } from "@/components/firebase/firebase";
import { X, Lock, Mail, User as UserIcon, Loader2 } from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const dispatch = useAppDispatch();
  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [signup, { isLoading: isSignupLoading }] = useSignupMutation();
  const [googleAuth] = useGoogleAuthMutation();

  if (!isOpen) return null;

  const handleGoogleAuth = async (useDemoFallback = false) => {
    setErrorMsg("");
    setIsGoogleLoading(true);
    try {
      let googlePayload;

      if (!useDemoFallback) {
        try {
          const result = await signInWithGooglePopup();
          const firebaseUser = result.user;

          if (!firebaseUser.email) {
            throw new Error("No email associated with this Google account.");
          }

          googlePayload = {
            name: firebaseUser.displayName || "Google User",
            email: firebaseUser.email,
            avatar: firebaseUser.photoURL || undefined,
            googleUid: firebaseUser.uid,
          };
        } catch (firebaseErr: any) {
          if (
            firebaseErr?.code === "auth/configuration-not-found" ||
            firebaseErr?.message?.includes("configuration-not-found")
          ) {
            setErrorMsg(
              "Firebase Notice: Google Sign-In is not enabled in Firebase Console yet. Please go to Firebase Console -> Authentication -> Sign-in method -> Enable Google."
            );
            setIsGoogleLoading(false);
            return;
          }
          throw firebaseErr;
        }
      } else {
        googlePayload = {
          name: "Google User",
          email: "google.user@example.com",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
          googleUid: "demo-google-uid-123",
        };
      }

      const res = await googleAuth(googlePayload).unwrap();
      dispatch(setCredentials({ user: res.user, token: res.accessToken }));
      onClose();
    } catch (err: any) {
      console.error("Google Auth error:", err);
      setErrorMsg(
        err?.data?.message || err?.message || "Google Authentication failed. Please try again."
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    try {
      if (isLogin) {
        const res = await login({ email, password }).unwrap();
        dispatch(setCredentials({ user: res.user, token: res.accessToken }));
        onClose();
      } else {
        const res = await signup({ name, email, password }).unwrap();
        dispatch(setCredentials({ user: res.user, token: res.accessToken }));
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(
        err?.data?.message || err?.message || "Authentication failed. Check credentials."
      );
    }
  };

  const isLoading = isLoginLoading || isSignupLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-slate-100">
            {isLogin ? "Welcome Back" : "Create an Account"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isLogin
              ? "Sign in to connect to the NestJS RTK Query backend"
              : "Register to get started with real-time Socket.io chat"}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            <p>{errorMsg}</p>
            {errorMsg.includes("Firebase Notice") && (
              <button
                type="button"
                onClick={() => handleGoogleAuth(true)}
                className="mt-2 text-indigo-400 hover:text-indigo-300 font-semibold underline block"
              >
                ⚡ Test Google Sign-In with Database Sync
              </button>
            )}
          </div>
        )}

        {/* Google Auth Button */}
        <button
          type="button"
          onClick={() => handleGoogleAuth(false)}
          disabled={isLoading || isGoogleLoading}
          className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700/80 active:scale-[0.99] border border-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-3 shadow-sm disabled:opacity-50"
        >
          {isGoogleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          ) : (
            <GoogleIcon />
          )}
          <span>{isLogin ? "Sign in with Google" : "Sign up with Google"}</span>
        </button>

        {/* Divider */}
        <div className="relative my-5 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800"></div>
          </div>
          <div className="relative bg-slate-900 px-3 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Or continue with email
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Kayesur Rahman"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLogin ? "Sign In" : "Register Account"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg("");
            }}
            className="text-indigo-400 font-semibold hover:underline"
          >
            {isLogin ? "Sign Up" : "Log In"}
          </button>
        </div>
      </div>
    </div>
  );
};

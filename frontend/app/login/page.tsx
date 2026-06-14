"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4">
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
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    // TODO: Supabase Auth magic link
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1000);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] px-4">
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-xl overflow-hidden">
          <Image src="/sana2.png" alt="Statseed" width={48} height={48} className="w-full h-full object-cover" />
        </div>
        <span className="text-[18px] font-semibold text-gray-900 dark:text-white tracking-tight">
          Statseed
        </span>
      </div>

      {/* Card */}
      <div className="w-full max-w-[360px] bg-white dark:bg-[#111] border border-gray-200 dark:border-neutral-800 rounded-xl shadow-sm p-8">
        <h1 className="text-[20px] font-semibold text-gray-900 dark:text-white mb-1 text-center">
          Log in to Statseed
        </h1>
        <p className="text-[13px] text-gray-500 dark:text-neutral-400 text-center mb-6">
          Log in to your personal account
        </p>

        {/* OAuth buttons */}
        <div className="flex flex-col gap-2.5 mb-5">
          <button
            type="button"
            className="flex items-center justify-center gap-2.5 w-full h-9 rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] text-[13px] font-medium text-gray-800 dark:text-neutral-100 hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
          >
            <GitHubIcon />
            Continue with GitHub
          </button>
          <button
            type="button"
            className="flex items-center justify-center gap-2.5 w-full h-9 rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] text-[13px] font-medium text-gray-800 dark:text-neutral-100 hover:bg-gray-50 dark:hover:bg-[#222] transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-800" />
          <span className="text-[11px] text-gray-400 dark:text-neutral-500 uppercase tracking-wider">
            or
          </span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-800" />
        </div>

        {/* Email form */}
        {sent ? (
          <div className="text-center py-4">
            <p className="text-[13px] text-gray-700 dark:text-neutral-300 font-medium mb-1">
              Check your email
            </p>
            <p className="text-[12px] text-gray-500 dark:text-neutral-400">
              We sent a link to <span className="font-medium">{email}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-2.5">
            <input
              type="email"
              placeholder="メールアドレス"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-9 px-3 text-[13px] rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-neutral-100 placeholder-gray-400 dark:placeholder-neutral-500 outline-none focus:ring-2 focus:ring-neutral-400/30 focus:border-neutral-400 dark:focus:border-neutral-500 transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full h-9 rounded-md text-[13px] font-medium transition-colors bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-100 disabled:opacity-40"
            >
              {loading ? "Sending..." : "Continue with Email"}
            </button>
          </form>
        )}
      </div>

      {/* Bottom nav */}
      <div className="mt-8 flex items-center gap-4 text-[12px] text-gray-400 dark:text-neutral-600">
        <Link href="/" className="hover:text-gray-600 dark:hover:text-neutral-400 transition-colors">
          Home
        </Link>
        <Link href="/dashboard" className="hover:text-gray-600 dark:hover:text-neutral-400 transition-colors">
          Dashboard
        </Link>
      </div>
    </div>
  );
}

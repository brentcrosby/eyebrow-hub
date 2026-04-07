"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import bgImage from "@/app/assests/images/bgadminlogin.png";

export default function AdminLoginPage() {
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isFormValid = email.trim() !== "" && password.trim() !== "";
  const isButtonDisabled = !isFormValid || isSubmitting;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isFormValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setErrorMessage(data?.message || "Login failed. Please try again.");
        return;
      }

      setSuccessMessage(data?.message || "Login successful.");
      router.push("/admin/dashboard");
    } catch {
      setErrorMessage("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isMounted) {
    return (
      <main className="fixed inset-0 flex items-center justify-end">
        <Image
          src={bgImage}
          alt=""
          fill
          className="object-cover object-center"
          priority
        />
        <div className="relative z-10 w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
          <h1 className="mb-2 text-center text-3xl font-semibold">
            Admin Portal
          </h1>
          <p className="mb-6 text-center text-sm text-gray-600">Login</p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen w-full flex items-center justify-end px-16 bg-black">
      <Image
        src={bgImage}
        alt=""
        fill
        className="object-cover object-right"
        priority
      />
      <div className="relative z-10 w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-3xl font-semibold">
          Admin Portal
        </h1>

        <p className="mb-6 text-center text-sm text-gray-600">Login</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Email Address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none transition focus:border-black"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>

              <Link
                href="/forgot-password"
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none transition focus:border-black"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {errorMessage && (
            <p className="text-sm text-red-600">{errorMessage}</p>
          )}

          {successMessage && (
            <p className="text-sm text-green-600">{successMessage}</p>
          )}

          <button
            type="submit"
            disabled={isButtonDisabled}
            className={`w-full rounded-full px-4 py-2 font-medium text-white transition ${
              isButtonDisabled
                ? "cursor-not-allowed bg-gray-400"
                : "bg-[#7a5a3c] hover:opacity-90"
            }`}
          >
            {isSubmitting ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}
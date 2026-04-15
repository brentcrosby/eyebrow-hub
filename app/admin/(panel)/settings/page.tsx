"use client";
import { useState } from "react";

export default function AdminSettingsPage() {
  // State variables for email and password management
  const [email, editEmail] = useState<string>("");
  const [originalEmail, setOriginalEmail] = useState<string>("");
  const [password, editPassword] = useState<string>("");
  const [originalPassword, setOriginalPassword] = useState<string>("");
  // State variables for form visibility and error handling
  const [emailForm, displayEmailForm] = useState<boolean>(false);
  const [passwordForm, displayPasswordForm] = useState<boolean>(false);
  const [emailError, setEmailError] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // function to validate email format with error message display if the email is invalid
  function emailValidation () : boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError("");
    return true; 
  }

  return (
    <main className="min-h-full p-4 sm:p-6 bg-[#fdf8f1]">
      <section className="mx-auto w-full max-w-6xl rounded-[28px] bg-white px-5 py-6 shadow-[0_18px_50px_rgba(96,74,50,0.1)] sm:px-8 sm:py-8 md:px-10 md:py-10">
        <div className="flex flex-col gap-4 border-b border-[#d8c4ae] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-3xl font-semibold text-[#7a5a3c]">Settings</h1>
          <p className="text-sm text-[#7a5a3c]">Welcome, Owner</p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 rounded-2xl border border-[#eadfce] bg-[#fffaf4] p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-[#7a5a3c]">Login Security</h2>

            <div className="mt-5">
              <p className="text-xs text-[#a1866f]">Email Address</p>
              <div className="mt-1 flex items-center justify-between border-b border-[#eadfce] pb-2">
                <input
                  value={originalEmail}
                  onChange={(e) => setOriginalEmail(e.target.value)}
                  placeholder="example@email.com"
                  readOnly={!emailForm}
                  className="w-full bg-transparent text-sm text-[#7a5a3c] outline-none"
                />
                <span
                  className="cursor-pointer text-[#a1866f] text-sm hover:text-[#7a5a3c] transition-colors"
                  onClick={() => displayEmailForm(true)}
                >✎</span>
              </div>

              {emailForm && (
                <div className="mt-3 w-72 rounded-2xl border border-[#eadfce] bg-white p-4 shadow-md">
                  <p className="text-sm font-medium text-[#7a5a3c] mb-3">Change Email</p>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => editEmail(e.target.value)}
                    placeholder="Enter new email"
                    className="w-full rounded-full border border-[#dccab5] bg-[#fffaf4] px-4 py-2 text-sm text-[#7a5a3c] outline-none focus:ring-1 focus:ring-[#7a5a3c]"
                  />
                  {emailError && <p className="text-xs text-red-500 mt-1.5 pl-1">{emailError}</p>}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => { 
                        if (emailValidation()) {
                          displayEmailForm(false);
                          setOriginalEmail(email);
                        } else {
                          setEmailError("Please enter a valid email address.");
                        }
                      }}
                      className="rounded-full bg-[#7a5a3c] px-5 py-1.5 text-sm font-medium text-white hover:bg-[#936f50] active:scale-95 transition-all duration-150 shadow-sm hover:shadow-md"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        displayEmailForm(false);
                        setEmailError("");
                        setOriginalEmail(originalEmail);
                      }}
                      className="rounded-full border border-[#dccab5] bg-[#fffaf4] px-5 py-1.5 text-sm text-[#7a5a3c] hover:bg-[#f0e6d6] hover:border-[#c9a882] active:scale-95 transition-all duration-150"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5">
              <p className="text-xs text-[#a1866f]">Password</p>
              <div className="mt-1 flex items-center justify-between border-b border-[#eadfce] pb-2">
                <input
                  value={originalPassword}
                  onChange={(e) => setOriginalPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  readOnly={!passwordForm}
                  className="w-full bg-transparent text-sm text-[#7a5a3c] outline-none"
                />
                <div className="flex items-center gap-2">
                  <span
                    className="cursor-pointer text-[#a1866f] hover:text-[#7a5a3c] transition-colors select-none"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </span>
                  <span
                    className="cursor-pointer text-[#a1866f] text-sm hover:text-[#7a5a3c] transition-colors"
                    onClick={() => displayPasswordForm(true)}
                  >✎</span>
                </div>
              </div>

              {passwordForm && (
                <div className="mt-3 w-72 rounded-2xl border border-[#eadfce] bg-white p-4 shadow-md">
                  <p className="text-sm font-medium text-[#7a5a3c] mb-3">Change Password</p>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => editPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-full border border-[#dccab5] bg-[#fffaf4] px-4 py-2 text-sm text-[#7a5a3c] outline-none focus:ring-1 focus:ring-[#7a5a3c]"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        displayPasswordForm(false)
                        setOriginalPassword(password);
                      }}
                      className="rounded-full bg-[#7a5a3c] px-5 py-1.5 text-sm font-medium text-white hover:bg-[#936f50] active:scale-95 transition-all duration-150 shadow-sm hover:shadow-md"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        displayPasswordForm(false);
                        editPassword("");
                      }}
                      className="rounded-full border border-[#dccab5] bg-[#fffaf4] px-5 py-1.5 text-sm text-[#7a5a3c] hover:bg-[#f0e6d6] hover:border-[#c9a882] active:scale-95 transition-all duration-150"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-semibold text-[#7a5a3c]">
                Eyebrow Hub
              </div>
            </div>
          </div>
        </div>

      </section>
    </main>
  );
}
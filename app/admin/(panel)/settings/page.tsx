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

  // Notification preferences object to reduce state variables
  const [preferences, setPreferences] = useState({
    phone: true,
    email: true,
    text: true,
    calendar: true,
  });
  // Edit mode state for notifications
  const [editMode, setEditMode] = useState(false);
  // Draft preferences state to hold changes before saving
  const [draftPreferences, setDraftPreferences] = useState(preferences);

  // Function to validate email format
  function emailValidation(): boolean {
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
                  readOnly={!emailForm}
                  className="w-full bg-transparent text-sm text-[#7a5a3c] outline-none"
                />
                <span
                  className="cursor-pointer text-[#a1866f]"
                  onClick={() => displayEmailForm(true)}
                >
                  ✎
                </span>
              </div>

              {emailForm && (
                <div className="mt-3 w-72 rounded-2xl border bg-white p-4 shadow-md">
                  <input
                    value={email}
                    onChange={(e) => editEmail(e.target.value)}
                    className="w-full border rounded-full px-4 py-2 text-sm"
                    placeholder="Enter email"
                  />

                  {emailError && (
                    <p className="text-xs text-red-500 mt-1">
                      {emailError}
                    </p>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        if (emailValidation()) {
                          setOriginalEmail(email);
                          displayEmailForm(false);
                        }
                      }}
                      className="bg-[#7a5a3c] text-white px-4 py-1.5 rounded-full"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => displayEmailForm(false)}
                      className="border px-4 py-1.5 rounded-full"
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
                  readOnly={!passwordForm}
                  className="w-full bg-transparent text-sm text-[#7a5a3c] outline-none"
                />

                <div className="flex gap-2">
                  <span onClick={() => setShowPassword(!showPassword)}>
                   {showPassword ? "👁" : "👁"}
                  </span>
                  <span
                    onClick={() => displayPasswordForm(true)}
                    className="cursor-pointer"
                  >
                    ✎
                  </span>
                </div>
              </div>

              {passwordForm && (
                <div className="mt-3 w-72 rounded-2xl border bg-white p-4 shadow-md">
                  <input
                    value={password}
                    onChange={(e) => editPassword(e.target.value)}
                    className="w-full border rounded-full px-4 py-2 text-sm"
                    placeholder="Enter password"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        setOriginalPassword(password);
                        displayPasswordForm(false);
                      }}
                      className="bg-[#7a5a3c] text-white px-4 py-1.5 rounded-full"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => displayPasswordForm(false)}
                      className="border px-4 py-1.5 rounded-full"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-center text-2xl font-semibold text-[#7a5a3c]">
            Eyebrow Hub
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-[#fff3eb] p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#7a5a3c]">
              Notifications
            </h2>

            <span
              className="cursor-pointer text-[#a1866f]"
              onClick={() => {
                setDraftPreferences(preferences);
                setEditMode(true);
              }}
            >
              ✎
            </span>
          </div>

          {!editMode ? (
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-[#7a5a3c]">
              <div>Phone: {preferences.phone ? "On" : "Off"}</div>
              <div>Email: {preferences.email ? "On" : "Off"}</div>
              <div>Text: {preferences.text ? "On" : "Off"}</div>
              <div>Calendar: {preferences.calendar ? "On" : "Off"}</div>
            </div>
          ) : (
      
            <div className="mt-4 grid grid-cols-2 gap-4">
              {Object.entries(draftPreferences).map(([key, value]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-sm text-[#7a5a3c]"
                >
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) =>
                      setDraftPreferences({
                        ...draftPreferences,
                        [key]: e.target.checked,
                      })
                    }
                  />
                  {key}
                </label>
              ))}

              <div className="col-span-2 flex gap-2 mt-2">
                <button
                  onClick={() => {
                    setPreferences(draftPreferences);
                    setEditMode(false);
                  }}
                  className="bg-[#7a5a3c] text-white px-4 py-1.5 rounded-full"
                >
                  Save
                </button>

                <button
                  onClick={() => setEditMode(false)}
                  className="border px-4 py-1.5 rounded-full"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </section>
    </main>
  );
}
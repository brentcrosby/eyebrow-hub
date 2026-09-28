"use client";
import { useEffect, useState } from "react";

type Notice = { ok: boolean; text: string } | null;

// Sends one account change to the API and returns a message for the form.
async function saveAccount(changes: object): Promise<{ ok: boolean; text: string; email?: string }> {
  try {
    const response = await fetch("/api/admin/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(changes),
    });
    const data = await response.json().catch(() => null);
    return {
      ok: response.ok,
      text: data?.message ?? "Something went wrong. Please try again.",
      email: data?.email,
    };
  } catch {
    return { ok: false, text: "Something went wrong. Please try again." };
  }
}

export default function AdminSettingsPage() {
  // State variables for email and password management
  const [email, editEmail] = useState<string>("");
  const [originalEmail, setOriginalEmail] = useState<string>("");

  const [currentPassword, setCurrentPassword] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  // State variables for form visibility and messages
  const [emailForm, displayEmailForm] = useState<boolean>(false);
  const [passwordForm, displayPasswordForm] = useState<boolean>(false);

  const [emailNotice, setEmailNotice] = useState<Notice>(null);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load the signed-in account's real email.
  useEffect(() => {
    fetch("/api/admin/account")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setOriginalEmail(data?.email ?? ""))
      .catch(() => setEmailNotice({ ok: false, text: "Could not load your email." }));
  }, []);

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
      setEmailNotice({ ok: false, text: "Please enter a valid email address." });
      return false;
    }
    return true;
  }

  async function saveEmail() {
    if (!emailValidation()) return;

    setIsSaving(true);
    const result = await saveAccount({ email });
    setIsSaving(false);

    setEmailNotice(result);
    if (result.ok) {
      if (result.email) setOriginalEmail(result.email);
      displayEmailForm(false);
    }
  }

  async function savePassword() {
    if (newPassword.length < 8) {
      setPasswordNotice({ ok: false, text: "New password must be at least 8 characters." });
      return;
    }

    setIsSaving(true);
    const result = await saveAccount({ currentPassword, newPassword });
    setIsSaving(false);

    setPasswordNotice(result);
    if (result.ok) {
      setCurrentPassword("");
      setNewPassword("");
      displayPasswordForm(false);
    }
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
                <p className="w-full text-sm text-[#7a5a3c]">
                  {originalEmail || "…"}
                </p>
                <button
                  type="button"
                  aria-label="Change email"
                  className="cursor-pointer text-[#a1866f]"
                  onClick={() => {
                    editEmail(originalEmail);
                    setEmailNotice(null);
                    displayEmailForm(true);
                  }}
                >
                  ✎
                </button>
              </div>

              {emailNotice && (
                <p className={`mt-1 text-xs ${emailNotice.ok ? "text-green-700" : "text-red-500"}`}>
                  {emailNotice.text}
                </p>
              )}

              {emailForm && (
                <div className="mt-3 w-72 rounded-2xl border bg-white p-4 shadow-md">
                  <input
                    type="email"
                    aria-label="New email"
                    value={email}
                    onChange={(e) => editEmail(e.target.value)}
                    className="w-full border rounded-full px-4 py-2 text-sm"
                    placeholder="Enter email"
                  />

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={saveEmail}
                      disabled={isSaving}
                      className="bg-[#7a5a3c] text-white px-4 py-1.5 rounded-full disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save"}
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
                <p className="w-full text-sm text-[#7a5a3c]">••••••••</p>
                <button
                  type="button"
                  aria-label="Change password"
                  className="cursor-pointer text-[#a1866f]"
                  onClick={() => {
                    setPasswordNotice(null);
                    displayPasswordForm(true);
                  }}
                >
                  ✎
                </button>
              </div>

              {passwordNotice && (
                <p className={`mt-1 text-xs ${passwordNotice.ok ? "text-green-700" : "text-red-500"}`}>
                  {passwordNotice.text}
                </p>
              )}

              {passwordForm && (
                <div className="mt-3 w-72 space-y-2 rounded-2xl border bg-white p-4 shadow-md">
                  <input
                    type="password"
                    aria-label="Current password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full border rounded-full px-4 py-2 text-sm"
                    placeholder="Current password"
                  />
                  <input
                    type="password"
                    aria-label="New password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full border rounded-full px-4 py-2 text-sm"
                    placeholder="New password (8+ characters)"
                  />
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={savePassword}
                      disabled={isSaving}
                      className="bg-[#7a5a3c] text-white px-4 py-1.5 rounded-full disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setCurrentPassword("");
                        setNewPassword("");
                        displayPasswordForm(false);
                      }}
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
"use client";

import { useState, useEffect, useCallback } from "react";

export default function AdminServicesPage() {
  type Employee = {
    id: number;
    name: string;
    active: boolean;
  };
  type Service = {
    id: number;
    name: string;
    durationMinutes: number;
    price: string;
    active: boolean;
  };
  type FieldErrors = Partial<
    Record<"name" | "durationMinutes" | "price" | "active", string>
  >;
  type DeleteResult = {
    action: "deleted" | "deactivated";
    service: Service;
  };

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [newService, setNewService] = useState<string>("");
  const [newDuration, setNewDuration] = useState<string>("");
  const [newPrice, setNewPrice] = useState<string>("");
  const [newActive, setNewActive] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [error, setError] = useState<string>("");
  const [notice, setNotice] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch("/api/stylists");
      if (response.ok) {
        const data: Employee[] = await response.json();
        setEmployees(data);
        if (data.length > 0) {
          setSelectedEmployee(data[0].id);
        }
      } else {
        setError("Failed to fetch employees");
        console.error("Failed to fetch employees:", response.status);
      }
    } catch (err) {
      setError("Failed to fetch employees");
      console.error("Failed to fetch employees:", err);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (selectedEmployee !== null) {
      fetchEmployeeServices(selectedEmployee);
    }
  }, [selectedEmployee]);

  async function fetchEmployeeServices(employeeId: number) {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/employee-services?employeeId=${employeeId}`
      );
      if (response.ok) {
        const data = await response.json();
        setServices(data.services);
      } else {
        setError("Failed to fetch employee services");
        console.error("Failed to fetch employee services:", response.status);
      }
    } catch (err) {
      setError("Failed to fetch employee services");
      console.error("Failed to fetch employee services:", err);
    } finally {
      setLoading(false);
    }
  }

  function validateService(): boolean {
    const errors: FieldErrors = {};

    if (!newService.trim()) {
      errors.name = "Service name is required.";
    }

    const duration = Number(newDuration);
    if (!newDuration.trim() || !Number.isInteger(duration) || duration <= 0) {
      errors.durationMinutes = "Duration must be a positive whole number.";
    }

    const price = Number(newPrice);
    if (!newPrice.trim() || !Number.isFinite(price) || price <= 0) {
      errors.price = "Price must be a positive number.";
    }

    setFieldErrors(errors);
    setError("");
    setNotice("");
    return Object.keys(errors).length === 0;
  }

  function normalizeFieldErrors(value: unknown): FieldErrors {
    if (!value || typeof value !== "object") return {};

    return Object.entries(value).reduce<FieldErrors>(
      (result, [field, messages]) => {
        if (
          ["name", "durationMinutes", "price", "active"].includes(field) &&
          Array.isArray(messages) &&
          typeof messages[0] === "string"
        ) {
          result[field as keyof FieldErrors] = messages[0];
        }

        return result;
      },
      {}
    );
  }

  function handleEditService(service: Service) {
    setEditingService(service);
    setNewService(service.name);
    setNewDuration(service.durationMinutes.toString());
    setNewPrice(service.price);
    setNewActive(service.active);
    setShowAddForm(true);
    setFieldErrors({});
    setError("");
    setNotice("");
  }

  async function handleSaveService() {
    if (saving || !validateService()) return;

    setSaving(true);

    try {
      const response = await fetch("/api/admin/services", {
        method: editingService ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingService ? { id: editingService.id } : {}),
          name: newService.trim(),
          durationMinutes: Number(newDuration),
          price: newPrice.trim(),
          active: newActive,
        }),
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setFieldErrors(normalizeFieldErrors(result?.errors));
        setError(
          response.status === 401
            ? "Your admin session has expired. Sign in again, then retry."
            : (result?.error ?? "Service could not be saved. Please retry.")
        );
        return;
      }

      const savedService = result as Service;
      setServices((current) =>
        editingService
          ? current.map((service) =>
              service.id === savedService.id ? savedService : service
            )
          : [...current, savedService]
      );

      const successMessage = editingService
        ? `${savedService.name} updated.`
        : `${savedService.name} added.`;
      resetForm();
      setNotice(successMessage);
    } catch (caught) {
      setError("Service could not be saved. Check your connection and retry.");
      console.error("Failed to save service:", caught);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteService(id: number) {
    if (deletingId !== null) return;

    setDeletingId(id);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/admin/services?id=${id}`, {
        method: "DELETE",
      });
      const result = await response.json().catch(() => null);

      if (!response.ok) {
        setError(
          response.status === 401
            ? "Your admin session has expired. Sign in again, then retry."
            : (result?.error ?? "Service could not be removed. Please retry.")
        );
        return;
      }

      const deleteResult = result as DeleteResult;

      if (deleteResult.action === "deactivated") {
        setServices((current) =>
          current.map((service) =>
            service.id === deleteResult.service.id
              ? deleteResult.service
              : service
          )
        );
        setNotice(
          `${deleteResult.service.name} is used by appointments, so it was deactivated instead of deleted.`
        );
      } else {
        setServices((current) =>
          current.filter((service) => service.id !== deleteResult.service.id)
        );
        setNotice(`${deleteResult.service.name} deleted.`);
      }
    } catch (caught) {
      setError(
        "Service could not be removed. Check your connection and retry."
      );
      console.error("Failed to delete service:", caught);
    } finally {
      setDeletingId(null);
    }
  }

  function resetForm() {
    setNewService("");
    setNewDuration("");
    setNewPrice("");
    setNewActive(true);
    setShowAddForm(false);
    setEditingService(null);
    setError("");
    setFieldErrors({});
  }

  return (
    <main className="min-h-full p-4 sm:p-6 bg-[#fdf8f1]">
      <section className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-6xl rounded-[28px] bg-white px-5 py-6 shadow-[0_18px_50px_rgba(96,74,50,0.1)] sm:min-h-[calc(100vh-3rem)] sm:px-8 sm:py-8 md:px-10 md:py-10">
        <div className="flex flex-col gap-4 border-b border-[#d8c4ae] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-3xl font-semibold text-[#7a5a3c]">Services</h1>

          <p className="text-sm text-[#7a5a3c]">Welcome, Owner</p>
        </div>

        <div className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={selectedEmployee || ""}
              onChange={(event) =>
                setSelectedEmployee(Number(event.target.value))
              }
              className="rounded-full border border-[#dccab5] bg-[#fffaf4] px-4 py-2 text-sm capitalize text-[#7a5a3c] outline-none hover:border-[#bfa17a] transition-colors"
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowAddForm(true);
                setNotice("");
              }}
              className="rounded-full bg-[#7a5a3c] px-4 py-2 text-sm font-medium text-white hover:bg-[#936f50] transition-colors"
            >
              + Add New
            </button>
          </div>

          {selectedEmployee !== null && (
            <p className="mt-4 text-sm font-medium text-[#7a5a3c]">
              Showing services for{" "}
              <span className="capitalize">
                {employees.find((employee) => employee.id === selectedEmployee)
                  ?.name ?? "Employee"}
              </span>
            </p>
          )}

          {showAddForm && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#eadfce] bg-[#fffaf4] p-4 shadow-sm sm:flex-row sm:items-start">
              <div className="w-full">
                <input
                  type="text"
                  value={newService}
                  onChange={(event) => setNewService(event.target.value)}
                  placeholder="Enter service name"
                  disabled={saving}
                  aria-invalid={Boolean(fieldErrors.name)}
                  aria-describedby={
                    fieldErrors.name ? "service-name-error" : undefined
                  }
                  className="w-full rounded-full border border-[#dccab5] bg-white px-4 py-2 text-sm text-[#7a5a3c] outline-none focus:ring-1 focus:ring-[#7a5a3c] disabled:cursor-not-allowed disabled:opacity-60"
                />
                {fieldErrors.name && (
                  <p
                    id="service-name-error"
                    role="alert"
                    className="mt-1 text-xs text-red-600"
                  >
                    {fieldErrors.name}
                  </p>
                )}
              </div>
              <div className="w-full">
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={newDuration}
                  onChange={(event) => setNewDuration(event.target.value)}
                  placeholder="Enter duration (minutes)"
                  disabled={saving}
                  aria-invalid={Boolean(fieldErrors.durationMinutes)}
                  aria-describedby={
                    fieldErrors.durationMinutes
                      ? "service-duration-error"
                      : undefined
                  }
                  className="w-full rounded-full border border-[#dccab5] bg-white px-4 py-2 text-sm text-[#7a5a3c] outline-none focus:ring-1 focus:ring-[#7a5a3c] disabled:cursor-not-allowed disabled:opacity-60"
                />
                {fieldErrors.durationMinutes && (
                  <p
                    id="service-duration-error"
                    role="alert"
                    className="mt-1 text-xs text-red-600"
                  >
                    {fieldErrors.durationMinutes}
                  </p>
                )}
              </div>
              <div className="w-full">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newPrice}
                  onChange={(event) => setNewPrice(event.target.value)}
                  placeholder="Enter price"
                  disabled={saving}
                  aria-invalid={Boolean(fieldErrors.price)}
                  aria-describedby={
                    fieldErrors.price ? "service-price-error" : undefined
                  }
                  className="w-full rounded-full border border-[#dccab5] bg-white px-4 py-2 text-sm text-[#7a5a3c] outline-none focus:ring-1 focus:ring-[#7a5a3c] disabled:cursor-not-allowed disabled:opacity-60"
                />
                {fieldErrors.price && (
                  <p
                    id="service-price-error"
                    role="alert"
                    className="mt-1 text-xs text-red-600"
                  >
                    {fieldErrors.price}
                  </p>
                )}
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active-toggle"
                  checked={newActive}
                  onChange={(event) => setNewActive(event.target.checked)}
                  disabled={saving}
                  className="h-4 w-4 rounded border-[#dccab5] bg-white text-[#7a5a3c] focus:ring-[#7a5a3c]"
                />
                <span className="text-sm text-[#7a5a3c]">Active</span>
              </label>

              <button
                type="button"
                onClick={handleSaveService}
                disabled={saving}
                className="rounded-full bg-[#7a5a3c] px-4 py-2 text-sm font-medium text-white hover:bg-[#936f50] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : editingService ? "Update" : "Save"}
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  resetForm();
                  setEditingService(null);
                }}
                className="rounded-full border border-[#dccab5] px-4 py-2 text-sm font-medium text-[#7a5a3c] hover:bg-[#f7f1eb] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-2 text-sm text-green-700">
              {notice}
            </p>
          )}
        </div>

        <div className="sticky top-0 z-10 mt-6 rounded-2xl border border-[#eadfce] bg-[#fffaf4]/95 px-4 py-3 shadow-sm backdrop-blur">
          <div className="grid grid-cols-6 gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#8f725d]">
            <p>Name</p>
            <p>Duration (min)</p>
            <p>Price</p>
            <p className="text-center">Active</p>
            <p className="text-center">Edit</p>
            <p className="text-center">Delete</p>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-[#eadfce] bg-white shadow-sm">
          {loading ? (
            <div className="px-4 py-3 text-sm text-[#7a5a3c]">
              Loading services...
            </div>
          ) : services.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[#7a5a3c]">
              No services found.
            </div>
          ) : (
            services.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-6 gap-3 border-b border-[#efe4d7] px-4 py-3 text-sm text-[#7a5a3c] last:border-b-0 items-center hover:bg-[#fff7f0] transition-colors"
              >
                <p>{item.name}</p>
                <p>{item.durationMinutes}</p>
                <p>${parseFloat(item.price).toFixed(2)}</p>
                <p className="text-center">
                  {item.active ? "Active" : "Inactive"}
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={() => handleEditService(item)}
                    className="rounded-full bg-[#7a5a3c] px-4 py-2 text-sm font-medium text-white hover:bg-[#936f50] transition-colors"
                  >
                    Edit
                  </button>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => handleDeleteService(item.id)}
                    disabled={deletingId !== null}
                    className="rounded-full bg-[#7a5a3c] px-4 py-2 text-sm font-medium text-white hover:bg-[#936f50] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === item.id ? "Removing..." : "Delete"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}

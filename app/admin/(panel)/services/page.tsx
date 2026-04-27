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

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await fetch('/api/stylists');
      if (response.ok) {
        const data: Employee[] = await response.json();
        setEmployees(data);
        if (data.length > 0) {
          setSelectedEmployee(data[0].id);
        }
      } else {
        setError('Failed to fetch employees');
        console.error('Failed to fetch employees:', response.status);
      }
    } catch (err) {
      setError('Failed to fetch employees');
      console.error('Failed to fetch employees:', err);
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
      const response = await fetch(`/api/admin/employee-services?employeeId=${employeeId}`);
      if (response.ok) {
        const data = await response.json();
        setServices(data.services);
      } else {
        setError('Failed to fetch employee services');
        console.error('Failed to fetch employee services:', response.status);
      }
    } catch (err) {
      setError('Failed to fetch employee services');
      console.error('Failed to fetch employee services:', err);
    } finally {
      setLoading(false);
    }
  }

  function validateService(): boolean {
    if (!newService.trim()) {
      setError("Service name is required.");
      return false;
    }
    const duration = parseFloat(newDuration);
    if (!newDuration.trim() || isNaN(duration) || duration <= 0) {
      setError("Duration must be a positive number.");
      return false;
    }
    const price = parseFloat(newPrice);
    if (!newPrice.trim() || isNaN(price) || price <= 0) {
      setError("Price must be a positive number.");
      return false;
    }
    setError("");
    return true;
  }

  function handleAddService() {
    if (!validateService()) return;

    const newServiceEntry: Service = {
      id: Math.max(...services.map(s => s.id), 0) + 1,
      name: newService.trim(),
      durationMinutes: parseInt(newDuration),
      price: newPrice,
      active: newActive
    };
    setServices([...services, newServiceEntry]);
    resetForm();
  }

  function handleEditService(service: Service) {
    setEditingService(service);
    setNewService(service.name);
    setNewDuration(service.durationMinutes.toString());
    setNewPrice(service.price);
    setNewActive(service.active);
    setShowAddForm(true);
  }

  function handleUpdateService() {
    if (!validateService() || !editingService) return;

    const updatedServices = services.map(s =>
      s.id === editingService.id
        ? { ...s, name: newService.trim(), durationMinutes: parseInt(newDuration), price: newPrice, active: newActive }
        : s
    );
    setServices(updatedServices);
    resetForm();
    setEditingService(null);
  }

  const handleDeleteClick = async (id: number) => {
    await handleDeleteService(id);
  };

  async function handleDeleteService(id: number) {
    try {
      const response = await fetch(`/api/admin/employee-services?serviceId=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const updatedServices = services.filter(service => service.id !== id);
        setServices(updatedServices);
      } else {
        setError('Failed to delete service');
        console.error('Failed to delete service:', response.status);
      }
    } catch (err) {
      setError('Failed to delete service');
      console.error('Failed to delete service:', err);
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
              onChange={(event) => setSelectedEmployee(Number(event.target.value))}
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
              onClick={() => setShowAddForm(true)}
              className="rounded-full bg-[#7a5a3c] px-4 py-2 text-sm font-medium text-white hover:bg-[#936f50] transition-colors"
            >
              + Add New
            </button>
          </div>

          {selectedEmployee !== null && (
            <p className="mt-4 text-sm font-medium text-[#7a5a3c]">
              Showing services for <span className="capitalize">{employees.find((employee) => employee.id === selectedEmployee)?.name ?? "Employee"}</span>
            </p>
          )}

          {showAddForm && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#eadfce] bg-[#fffaf4] p-4 sm:flex-row sm:items-center shadow-sm">
              <input
                type="text"
                value={newService}
                onChange={(event) => setNewService(event.target.value)}
                placeholder="Enter service name"
                className="w-full rounded-full border border-[#dccab5] bg-white px-4 py-2 text-sm text-[#7a5a3c] outline-none focus:ring-1 focus:ring-[#7a5a3c]"
              />
              <input
                type="number"
                value={newDuration}
                onChange={(event) => setNewDuration(event.target.value)}
                placeholder="Enter duration (minutes)"
                className="w-full rounded-full border border-[#dccab5] bg-white px-4 py-2 text-sm text-[#7a5a3c] outline-none focus:ring-1 focus:ring-[#7a5a3c]"
              />
              <input
                type="number"
                step="0.01"
                value={newPrice}
                onChange={(event) => setNewPrice(event.target.value)}
                placeholder="Enter price"
                className="w-full rounded-full border border-[#dccab5] bg-white px-4 py-2 text-sm text-[#7a5a3c] outline-none focus:ring-1 focus:ring-[#7a5a3c]"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active-toggle"
                  checked={newActive}
                  onChange={(event) => setNewActive(event.target.checked)}
                  className="h-4 w-4 rounded border-[#dccab5] bg-white text-[#7a5a3c] focus:ring-[#7a5a3c]"
                />
                <span className="text-sm text-[#7a5a3c]">Active</span>
              </label>

              <button
                type="button"
                onClick={editingService ? handleUpdateService : handleAddService}
                className="rounded-full bg-[#7a5a3c] px-4 py-2 text-sm font-medium text-white hover:bg-[#936f50] transition-colors"
              >
                {editingService ? 'Update' : 'Save'}
              </button>

              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setEditingService(null);
                }}
                className="rounded-full border border-[#dccab5] px-4 py-2 text-sm font-medium text-[#7a5a3c] hover:bg-[#f7f1eb] transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
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
            <div className="px-4 py-3 text-sm text-[#7a5a3c]">Loading services...</div>
          ) : services.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[#7a5a3c]">No services found.</div>
          ) : (
            services.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-6 gap-3 border-b border-[#efe4d7] px-4 py-3 text-sm text-[#7a5a3c] last:border-b-0 items-center hover:bg-[#fff7f0] transition-colors"
              >
                <p>{item.name}</p>
                <p>{item.durationMinutes}</p>
                <p>${parseFloat(item.price).toFixed(2)}</p>
                <p className="text-center">{item.active ? "Active" : "Inactive"}</p>
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
                    onClick={() => handleDeleteClick(item.id)}
                    className="rounded-full bg-[#7a5a3c] px-4 py-2 text-sm font-medium text-white hover:bg-[#936f50] transition-colors"
                  >
                    Delete
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
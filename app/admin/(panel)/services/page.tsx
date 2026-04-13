"use client";

import { useState } from "react";

export default function AdminServicesPage() {
  // Employee type definition
  type Employee = {
    name: string;
  };
  // temporary employee data to be replaced with actual data from the database
  const employees: Employee[] = [
    { name: "jeline doe" },
    { name: "tana mathews" }
  ];
  // Service type definition
  type Service = {
    service: string;
    duration: string;
    price: number;
    active: boolean;
  };

  const services: Service[] = [
    { service: "nails", duration: "30 mins", price: 25, active: true },
    { service: "manicure", duration: "20 mins", price: 15, active: true },
    { service: "padicure", duration: "25 mins", price: 20, active: false }
  ];

  const [selectedEmployee, setSelectedEmployee] = useState<string>(employees[0].name);
  const [serviceList, setServiceList] = useState<Service[]>(services);
  const [newService, setNewService] = useState<string>("");
  const [newDuration, setNewDuration] = useState<string>("");
  const [newPrice, setNewPrice] = useState<number>(0);
  const [newActive, setNewActive] = useState<boolean>(true);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // basic validation functions for fields in the add service form
  function validateService(): boolean {
    if (!newService.trim()) {
      setError("Service name is required.");
      return false;
    }
    if (!newDuration.trim()) {
      setError("Duration is required.");
      return false;
    }
    if (isNaN(newPrice) || newPrice <= 0) {
      setError("Price must be a positive number.");
      return false;
    }
    setError("");
    return true;
  }

  function handleAddService() {
    if (!validateService()) return;

    // Create a new service entry based on the form inputs
    const newServiceEntry: Service = {
      service: newService.trim(),
      duration: newDuration,
      price: newPrice,
      active: newActive
    };
    // add the new service entry to the existing services list
    setServiceList([...serviceList, newServiceEntry]);
    // Reset form fields and hide the add form
    setNewService("");
    setNewDuration("");
    setNewPrice(0);
    setNewActive(true);
    setShowAddForm(false);
  }

  
  function handleDeleteService(serviceName: string) {
    const updatedServices = serviceList.filter(service => service.service !== serviceName);
    setServiceList(updatedServices);
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
              value={selectedEmployee}
              onChange={(event) => setSelectedEmployee(event.target.value)}
              className="rounded-full border border-[#dccab5] bg-[#fffaf4] px-4 py-2 text-sm capitalize text-[#7a5a3c] outline-none hover:border-[#bfa17a] transition-colors"
            >
              {employees.map((employee, index) => (
                <option key={index} value={employee.name}>
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
                type="text"
                value={newDuration}
                onChange={(event) => setNewDuration(event.target.value)}
                placeholder="Enter duration"
                className="w-full rounded-full border border-[#dccab5] bg-white px-4 py-2 text-sm text-[#7a5a3c] outline-none focus:ring-1 focus:ring-[#7a5a3c]"
              />
              <input
                type="text"
                value={newPrice}
                onChange={(event) => setNewPrice(Number(event.target.value))}
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
                onClick={handleAddService}
                className="rounded-full bg-[#7a5a3c] px-4 py-2 text-sm font-medium text-white hover:bg-[#936f50] transition-colors"
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewDuration("");
                  setNewPrice(0);
                  setNewService("");
                  setNewActive(true);
                  setShowAddForm(false);
                  setError("");
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
          <div className="grid grid-cols-5 gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#8f725d]">
            <p>Services</p>
            <p>Duration</p>
            <p>Price</p>
            <p className="text-center">Active Toggle</p>
            <p className="text-center">Actions</p>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-[#eadfce] bg-white shadow-sm">
          {serviceList.map((item, index) => (
            <div
              key={`${item.service}-${index}`}
              className="grid grid-cols-5 gap-3 border-b border-[#efe4d7] px-4 py-3 text-sm text-[#7a5a3c] last:border-b-0 items-center hover:bg-[#fff7f0] transition-colors"
            >
              <p>{item.service}</p>
              <p>{item.duration}</p>
              <p>${item.price}</p>
              <p className="text-center">{item.active ? "Active" : "Inactive"}</p>
              <div className="flex justify-center">
                <button
                  onClick={() => handleDeleteService(item.service)}
                  className="rounded-full bg-[#7a5a3c] px-4 py-2 text-sm font-medium text-white hover:bg-[#936f50] transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section> 
    </main>
  );
}
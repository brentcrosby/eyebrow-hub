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
    { name: "tana mathews" },
    { name: "michael smith" },
    { name: "sarah johnson" },
    { name: "david brown" },
    { name: "emily davis" }
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
  const [newService, setNewService] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  
  function handleAddService() {
    if (!newService.trim()) {
      return;
    }

    // For now this only closes the form without adding to the UI list yet.
    setNewService("");
    setShowAddForm(false);
  }

  return (
    <main className="min-h-full p-4 sm:p-6">
      <section className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-6xl rounded-[28px] bg-white px-5 py-6 shadow-[0_18px_45px_rgba(96,74,50,0.08)] sm:min-h-[calc(100vh-3rem)] sm:px-8 sm:py-8 md:px-10 md:py-10">
        <div className="flex flex-col gap-4 border-b border-[#d8c4ae] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-3xl font-semibold text-[#7a5a3c]">Services</h1>

          <p className="text-sm text-[#7a5a3c]">Welcome, Owner</p>
        </div>

        <div className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              value={selectedEmployee}
              onChange={(event) => setSelectedEmployee(event.target.value)}
              className="rounded-full border border-[#dccab5] bg-[#fffaf4] px-4 py-2 text-sm capitalize text-[#7a5a3c] outline-none"
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
              className="rounded-full bg-[#7a5a3c] px-4 py-2 text-sm font-medium text-white"
            >
              + Add New
            </button>
          </div>

          {showAddForm && (
            <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#eadfce] bg-[#fffaf4] p-4 sm:flex-row sm:items-center">
              <input
                type="text"
                value={newService}
                onChange={(event) => setNewService(event.target.value)}
                placeholder="Enter service name"
                className="w-full rounded-full border border-[#dccab5] bg-white px-4 py-2 text-sm text-[#7a5a3c] outline-none"
              />

              <button
                type="button"
                onClick={handleAddService}
                className="rounded-full bg-[#7a5a3c] px-4 py-2 text-sm font-medium text-white"
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => {
                  setNewService("");
                  setShowAddForm(false);
                }}
                className="rounded-full border border-[#dccab5] px-4 py-2 text-sm font-medium text-[#7a5a3c]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      
        <div className="sticky top-0 z-10 mt-6 rounded-2xl border border-[#eadfce] bg-[#fffaf4]/95 px-4 py-3 shadow-sm backdrop-blur">
          <div className="grid grid-cols-4 gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#8f725d]">
            <p>Services</p>
            <p>Duration</p>
            <p>Price</p>
            <p>Active Toggle</p>
          </div>
        </div>

        <div className="mt-3 overflow-hidden rounded-2xl border border-[#eadfce] bg-white">
          {services.map((item, index) => (
            <div
              key={`${item.service}-${index}`}
              className="grid grid-cols-4 gap-3 border-b border-[#efe4d7] px-4 py-3 text-sm text-[#7a5a3c] last:border-b-0"
            >
              <p>{item.service}</p>
              <p>{item.duration}</p>
              <p>${item.price}</p>
              <p>{item.active ? "Active" : "Inactive"}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

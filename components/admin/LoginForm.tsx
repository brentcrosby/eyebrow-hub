"use client";

import { ChangeEvent, FormEvent, useState } from "react";

type FormValues = {
  email: string;
  password: string;
};

type FormErrors = {
  email?: string;
  password?: string;
};

const initialValues: FormValues = {
  email: "",
  password: "",
};

export default function LoginForm() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  function validate(nextValues: FormValues): FormErrors {
    const nextErrors: FormErrors = {};
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!nextValues.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailPattern.test(nextValues.email)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!nextValues.password.trim()) {
      nextErrors.password = "Password is required.";
    }

    return nextErrors;
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;

    const nextValues: FormValues = {
      ...values,
      [name]: value,
    } as FormValues;

    setValues(nextValues);

    if (submitted || errors[name as keyof FormErrors]) {
      setErrors(validate(nextValues));
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitted(true);

    const validationErrors = validate(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    console.log("Login form submitted:", values);
  }

  const isSubmitDisabled = !values.email.trim() || !values.password.trim();

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="Enter your email"
          value={values.email}
          onChange={handleChange}
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? "email-error" : undefined}
        />
        {errors.email && (
          <p id="email-error" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="Enter your password"
          value={values.password}
          onChange={handleChange}
          aria-invalid={errors.password ? "true" : "false"}
          aria-describedby={errors.password ? "password-error" : undefined}
        />
        {errors.password && (
          <p id="password-error" role="alert">
            {errors.password}
          </p>
        )}
      </div>

      <button type="submit" disabled={isSubmitDisabled}>
        Sign In
      </button>
    </form>
  );
}
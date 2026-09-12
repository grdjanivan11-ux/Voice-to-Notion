"use client";

import {
  useEffect,
  useState,
} from "react";

type Theme =
  | "dark"
  | "light";

const STORAGE_KEY =
  "voice-to-notion-theme";

export default function ThemeToggle() {
  const [theme, setTheme] =
    useState<Theme>("dark");

  useEffect(() => {
    const storedTheme =
      localStorage.getItem(
        STORAGE_KEY
      ) as Theme | null;

    const initialTheme: Theme =
      storedTheme === "light" ||
      storedTheme === "dark"
        ? storedTheme
        : "dark";

    setTheme(initialTheme);

    document.documentElement.setAttribute(
      "data-theme",
      initialTheme
    );
  }, []);

  function toggleTheme() {
    const nextTheme: Theme =
      theme === "dark"
        ? "light"
        : "dark";

    setTheme(nextTheme);

    localStorage.setItem(
      STORAGE_KEY,
      nextTheme
    );

    document.documentElement.setAttribute(
      "data-theme",
      nextTheme
    );
  }

  return (
    <button
      type="button"
      onClick={
        toggleTheme
      }
      className="vtn-theme-toggle"
      aria-label={
        theme === "dark"
          ? "Switch to light theme"
          : "Switch to dark theme"
      }
      title={
        theme === "dark"
          ? "Light mode"
          : "Dark mode"
      }
    >
      <div className="vtn-theme-track">
        <span aria-hidden="true">
          ☾
        </span>

        <span aria-hidden="true">
          ☀
        </span>
      </div>

      <div
        className="vtn-theme-thumb"
        aria-hidden="true"
      />
    </button>
  );
}
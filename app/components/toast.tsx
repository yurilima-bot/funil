"use client";
import { useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "info" | "warn" | "";
  onHide: () => void;
}

export default function Toast({ message, type, onHide }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onHide, 2800);
    return () => clearTimeout(t);
  }, [message, onHide]);

  return (
    <div className={`toast ${message ? "show" : ""} ${type ? `toast-${type}` : ""}`}>
      {message}
    </div>
  );
}
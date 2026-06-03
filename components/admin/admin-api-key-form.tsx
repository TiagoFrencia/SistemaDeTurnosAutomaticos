"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, days = 30) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

export default function AdminApiKeyForm() {
  const router = useRouter();
  const [key, setKey] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fromStorage = typeof window !== "undefined" ? localStorage.getItem("ADMIN_API_KEY") : null;
    const fromCookie = readCookie("admin_api_key");
    const initial = fromStorage || fromCookie || "";
    setKey(initial);
  }, []);

  function save() {
    if (typeof window !== "undefined") {
      const trimmedKey = key.trim();
      localStorage.setItem("ADMIN_API_KEY", trimmedKey);
      setCookie("admin_api_key", trimmedKey, 30);
      setKey(trimmedKey);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    }
  }

  function clearKey() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("ADMIN_API_KEY");
      deleteCookie("admin_api_key");
      setKey("");
      router.refresh();
    }
  }

  return (
    <div className="admin-subsection">
      <h3>Clave Admin (para uso en API)</h3>
      <p className="muted">Guarda un token seguro que sera usado por el panel para llamadas admin.</p>
      <div className="admin-inline-controls">
        <input
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder="Ingrese ADMIN_API_KEY"
          style={{ flex: 1 }}
        />
        <button className="admin-primary-button" onClick={save} type="button">
          Guardar
        </button>
        <button className="admin-button" onClick={clearKey} type="button">
          Borrar
        </button>
      </div>
      {saved ? <p className="admin-success">Clave guardada. Si es correcta, el panel se habilita al recargar.</p> : null}
    </div>
  );
}

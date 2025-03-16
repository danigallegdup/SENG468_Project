"use client";

import React, { useState } from "react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true); // Toggle between login & register
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(""); // Only used in register mode
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    try {
      // Determine the endpoint based on whether user is logging in or registering
      const endpoint = isLogin
        ? "http://localhost:8080/authentication/login"
        : "http://localhost:8080/authentication/register";

      // Build the request body
      const body = isLogin
        ? { user_name: username, password }
        : { user_name: username, password, name: fullName };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok || data.success === false) {
        setErrorMessage(data?.data?.error || "Request failed");
        return;
      }

      // Success: log token to console (if login)
      if (isLogin && data.data?.token) {
        console.log("Token:", data.data.token);
        alert("Logged in successfully!");
        // Optionally store token or navigate
        // localStorage.setItem("jwt_token", data.data.token);
        // router.push("/home");
      } else {
        alert("Registration successful!");
        // Optionally switch to login mode automatically
        // setIsLogin(true);
      }
    } catch (err) {
      console.error("Auth error:", err);
      setErrorMessage("An unexpected error occurred");
    }
  }

  return (
    <div
      style={{
        padding: "1rem",
        backgroundColor: "#121212",
        color: "#fff",
        minHeight: "100vh",
      }}
    >
      <h1>{isLogin ? "Login" : "Register"}</h1>
      <p>This is the {isLogin ? "login" : "registration"} page.</p>

      <div style={{ margin: "1rem 0" }}>
        {/* Toggle Button */}
        <button
          style={{
            backgroundColor: "#555",
            color: "#fff",
            border: "none",
            padding: "0.5rem 1rem",
            cursor: "pointer",
            marginRight: "0.5rem",
          }}
          onClick={() => setIsLogin(!isLogin)}
        >
          Switch to {isLogin ? "Register" : "Login"}
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Username:
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                marginLeft: "0.5rem",
                backgroundColor: "#333",
                color: "#fff",
                border: "1px solid #555",
                padding: "0.25rem",
              }}
            />
          </label>
        </div>

        <div style={{ marginBottom: "0.5rem" }}>
          <label>
            Password:
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                marginLeft: "0.5rem",
                backgroundColor: "#333",
                color: "#fff",
                border: "1px solid #555",
                padding: "0.25rem",
              }}
            />
          </label>
        </div>

        {/* Show Full Name field only in Register mode */}
        {!isLogin && (
          <div style={{ marginBottom: "0.5rem" }}>
            <label>
              Full Name:
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  marginLeft: "0.5rem",
                  backgroundColor: "#333",
                  color: "#fff",
                  border: "1px solid #555",
                  padding: "0.25rem",
                }}
              />
            </label>
          </div>
        )}

        <button
          type="submit"
          style={{
            backgroundColor: "#555",
            color: "#fff",
            border: "none",
            padding: "0.5rem 1rem",
            cursor: "pointer",
          }}
        >
          {isLogin ? "Log In" : "Register"}
        </button>
      </form>

      {errorMessage && (
        <p style={{ color: "red", marginTop: "1rem" }}>
          Error: {errorMessage}
        </p>
      )}
    </div>
  );
}

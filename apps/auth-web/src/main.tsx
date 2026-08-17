import { createRoot } from "react-dom/client";
import { SignInApp } from "./sign-in-app";
import "./styles.css";

const root = document.getElementById("auth-root");
if (!root) throw new Error("Missing Auth Web root");

createRoot(root).render(<SignInApp />);

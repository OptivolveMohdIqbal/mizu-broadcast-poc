import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // Or vue(), etc.

export default defineConfig({
  plugins: [react()],
  // Add the server configuration here
  server: {
    port: 5174, // Replace 3000 with your preferred port number
  },
});

import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: 30000,
});

// ---------------------------------------------------------
// AUTHENTICATION
// ---------------------------------------------------------
// Attach the JWT stored during login to every protected
// FastAPI request.
// ---------------------------------------------------------

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------
// AUTH ERROR HANDLING
// ---------------------------------------------------------
// If the backend says the token is invalid/expired,
// clear the local session and return the user to login.
// Do not redirect for ordinary 403 authorization failures.
// ---------------------------------------------------------

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user_email");
      localStorage.removeItem("user_role");

      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default api;

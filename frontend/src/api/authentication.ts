import { getCookie } from "../utils/cookie";

const serverUrl = "http://localhost:5000";
const signUpUrl = serverUrl + "/signup";
const signInUrl = serverUrl + "/signin";
const logoutUrl = serverUrl + "/logout";
const userDetailsUrl = serverUrl + "/user-details";

export async function postSignUpRequest(
  firstName: string,
  lastName: string,
  email: string,
  password: string
) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      email: email,
      password: password,
    }),
  };
  try {
    const response = await fetch(signUpUrl, options);
    if (response.ok) {
      const jsonData = await response.json();
      return jsonData;
    } else {
      throw new Error("Request failed");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function postSignInRequest(email: string, password: string) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email,
      password: password,
    }),
  };
  try {
    const response = await fetch(signInUrl, options);
    if (response.ok) {
      const jsonData = await response.json();
      return jsonData;
    } else {
      throw new Error("Request failed");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function postLogoutRequest() {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: { "Content-Type": "application/json" },
  };
  try {
    const response = await fetch(logoutUrl, options);
    if (response.ok) {
      const jsonData = await response.json();
      return jsonData;
    } else {
      throw new Error("Request failed");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function getUserDetails() {
  const headers = new Headers({
    "Content-Type": "application/json",
    "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
  });

  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: headers,
  };
  try {
    const response = await fetch(userDetailsUrl, options);
    console.log("response", response);

    if (response.ok) {
      const jsonData = await response.json();
      return jsonData;
    } else if (response.status === 404) {
      return {};
    } else {
      throw new Error("Request failed");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

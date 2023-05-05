const serverUrl = "http://localhost:5000";
const hospitalProfileUrl = serverUrl + "/hospital-profile";
const signUpUrl = serverUrl + "/signup";
const signInUrl = serverUrl + "/signin";
const logoutUrl = serverUrl + "/logout";
const protectedUrl = serverUrl + "/protected";

export async function fetchHospitalProfile() {
  const options: RequestInit = {
    method: "GET",
    credentials: "include" as RequestCredentials,
    headers: { "Content-Type": "application/json" },
  };
  try {
    const response = await fetch(hospitalProfileUrl, options);
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

export async function postHospitalProfile(entry: string, status: number) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entry: entry, status: status }),
  };
  try {
    const response = await fetch(hospitalProfileUrl, options);
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

export async function getProtectedRequest() {
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
    const response = await fetch(protectedUrl, options);
    if (response.ok) {
      const jsonData = await response.json();
      return jsonData;
    } else if (response.status === 401) {
      return { msg: "Access denied" };
    } else {
      throw new Error("Request failed");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(";").shift();
    return cookieValue !== undefined ? cookieValue : "";
  }
  return "";
}

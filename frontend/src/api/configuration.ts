import { getCookie } from "../utils/cookie";

const serverUrl = "http://localhost:5000";
const optionHospitalUrl = serverUrl + "/option-hospital";
const createHospitalUrl = serverUrl + "/create-hospital";
const hospitalInfoUrl = serverUrl + "/hospital-info";
const createUserUrl = serverUrl + "/create-user";
const hospitalUsersUrl = serverUrl + "/hospital-users";
const userProfileUrl = serverUrl + "/user-profile";

export async function postHospitalInfo(hospitalName: string, userId: string) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      hospital_name: hospitalName,
      user_id: userId,
    }),
  };
  try {
    const response = await fetch(createHospitalUrl, options);
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

export async function postHospitalOption(
  option: string,
  dictPath: string[],
  hospitalId: string
) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      option: option,
      dict_path: dictPath,
      hospital_id: hospitalId,
    }),
  };
  try {
    const response = await fetch(optionHospitalUrl, options);
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

export async function deleteHospitalOption(
  dictPath: string[],
  hospitalId: string
) {
  const options: RequestInit = {
    method: "DELETE",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      dict_path: dictPath,
      hospital_id: hospitalId,
    }),
  };
  try {
    const response = await fetch(optionHospitalUrl, options);
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

export async function postHospitalInfoRequest(hospitalId: string) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({ hospital_id: hospitalId }),
  };
  try {
    const response = await fetch(hospitalInfoUrl, options);
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

export async function postCreateUser(
  firstName: string,
  lastName: string,
  email: string,
  hospitalId: string
) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      email: email,
      hospital_id: hospitalId,
    }),
  };
  try {
    const response = await fetch(createUserUrl, options);
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

export async function postHospitalUsersRequest(hospitalId: string) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      hospital_id: hospitalId,
    }),
  };
  try {
    const response = await fetch(hospitalUsersUrl, options);
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

export async function postUserProfile(
  profile: Record<string, any>,
  userId: string
) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      user_id: userId,
      profile: profile,
    }),
  };
  try {
    const response = await fetch(userProfileUrl, options);
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

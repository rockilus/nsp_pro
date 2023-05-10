import HospitalInfo from "../components/HospitalInfo";
import { getCookie } from "../utils/cookie";

const serverUrl = "http://localhost:5000";
const optionHospitalUrl = serverUrl + "/option-hospital";
const createHospitalUrl = serverUrl + "/create-hospital";
const hospitalInfoUrl = serverUrl + "/hospital-info";

// export async function postHospitalProfile(entry: string, status: number) {
//   const options: RequestInit = {
//     method: "POST",
//     credentials: "include" as RequestCredentials,
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ entry: entry, status: status }),
//   };
//   try {
//     const response = await fetch(hospitalProfileUrl, options);
//     if (response.ok) {
//       const jsonData = await response.json();
//       return jsonData;
//     } else {
//       throw new Error("Request failed");
//     }
//   } catch (error: any) {
//     throw new Error(error.message);
//   }
// }

// export async function getHospitalInfo() {
//   const options: RequestInit = {
//     method: "GET",
//     credentials: "include" as RequestCredentials,
//     headers: {
//       "Content-Type": "application/json",
//       "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
//     },
//   };
//   try {
//     const response = await fetch(hospitalInfoUrl, options);
//     if (response.ok) {
//       const jsonData = await response.json();
//       return jsonData;
//     } else {
//       throw new Error("Request failed");
//     }
//   } catch (error: any) {
//     throw new Error(error.message);
//   }
// }

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

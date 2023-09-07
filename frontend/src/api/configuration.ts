import { Dayjs } from "dayjs";

import { getCookie } from "../utils/cookie";

// const serverUrl = "http://localhost:5000";
const serverUrl = "http://127.0.0.1:5000";
const optionHospitalUrl = serverUrl + "/option-hospital";
const createHospitalUrl = serverUrl + "/create-hospital";
const hospitalInfoUrl = serverUrl + "/hospital-info";
const createUserUrl = serverUrl + "/create-user";
const hospitalUsersUrl = serverUrl + "/hospital-users";
const userProfileUrl = serverUrl + "/user-profile";
const updateParameterUrl = serverUrl + "/parameter";
const getScheduleUrl = serverUrl + "/get-schedule";
const getScheduleListUrl = serverUrl + "/get-schedule-list";
const buildScheduleUrl = serverUrl + "/build-schedule";
const addWorkerParamUrl = serverUrl + "/create-worker-param";
const getWorkerParamsUrl = serverUrl + "/get-worker-params";
const updatedWorkerParamUrl = serverUrl + "/update-worker-param";
const deleteWorkerParamUrl = serverUrl + "/delete-worker-param";
const createWorkerUrl = serverUrl + "/create-worker";
const getWorkersUrl = serverUrl + "/get-workers";
const updateWorkerPropertyUrl = serverUrl + "/update-worker-property";
const deleteWorkerUrl = serverUrl + "/delete-worker";

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

export async function postParameterUpdate(
  parameter: string,
  value: string,
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
      hospital_id: hospitalId,
      parameter: parameter,
      value: value,
    }),
  };
  try {
    const response = await fetch(updateParameterUrl, options);
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

export async function postGetScheduleXDays(
  hospitalId: string,
  startDate: Dayjs,
  numDays: number
) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      hospital_id: hospitalId,
      start_date: startDate.format("YYYY-MM-DD"),
      num_days: numDays,
    }),
  };
  try {
    const response = await fetch(getScheduleUrl, options);
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

export async function postGetScheduleList(
  hospitalId: string,
  startDate: Dayjs,
  endDate: Dayjs
) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      hospital_id: hospitalId,
      start_date: startDate.format("YYYY-MM-DD"),
      end_date: endDate.format("YYYY-MM-DD"),
    }),
  };
  try {
    const response = await fetch(getScheduleListUrl, options);
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

export async function postBuildSchedule(
  hospitalId: string,
  authorId: string,
  startDate: Dayjs,
  endDate: Dayjs
) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      hospital_id: hospitalId,
      author_id: authorId,
      start_date: startDate.format("YYYY-MM-DD"),
      end_date: endDate.format("YYYY-MM-DD"),
    }),
  };
  try {
    const response = await fetch(buildScheduleUrl, options);
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

// Worker Param

export async function serverPostCreateWorkerParam(
  label: string,
  entryType: string,
  entryOptions: string[]
) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      label: label,
      entry_type: entryType,
      entry_options: entryOptions,
    }),
  };
  try {
    const response = await fetch(addWorkerParamUrl, options);
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

export async function serverGetWorkerParams() {
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
    const response = await fetch(getWorkerParamsUrl, options);
    if (response.ok) {
      const jsonData = await response.json();
      console.log("response getWorkerParams", jsonData);
      return jsonData;
    } else {
      throw new Error("Request failed");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function serverPostUpdateWorkerParam(
  workerParamId: string,
  label: string,
  entryType: string,
  entryOptions: string[]
) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      worker_param_id: workerParamId,
      label: label,
      entry_type: entryType,
      entry_options: entryOptions,
    }),
  };
  try {
    const response = await fetch(updatedWorkerParamUrl, options);
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

export async function serverDeleteWorkerParam(workerParamId: string) {
  console.log("deleteWorker", workerParamId);

  const options: RequestInit = {
    method: "DELETE",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      worker_param_id: workerParamId,
    }),
  };
  try {
    const response = await fetch(deleteWorkerParamUrl, options);
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

// Worker

export async function serverPostCreateWorker() {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
  };
  try {
    const response = await fetch(createWorkerUrl, options);
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

export async function serverGetWorkers() {
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
    const response = await fetch(getWorkersUrl, options);
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

export async function serverPostUpdateWorkerProperty(
  workerId: string,
  workerParamId: string,
  value: any
) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      worker_id: workerId,
      worker_param_id: workerParamId,
      value: value,
    }),
  };
  try {
    const response = await fetch(updateWorkerPropertyUrl, options);
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

export async function serverDeleteWorker(workerId: string) {
  console.log("deleteWorker", workerId);

  const options: RequestInit = {
    method: "DELETE",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      worker_id: workerId,
    }),
  };
  try {
    const response = await fetch(deleteWorkerUrl, options);
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

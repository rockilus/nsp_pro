import { Dayjs } from "dayjs";

import { getCookie } from "../utils/cookie";

// const serverUrl = "http://localhost:5000";
const serverUrl = "http://127.0.0.1:5000";

// Worker Param
const addWorkerParamUrl = serverUrl + "/create-worker-param";
const getWorkerParamsUrl = serverUrl + "/get-worker-params";
const updateWorkerParamUrl = serverUrl + "/update-worker-param";
const deleteWorkerParamUrl = serverUrl + "/delete-worker-param";

// Worker
const createWorkerUrl = serverUrl + "/create-worker";
const getWorkersUrl = serverUrl + "/get-workers";
const deleteWorkerUrl = serverUrl + "/delete-worker";

// Worker Property
const updateWorkerPropertyUrl = serverUrl + "/update-worker-property";

// Shift Param
const createShiftParamUrl = serverUrl + "/create-shift-param";
const getShiftParamsUrl = serverUrl + "/get-shift-params";
const updateShiftParamUrl = serverUrl + "/update-shift-param";
const deleteShiftParamUrl = serverUrl + "/delete-shift-param";

// Shift
const createShiftUrl = serverUrl + "/create-shift";
const getShiftsUrl = serverUrl + "/get-shifts";
const deleteShiftUrl = serverUrl + "/delete-shift";

// Shift Property
const updateShiftPropertyUrl = serverUrl + "/update-shift-property";

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
    const response = await fetch(updateWorkerParamUrl, options);
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

// Shift Param

export async function serverPostCreateShiftParam(
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
    const response = await fetch(createShiftParamUrl, options);
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

export async function serverGetShiftParams() {
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
    const response = await fetch(getShiftParamsUrl, options);
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

export async function serverPostUpdateShiftParam(
  shiftParamId: string,
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
      shift_param_id: shiftParamId,
      label: label,
      entry_type: entryType,
      entry_options: entryOptions,
    }),
  };
  try {
    const response = await fetch(updateShiftParamUrl, options);
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

export async function serverDeleteShiftParam(shiftParamId: string) {
  const options: RequestInit = {
    method: "DELETE",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      shift_param_id: shiftParamId,
    }),
  };
  try {
    const response = await fetch(deleteShiftParamUrl, options);
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

// Shift

export async function serverPostCreateShift() {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
  };
  try {
    const response = await fetch(createShiftUrl, options);
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

export async function serverGetShifts() {
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
    const response = await fetch(getShiftsUrl, options);
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

export async function serverPostUpdateShiftProperty(
  shiftId: string,
  shiftParamId: string,
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
      shift_id: shiftId,
      shift_param_id: shiftParamId,
      value: value,
    }),
  };
  try {
    const response = await fetch(updateShiftPropertyUrl, options);
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

export async function serverDeleteShift(shiftId: string) {
  const options: RequestInit = {
    method: "DELETE",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      shift_id: shiftId,
    }),
  };
  try {
    const response = await fetch(deleteShiftUrl, options);
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

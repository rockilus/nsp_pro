import { getCookie } from "../utils/cookie";

const serverUrl = "http://127.0.0.1:5000";

// TimeTable
const createTimetableUrl = serverUrl + "/create-timetable";
const getTimetablesUrl = serverUrl + "/get-timetable";
// const updateTimetableUrl = serverUrl + "/update-timetable";
const deleteTimetableUrl = serverUrl + "/delete-timetable";

// TimeTable Time
const createTimetableTimeUrl = serverUrl + "/create-timetable-time";
const getTimetableTimesUrl = serverUrl + "/get-timetable-times";
const updateTimetableTimeUrl = serverUrl + "/update-timetable-time";
const deleteTimetableTimeUrl = serverUrl + "/delete-timetable-time";

// TimeTable Category
const createTimetableCategoryUrl = serverUrl + "/create-timetable-category";
const getTimetableCategoriesUrl = serverUrl + "/get-timetable-categories";
const updateTimetableCategoryUrl = serverUrl + "/update-timetable-category";
const deleteTimetableCategoryUrl = serverUrl + "/delete-timetable-category";

// TimeTable Property
const createTimetablePropertyUrl = serverUrl + "/create-timetable-property";
const getTimetablePropertiesUrl = serverUrl + "/get-timetable-properties";
const updateTimetablePropertyUrl = serverUrl + "/update-timetable-property";
const deleteTimetablePropertyUrl = serverUrl + "/delete-timetable-property";

// Timetable
export async function serverPostCreateTimetable() {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
  };
  try {
    const response = await fetch(createTimetableUrl, options);
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

export async function serverGetTimetables() {
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
    const response = await fetch(getTimetablesUrl, options);
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

export async function serverDeleteTimetable(timetableId: string) {
  console.log("deleteTimetable", timetableId);

  const options: RequestInit = {
    method: "DELETE",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      timetable_id: timetableId,
    }),
  };
  try {
    const response = await fetch(deleteTimetableUrl, options);
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

// TimeTable Time
export async function serverPostCreateTimetableTime(
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
    const response = await fetch(createTimetableTimeUrl, options);
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

export async function serverGetTimetableTimes() {
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
    const response = await fetch(getTimetableTimesUrl, options);
    if (response.ok) {
      const jsonData = await response.json();
      console.log("response getTimetableTimes", jsonData);
      return jsonData;
    } else {
      throw new Error("Request failed");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function serverPostUpdateTimetableTime(
  timetableTimeId: string,
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
      timetable_time_id: timetableTimeId,
      label: label,
      entry_type: entryType,
      entry_options: entryOptions,
    }),
  };
  try {
    const response = await fetch(updateTimetableTimeUrl, options);
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

export async function serverDeleteTimetableTime(timetableTimeId: string) {
  console.log("deleteShift", timetableTimeId);

  const options: RequestInit = {
    method: "DELETE",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      timetable_time_id: timetableTimeId,
    }),
  };
  try {
    const response = await fetch(deleteTimetableTimeUrl, options);
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

// TimeTable Category
export async function serverPostCreateTimetableCategory(
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
    const response = await fetch(createTimetableCategoryUrl, options);
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

export async function serverGetTimetableCategorys() {
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
    const response = await fetch(getTimetableCategoriesUrl, options);
    if (response.ok) {
      const jsonData = await response.json();
      console.log("response getTimetableCategorys", jsonData);
      return jsonData;
    } else {
      throw new Error("Request failed");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function serverPostUpdateTimetableCategory(
  timetableCategoryId: string,
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
      timetable_category_id: timetableCategoryId,
      label: label,
      entry_type: entryType,
      entry_options: entryOptions,
    }),
  };
  try {
    const response = await fetch(updateTimetableCategoryUrl, options);
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

export async function serverDeleteTimetableCategory(
  timetableCategoryId: string
) {
  console.log("deleteShift", timetableCategoryId);

  const options: RequestInit = {
    method: "DELETE",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      timetable_category_id: timetableCategoryId,
    }),
  };
  try {
    const response = await fetch(deleteTimetableCategoryUrl, options);
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

// Timetable Property
export async function serverPostCreateTimetableProperty(
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
    const response = await fetch(createTimetablePropertyUrl, options);
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

export async function serverGetTimetablePropertys() {
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
    const response = await fetch(getTimetablePropertiesUrl, options);
    if (response.ok) {
      const jsonData = await response.json();
      console.log("response getTimetablePropertys", jsonData);
      return jsonData;
    } else {
      throw new Error("Request failed");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

export async function serverPostUpdateTimetableProperty(
  timetablePropertyId: string,
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
      timetable_property_id: timetablePropertyId,
      label: label,
      entry_type: entryType,
      entry_options: entryOptions,
    }),
  };
  try {
    const response = await fetch(updateTimetablePropertyUrl, options);
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

export async function serverDeleteTimetableProperty(
  timetablePropertyId: string
) {
  console.log("deleteShift", timetablePropertyId);

  const options: RequestInit = {
    method: "DELETE",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      timetable_property_id: timetablePropertyId,
    }),
  };
  try {
    const response = await fetch(deleteTimetablePropertyUrl, options);
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

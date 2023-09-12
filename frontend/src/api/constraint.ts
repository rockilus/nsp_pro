import { getCookie } from "../utils/cookie";

const serverUrl = "http://127.0.0.1:5000";

// ConstraintParam
const getContraintParamsUrl = serverUrl + "/get-constraint-params";

// Constraint
const createConstraintUrl = serverUrl + "/create-constraint";
const getConstraintsUrl = serverUrl + "/get-constraints";
const updateConstraintUrl = serverUrl + "/update-constraint";
const updateConstraintStatusUrl = serverUrl + "/update-constraint-status";
const deleteConstraintUrl = serverUrl + "/delete-constraint";

// ConstraintParam
export async function serverGetConstraintParams() {
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
    const response = await fetch(getContraintParamsUrl, options);
    if (response.ok) {
      const jsonData = await response.json();
      console.log("response getContraintParams", jsonData);
      return jsonData;
    } else {
      throw new Error("Request failed");
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
}

// Constraint
export async function serverPostCreateConstraint(
  constraint: Record<string, unknown>
) {
  console.log("constraint: ", constraint);

  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(constraint),
  };
  try {
    const response = await fetch(createConstraintUrl, options);
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

export async function serverGetConstraints() {
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
    const response = await fetch(getConstraintsUrl, options);
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

export async function serverPostUpdateConstraint(
  constraintId: string,
  constraint: Record<string, unknown>
) {
  console.log("constraint: ", constraint);

  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      constraint_id: constraintId,
      constraint: constraint,
    }),
  };
  try {
    const response = await fetch(updateConstraintUrl, options);
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

export async function serverPostUpdateConstraintStatus(
  constraintId: string,
  active: boolean
) {
  const options: RequestInit = {
    method: "POST",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      constraint_id: constraintId,
      active: active,
    }),
  };
  try {
    const response = await fetch(updateConstraintStatusUrl, options);
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

export async function serverDeleteConstraint(constraintId: string) {
  console.log("deleteConstraint", constraintId);

  const options: RequestInit = {
    method: "DELETE",
    credentials: "include" as RequestCredentials,
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-TOKEN": getCookie("csrf_access_token") || "",
    },
    body: JSON.stringify({
      constraint_id: constraintId,
    }),
  };
  try {
    const response = await fetch(deleteConstraintUrl, options);
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

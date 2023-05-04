const hospitalProfileUrl = `http://127.0.0.1:5000/hospital-profile`;

export async function fetchHospitalProfile() {
  try {
    const response = await fetch(hospitalProfileUrl, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
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
  try {
    const response = await fetch(hospitalProfileUrl, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry: entry, status: status }),
    });
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

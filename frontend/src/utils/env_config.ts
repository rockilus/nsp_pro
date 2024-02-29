const get_env_variable = (name: string) => {
  const value = process.env[name];
  if (value === undefined) {
    throw new Error(`Environment variable ${name} is not defined`);
  }
  return value;
};

export const ApiUrl = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

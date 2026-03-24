export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem("token");
};

export const getUser = (): any | null => {
  const userStr = localStorage.getItem("user");
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
};

export const removeAuthToken = (): void => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem("token");
  
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  return response;
};
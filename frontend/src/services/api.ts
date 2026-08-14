const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface RequestOptions extends RequestInit {
  body?: any;
}

const getHeaders = async () => {
  const token = localStorage.getItem('hms_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorMessage = `Server error (${response.status}). Please try again.`;
    try {
      const data = await response.json();
      errorMessage = data.message || data.error || errorMessage;
    } catch (e) {
      // Ignored
    }
    if (response.status === 401 && window.location.pathname !== '/' && !window.location.pathname.includes('login')) {
      localStorage.removeItem('hms_token');
      localStorage.removeItem('supabase_token');
      localStorage.removeItem('hms_user');
      window.location.href = '/';
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

export const apiClient = {
  get: async (endpoint: string) => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'GET',
      headers,
    });
    return handleResponse(res);
  },

  post: async (endpoint: string, body: any) => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  put: async (endpoint: string, body: any) => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });
    return handleResponse(res);
  },

  delete: async (endpoint: string) => {
    const headers = await getHeaders();
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'DELETE',
      headers,
    });
    return handleResponse(res);
  },
};

const BACKEND_URL = 'https://smart-mail-bu51.onrender.com';

export const getToken = () => localStorage.getItem('token');

export async function api(path, method = 'GET', body) {
  const res = await fetch(BACKEND_URL + '/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + getToken(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}
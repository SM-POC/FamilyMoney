
import { UserFinancialProfile } from './types';

// When deployed on the same server, we use relative paths.
// If local, we can fallback to the configured endpoint.
const getUrl = (path: string, configEndpoint?: string) => {
  if (window.location.hostname === 'localhost' && configEndpoint) {
    return `${configEndpoint}${path}`;
  }
  return `/api${path}`;
};

export const syncPush = async (endpoint: string, apiKey: string, data: UserFinancialProfile) => {
  const url = getUrl('/push', endpoint);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error('Push failed');
  return await response.json();
};

export const syncPull = async (endpoint: string, apiKey: string) => {
  const url = getUrl('/pull', endpoint);
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  if (!response.ok) throw new Error('Pull failed');
  return await response.json();
};

export const testConnection = async (endpoint: string, apiKey: string) => {
  try {
    const url = getUrl('/health', endpoint);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return response.ok;
  } catch (e) {
    return false;
  }
};

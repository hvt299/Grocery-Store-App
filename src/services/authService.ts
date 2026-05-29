import { apiClient } from '../lib/apiClient';

export const loginApi = async (username: string, password: string) => {
    const { data } = await apiClient.post('/auth/login', { username, password });
    return data;
};
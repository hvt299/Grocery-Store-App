import { io } from 'socket.io-client';
import { BASE_URL } from './apiClient';

export const socket = io(BASE_URL, {
    autoConnect: true,
});
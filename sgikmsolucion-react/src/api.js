import axios from 'axios';

const api = axios.create({
  baseURL: 'https://kmsolucion.com/KMBD/public/api/', 
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export default api;
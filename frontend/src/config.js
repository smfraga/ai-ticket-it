import Constants from "expo-constants";

const PUERTO_API = 3000;

// Con Expo Go, el celular le pega a la misma PC que sirve la app (hostUri = "192.168.1.15:8081").
// EXPO_PUBLIC_API_URL fuerza otra URL (por ejemplo, con --tunnel).
export const resolverApiUrl = ({ override, hostUri } = {}) => {
  if (override) return override.replace(/\/+$/, "");
  if (hostUri) return `http://${hostUri.split(":")[0]}:${PUERTO_API}`;
  return `http://localhost:${PUERTO_API}`;
};

export const API_URL = resolverApiUrl({
  override: process.env.EXPO_PUBLIC_API_URL,
  hostUri: Constants.expoConfig?.hostUri,
});

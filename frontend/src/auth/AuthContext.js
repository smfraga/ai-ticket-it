import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { alRecibirNoAutorizado } from "../services/api";
import * as authService from "../services/authService";
import { borrarSesion, guardarSesion, leerSesion } from "../services/sesionStorage";

export const ROLES = Object.freeze({ COMPRADOR: "COMPRADOR", ORGANIZADOR: "ORGANIZADOR" });

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true); // restaurando la sesión guardada
  const [sesionExpirada, setSesionExpirada] = useState(false);

  useEffect(() => {
    let activo = true;
    leerSesion().then((sesion) => {
      if (!activo) return;
      setUsuario(sesion?.usuario ?? null);
      setCargando(false);
    });
    return () => {
      activo = false;
    };
  }, []);

  // Un 401 con token (vencido o usuario borrado) cierra la sesión y lo avisa en el login.
  useEffect(() => {
    alRecibirNoAutorizado(() => {
      borrarSesion();
      setUsuario(null);
      setSesionExpirada(true);
    });
    return () => alRecibirNoAutorizado(null);
  }, []);

  const iniciarSesion = useCallback(async (sesion) => {
    await guardarSesion(sesion);
    setSesionExpirada(false);
    setUsuario(sesion.usuario);
  }, []);

  const login = useCallback(
    async (email, password) => iniciarSesion(await authService.login(email, password)),
    [iniciarSesion],
  );

  const registro = useCallback(async (datos) => iniciarSesion(await authService.registro(datos)), [iniciarSesion]);

  // Después de editar el perfil: el usuario nuevo reemplaza al guardado, con el mismo token (que solo lleva el id
  // y los roles). Si no se puede guardar, igual se ve el cambio hasta cerrar la app.
  const actualizarUsuario = useCallback(async (usuarioNuevo) => {
    const sesion = await leerSesion();
    if (sesion) await guardarSesion({ ...sesion, usuario: usuarioNuevo });
    setUsuario(usuarioNuevo);
  }, []);

  const logout = useCallback(async () => {
    await borrarSesion();
    setSesionExpirada(false);
    setUsuario(null);
  }, []);

  const valor = useMemo(
    () => ({
      usuario,
      cargando,
      sesionExpirada,
      estaAutenticado: Boolean(usuario),
      esComprador: usuario?.roles?.includes(ROLES.COMPRADOR) ?? false,
      esOrganizador: usuario?.roles?.includes(ROLES.ORGANIZADOR) ?? false,
      login,
      registro,
      logout,
      actualizarUsuario,
    }),
    [usuario, cargando, sesionExpirada, login, registro, logout, actualizarUsuario],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth tiene que usarse dentro de <AuthProvider>");
  return contexto;
};

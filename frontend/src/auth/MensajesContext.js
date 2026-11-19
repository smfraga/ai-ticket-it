import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AppState } from "react-native";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { listarConversaciones } from "../services/comprasService";
import { useAuth } from "./AuthContext";

const INTERVALO_MS = 15000;
const SIN_DATOS = { conversaciones: null, totalNoLeidos: 0, error: null }; // null = todavía no llegó la lista

const MensajesContext = createContext(null);

// Los chats del usuario y el total de mensajes nuevos, compartidos por la pestaña Mensajes (su número) y su lista.
// Se piden al iniciar sesión, cada 15 s mientras la app está abierta (se corta en segundo plano) y cuando una
// pantalla lo pide: al entrar a la pestaña y al salir de un chat (leerlo baja el número).
export function MensajesProvider({ children }) {
  const { usuario } = useAuth();
  const [datos, setDatos] = useState(SIN_DATOS);
  const nuevoPedido = useUltimoPedido();

  const recargar = useCallback(async () => {
    if (!usuario) return;
    const esVigente = nuevoPedido();
    try {
      const { conversaciones, totalNoLeidos } = await listarConversaciones();
      if (esVigente()) setDatos({ conversaciones, totalNoLeidos, error: null });
    } catch (e) {
      // Si ya había una lista, se sigue mostrando con el aviso; el número de la pestaña queda como estaba.
      if (esVigente()) setDatos((previos) => ({ ...previos, error: mensajeDeError(e) }));
    }
  }, [usuario, nuevoPedido]);

  // Al iniciar o cerrar sesión (o cambiar de usuario) se arranca de cero.
  useEffect(() => {
    nuevoPedido(); // descarta un pedido del usuario anterior que todavía no llegó
    setDatos(SIN_DATOS);
    if (!usuario) return undefined;

    recargar();
    let intervalo = setInterval(recargar, INTERVALO_MS);
    const suscripcion = AppState.addEventListener("change", (estado) => {
      clearInterval(intervalo);
      intervalo = null;
      if (estado === "active") {
        recargar(); // al volver a la app, el número se pone al día enseguida
        intervalo = setInterval(recargar, INTERVALO_MS);
      }
    });
    return () => {
      clearInterval(intervalo);
      suscripcion.remove();
    };
  }, [usuario, recargar, nuevoPedido]);

  const valor = useMemo(() => ({ ...datos, recargar }), [datos, recargar]);

  return <MensajesContext.Provider value={valor}>{children}</MensajesContext.Provider>;
}

export const useMensajes = () => {
  const contexto = useContext(MensajesContext);
  if (!contexto) throw new Error("useMensajes tiene que usarse dentro de <MensajesProvider>");
  return contexto;
};

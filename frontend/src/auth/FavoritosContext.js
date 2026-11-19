import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import useUltimoPedido from "../hooks/useUltimoPedido";
import { mensajeDeError } from "../services/api";
import { guardarFavorito, listarFavoritos, quitarFavorito } from "../services/eventosService";
import { conFavorito } from "../utils/eventos";
import { useAuth } from "./AuthContext";

const SIN_FAVORITOS = new Set();
const FavoritosContext = createContext(null);

// Los ids de los eventos favoritos del comprador logueado, compartidos por el catálogo, el detalle y la pestaña
// Favoritos: así un corazón marcado en una pantalla aparece igual en las otras sin volver a pedir.
// Para quien no es comprador no hace nada (el backend respondería 403).
export function FavoritosProvider({ children }) {
  const { usuario, esComprador } = useAuth();
  const [ids, setIds] = useState(SIN_FAVORITOS);
  const enCurso = useRef(new Set()); // eventos con un guardar/quitar pendiente: se ignora el doble toque
  const nuevoPedido = useUltimoPedido();

  // Reemplaza los ids por los de una lista del backend, salvo los eventos con un guardar/quitar en curso:
  // esa lista pudo armarse antes de que el backend procesara el toque, y deshacerlo confundiría.
  const reemplazarCon = useCallback((favoritos) => {
    setIds((actuales) => {
      let nuevos = new Set(favoritos.map((evento) => evento.id));
      for (const eventoId of enCurso.current) nuevos = conFavorito(nuevos, eventoId, actuales.has(eventoId));
      return nuevos;
    });
  }, []);

  const recargar = useCallback(async () => {
    if (!esComprador) return;
    const esVigente = nuevoPedido();
    try {
      const favoritos = await listarFavoritos();
      if (esVigente()) reemplazarCon(favoritos);
    } catch {
      // Sin la lista, los corazones quedan como estaban; la pestaña Favoritos muestra su propio error.
    }
  }, [esComprador, nuevoPedido, reemplazarCon]);

  // La pestaña Favoritos ya pide la lista completa: con ella actualiza los ids sin un segundo pedido.
  const sincronizar = useCallback(
    (favoritos) => {
      nuevoPedido(); // una recarga anterior traería datos más viejos que esta lista
      reemplazarCon(favoritos);
    },
    [nuevoPedido, reemplazarCon],
  );

  // Al iniciar o cerrar sesión (o cambiar de usuario) se arranca de cero.
  useEffect(() => {
    nuevoPedido(); // descarta una recarga del usuario anterior que todavía no llegó
    setIds(SIN_FAVORITOS);
    enCurso.current.clear();
    recargar();
  }, [usuario?.id, recargar, nuevoPedido]);

  // Optimista: el corazón cambia al instante y, si el pedido falla, vuelve atrás con un aviso.
  const alternar = useCallback(
    async (eventoId) => {
      if (!esComprador || enCurso.current.has(eventoId)) return;
      enCurso.current.add(eventoId);
      nuevoPedido(); // una recarga que salió antes del toque ya no refleja este cambio: se ignora
      const guardar = !ids.has(eventoId);
      setIds((actuales) => conFavorito(actuales, eventoId, guardar));
      try {
        await (guardar ? guardarFavorito(eventoId) : quitarFavorito(eventoId));
      } catch (e) {
        setIds((actuales) => conFavorito(actuales, eventoId, !guardar));
        Alert.alert(guardar ? "No se guardó el favorito" : "No se quitó el favorito", mensajeDeError(e));
      } finally {
        enCurso.current.delete(eventoId);
      }
    },
    [esComprador, ids, nuevoPedido],
  );

  const valor = useMemo(
    () => ({ ids, esFavorito: (eventoId) => ids.has(eventoId), alternar, recargar, sincronizar }),
    [ids, alternar, recargar, sincronizar],
  );

  return <FavoritosContext.Provider value={valor}>{children}</FavoritosContext.Provider>;
}

export const useFavoritos = () => {
  const contexto = useContext(FavoritosContext);
  if (!contexto) throw new Error("useFavoritos tiene que usarse dentro de <FavoritosProvider>");
  return contexto;
};

import { useCallback, useEffect, useRef } from "react";

// Cada llamada devuelve una función que dice si ese pedido sigue siendo el último.
// Sirve para ignorar la respuesta lenta de una búsqueda vieja, y las que llegan tras desmontar la pantalla.
export default function useUltimoPedido() {
  const ultimo = useRef(0);

  useEffect(
    () => () => {
      ultimo.current++;
    },
    [],
  );

  return useCallback(() => {
    const pedido = ++ultimo.current;
    return () => pedido === ultimo.current;
  }, []);
}

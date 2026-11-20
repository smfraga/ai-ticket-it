import { useCallback, useEffect, useState } from "react";
import Estado from "../components/Estado";
import FormularioEvento from "../components/FormularioEvento";
import { mensajeDeError } from "../services/api";
import { editarEvento, obtenerEvento, subirImagenDeEvento } from "../services/eventosService";
import {
  armarEdicionParaEnviar,
  eventoAFormulario,
  imagenesParaSubir,
  subirImagenes,
  textoDeImagenesSinSubir,
} from "../utils/eventos";

// El organizador edita un evento próximo: pide el evento actualizado (con lo vendido de cada tipo) y reutiliza el
// formulario de crear. Al guardar vuelve a las compras del evento.
export default function EditarEventoScreen({ route, navigation }) {
  const { eventoId } = route.params;
  const [evento, setEvento] = useState(null);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setError(null);
    try {
      setEvento(await obtenerEvento(eventoId));
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }, [eventoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (error) return <Estado tipo="error" mensaje={error} onReintentar={cargar} />;
  if (!evento) return <Estado tipo="cargando" />;

  // Primero el PATCH (con las imágenes que se conservan) y después las nuevas, una por pedido.
  const guardar = async (formulario) => {
    const editado = await editarEvento(eventoId, armarEdicionParaEnviar(formulario));
    const fallidas = await subirImagenes(eventoId, imagenesParaSubir(formulario.imagenes), subirImagenDeEvento);
    navigation.popTo("ComprasDelEvento", {
      eventoId,
      nombreEvento: editado.nombre,
      aviso: ["¡Cambios guardados!", textoDeImagenesSinSubir(fallidas)].filter(Boolean).join(" "),
    });
  };

  return <FormularioEvento inicial={eventoAFormulario(evento)} textoBoton="Guardar cambios" onEnviar={guardar} />;
}

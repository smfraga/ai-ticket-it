import { useState } from "react";
import FormularioEvento from "../components/FormularioEvento";
import { crearEvento } from "../services/eventosService";
import { armarEventoParaEnviar, fechaInicialDeEvento, tipoEntradaVacio } from "../utils/eventos";

// El organizador crea un evento con uno o más tipos de entrada, cada uno con precio y cupo.
export default function CrearEventoScreen({ navigation }) {
  const [inicial] = useState(() => ({
    nombre: "",
    descripcion: "",
    imagen: "",
    categoriaId: null,
    fecha: fechaInicialDeEvento(new Date()),
    tiposEntrada: [tipoEntradaVacio()],
  }));

  const crear = async (formulario) => {
    const creado = await crearEvento(armarEventoParaEnviar(formulario));
    // Reemplaza el formulario por las compras del evento nuevo: "volver" lleva a Mis eventos, no a un formulario ya enviado.
    navigation.replace("ComprasDelEvento", {
      eventoId: creado.id,
      nombreEvento: creado.nombre,
      aviso: "¡Evento creado! Ya está a la venta en el catálogo.",
    });
  };

  return <FormularioEvento inicial={inicial} textoBoton="Crear evento" onEnviar={crear} />;
}

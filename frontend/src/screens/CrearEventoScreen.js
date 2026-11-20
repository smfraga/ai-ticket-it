import { useState } from "react";
import FormularioEvento from "../components/FormularioEvento";
import { crearEvento, subirImagenDeEvento } from "../services/eventosService";
import {
  armarEventoParaEnviar,
  fechaInicialDeEvento,
  imagenesParaSubir,
  subirImagenes,
  textoDeImagenesSinSubir,
  tipoEntradaVacio,
} from "../utils/eventos";

// El organizador crea un evento con uno o más tipos de entrada, cada uno con precio y cupo, y hasta 6 imágenes.
export default function CrearEventoScreen({ navigation }) {
  const [inicial] = useState(() => ({
    nombre: "",
    descripcion: "",
    imagenes: [],
    categoriaId: null,
    fecha: fechaInicialDeEvento(new Date()),
    tiposEntrada: [tipoEntradaVacio()],
  }));

  const crear = async (formulario) => {
    const creado = await crearEvento(armarEventoParaEnviar(formulario));
    // Las imágenes van después, una por pedido. Si alguna falla, el evento ya está creado: se avisa y listo.
    const fallidas = await subirImagenes(creado.id, imagenesParaSubir(formulario.imagenes), subirImagenDeEvento);
    const aviso = ["¡Evento creado! Ya está a la venta en el catálogo.", textoDeImagenesSinSubir(fallidas)]
      .filter(Boolean)
      .join(" ");
    // Reemplaza el formulario por las compras del evento nuevo: "volver" lleva a Mis eventos, no a un formulario ya enviado.
    navigation.replace("ComprasDelEvento", { eventoId: creado.id, nombreEvento: creado.nombre, aviso });
  };

  return <FormularioEvento inicial={inicial} textoBoton="Crear evento" onEnviar={crear} />;
}

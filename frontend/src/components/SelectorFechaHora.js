import { Platform, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { colores, espacio, tipografia } from "../theme";
import { formatearFecha } from "../utils/formato";
import Boton from "./Boton";

// Fecha y hora del evento con el selector nativo. En iOS, el compacto con fecha y hora juntas;
// en Android no existe ese modo, así que se abre primero la fecha y después la hora.
export default function SelectorFechaHora({ etiqueta, valor, minimo, onCambiar }) {
  const abrirEnAndroid = () =>
    DateTimePickerAndroid.open({
      value: valor,
      mode: "date",
      minimumDate: minimo,
      onChange: (evento, fecha) => {
        if (evento.type !== "set") return;
        DateTimePickerAndroid.open({
          value: fecha,
          mode: "time",
          is24Hour: true,
          onChange: (eventoHora, conHora) => {
            if (eventoHora.type === "set") onCambiar(conHora);
          },
        });
      },
    });

  return (
    <View style={estilos.contenedor}>
      <Text style={tipografia.etiqueta}>{etiqueta}</Text>
      {Platform.OS === "ios" ? (
        <View style={estilos.filaIos}>
          <DateTimePicker
            value={valor}
            mode="datetime"
            display="compact"
            minimumDate={minimo}
            minuteInterval={5}
            locale="es-AR"
            accentColor={colores.primario}
            onChange={(_, fecha) => fecha && onCambiar(fecha)}
          />
        </View>
      ) : (
        <View style={estilos.filaAndroid}>
          <Text style={tipografia.cuerpo}>{formatearFecha(valor.toISOString())}</Text>
          <Boton titulo="Cambiar" variante="secundario" onPress={abrirEnAndroid} />
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { gap: espacio.xs },
  filaIos: { alignItems: "flex-start" },
  filaAndroid: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: espacio.m },
});

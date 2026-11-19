import { Platform, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { colores, espacio, tipografia } from "../theme";
import { formatearFecha } from "../utils/formato";
import Boton from "./Boton";

// Fecha y hora del evento con el selector nativo. En iOS, el compacto con fecha y hora juntas;
// en Android no existe ese modo, así que se abre primero la fecha y después la hora.
export default function SelectorFechaHora({ etiqueta, valor, minimo, onCambiar }) {
  // onValueChange solo se llama al elegir (no al cerrar sin elegir): reemplaza a onChange, que está deprecado.
  const abrirEnAndroid = () =>
    DateTimePickerAndroid.open({
      value: valor,
      mode: "date",
      minimumDate: minimo,
      onValueChange: (_, fecha) =>
        DateTimePickerAndroid.open({
          value: fecha,
          mode: "time",
          is24Hour: true,
          onValueChange: (__, conHora) => onCambiar(conHora),
        }),
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
            themeVariant="dark"
            onValueChange={(_, fecha) => onCambiar(fecha)}
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

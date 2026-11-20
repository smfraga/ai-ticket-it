// zod 4 reemplazó `required_error` e `invalid_type_error` por una sola opción, `error`, que recibe el problema.
// Esto la arma igual que antes: si falta el valor, `obligatorio`; si vino de otro tipo, `tipoInvalido`. Solo actúa
// sobre el error de tipo: los demás (mínimo, máximo, formato) siguen con su propio mensaje. Sin un mensaje para un
// caso, devuelve undefined y zod usa el suyo.
// Ojo: zod 4 informa un número con decimales en un `.int()` también como error de tipo (esperado "int"); ese no es
// "tipo inválido" (sí es un número), así que se deja pasar.
export const mensajesDeTipo = ({ obligatorio, tipoInvalido }) => ({
  error: (problema) => {
    if (problema.code !== "invalid_type") return undefined;
    if (problema.input === undefined) return obligatorio;
    return problema.expected === "int" ? undefined : tipoInvalido;
  },
});

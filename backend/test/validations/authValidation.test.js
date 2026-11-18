import { describe, expect, it } from "@jest/globals";
import { loginValidation, registroValidation } from "../../validations/authValidation.js";

const registroValido = {
  nombre: "Ana",
  apellido: "Pérez",
  email: "ana@example.com",
  password: "una-contraseña-larga",
  roles: ["COMPRADOR"],
};

describe("registroValidation", () => {
  it("acepta un registro válido", () => {
    expect(registroValidation.safeParse(registroValido).success).toBe(true);
  });

  it("acepta los dos roles a la vez", () => {
    const resultado = registroValidation.safeParse({ ...registroValido, roles: ["COMPRADOR", "ORGANIZADOR"] });

    expect(resultado.success).toBe(true);
  });

  it("normaliza el email y recorta los textos", () => {
    const resultado = registroValidation.parse({
      ...registroValido,
      nombre: "  Ana ",
      email: "  Ana@Example.COM ",
    });

    expect(resultado.nombre).toBe("Ana");
    expect(resultado.email).toBe("ana@example.com");
  });

  it.each([
    ["sin nombre", { nombre: "  " }],
    ["sin apellido", { apellido: "" }],
    ["con email sin formato", { email: "ana-sin-arroba" }],
    ["con contraseña corta", { password: "corta" }],
    ["con contraseña de más de 72 bytes", { password: "a".repeat(73) }],
    ["sin roles", { roles: [] }],
    ["con roles que no son lista", { roles: "COMPRADOR" }],
    ["con un rol desconocido", { roles: ["ADMIN"] }],
    ["con roles repetidos", { roles: ["COMPRADOR", "COMPRADOR"] }],
    ["con un campo de más", { esAdmin: true }],
  ])("rechaza un registro %s", (_, cambios) => {
    expect(registroValidation.safeParse({ ...registroValido, ...cambios }).success).toBe(false);
  });

  it.each(["nombre", "apellido", "email", "password", "roles"])("rechaza un registro sin %s", (campo) => {
    const { [campo]: _omitido, ...incompleto } = registroValido;

    expect(registroValidation.safeParse(incompleto).success).toBe(false);
  });

  it("cuenta los bytes y no los caracteres de la contraseña (límite de bcrypt)", () => {
    const treintaYSeisConAcento = "é".repeat(36); // 36 caracteres, 72 bytes
    const treintaYSiete = "é".repeat(37); // 74 bytes

    expect(registroValidation.safeParse({ ...registroValido, password: treintaYSeisConAcento }).success).toBe(true);
    expect(registroValidation.safeParse({ ...registroValido, password: treintaYSiete }).success).toBe(false);
  });
});

describe("loginValidation", () => {
  it("acepta email y contraseña", () => {
    expect(loginValidation.safeParse({ email: "ana@example.com", password: "x" }).success).toBe(true);
  });

  it("normaliza el email", () => {
    expect(loginValidation.parse({ email: "  Ana@Example.COM ", password: "x" }).email).toBe("ana@example.com");
  });

  it.each([
    ["sin email", { password: "x" }],
    ["con email vacío", { email: "  ", password: "x" }],
    ["sin contraseña", { email: "ana@example.com" }],
    ["con contraseña vacía", { email: "ana@example.com", password: "" }],
    ["con un campo de más", { email: "ana@example.com", password: "x", roles: ["ORGANIZADOR"] }],
    ["con email que no es texto", { email: 5, password: "x" }],
  ])("rechaza un login %s", (_, cuerpo) => {
    expect(loginValidation.safeParse(cuerpo).success).toBe(false);
  });
});

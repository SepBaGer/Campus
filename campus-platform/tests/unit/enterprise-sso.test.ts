import { describe, expect, it } from "vitest";
import {
  normalizeEnterpriseSsoDomain,
  parseEnterpriseSsoConnections,
  resolveEnterpriseSsoRequest
} from "../../src/lib/enterprise-sso";

describe("enterprise-sso", () => {
  it("normalizes domains from corporate email addresses and URLs", () => {
    expect(normalizeEnterpriseSsoDomain(" Equipo@Empresa.com ")).toBe("empresa.com");
    expect(normalizeEnterpriseSsoDomain("https://login.empresa.com/saml/start")).toBe("login.empresa.com");
  });

  it("prefers provider id when both inputs are present", () => {
    expect(resolveEnterpriseSsoRequest({
      emailOrDomain: "empresa.com",
      providerId: "21648a9d-8d5a-4555-a9d1-d6375dc14e92"
    })).toEqual({
      kind: "providerId",
      providerId: "21648a9d-8d5a-4555-a9d1-d6375dc14e92",
      targetLabel: "21648a9d-8d5a-4555-a9d1-d6375dc14e92"
    });
  });

  it("resolves domain-based requests from email or raw domain input", () => {
    expect(resolveEnterpriseSsoRequest({ emailOrDomain: "persona@cliente.co" })).toEqual({
      kind: "domain",
      domain: "cliente.co",
      targetLabel: "cliente.co"
    });
  });

  it("rejects invalid enterprise SSO input", () => {
    expect(() => resolveEnterpriseSsoRequest({ emailOrDomain: "sin-dominio" })).toThrow("INVALID_ENTERPRISE_SSO_TARGET");
  });

  it("parses public enterprise SSO connection config defensively", () => {
    const connections = parseEnterpriseSsoConnections(JSON.stringify([
      {
        slug: "cliente-azure",
        vendor: "azure-ad",
        domain: "cliente.com",
        hint: "Acceso interno"
      },
      {
        slug: "cliente-provider-id",
        label: "Cliente | SSO tecnico",
        vendor: "custom",
        providerId: "21648a9d-8d5a-4555-a9d1-d6375dc14e92"
      },
      {
        slug: "invalido"
      }
    ]));

    expect(connections).toEqual([
      {
        slug: "cliente-azure",
        label: "Azure AD",
        vendor: "azure-ad",
        domain: "cliente.com",
        hint: "Acceso interno"
      },
      {
        slug: "cliente-provider-id",
        label: "Cliente | SSO tecnico",
        vendor: "custom",
        providerId: "21648a9d-8d5a-4555-a9d1-d6375dc14e92",
        hint: ""
      }
    ]);
  });
});

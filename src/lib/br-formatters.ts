// Brazilian input formatters: phone, CPF, CNPJ.

export function formatPhoneBR(input: string): string {
  const d = (input || "").replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  if (rest.length === 0) return `(${ddd}) `;
  // celular: 9 NNNN NNNN (9 dígitos após DDD)
  if (rest.length === 9) {
    return `(${ddd}) ${rest[0]} ${rest.slice(1, 5)} ${rest.slice(5)}`;
  }
  // fixo: NNNN NNNN
  if (rest.length === 8) {
    return `(${ddd}) ${rest.slice(0, 4)} ${rest.slice(4)}`;
  }
  // parcial
  if (rest.length <= 4) return `(${ddd}) ${rest}`;
  if (rest.length <= 8) return `(${ddd}) ${rest.slice(0, 4)} ${rest.slice(4)}`;
  return `(${ddd}) ${rest[0]} ${rest.slice(1, 5)} ${rest.slice(5)}`;
}

export function formatCpfCnpj(input: string): string {
  const d = (input || "").replace(/\D/g, "").slice(0, 14);
  if (d.length === 0) return "";
  if (d.length <= 11) {
    // CPF progressivo: 000.000.000-00
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  // CNPJ progressivo: 00.000.000/0000-00
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export type AddressParts = {
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
};

export function composeAddress(p: AddressParts): string {
  const street = (p.street || "").trim();
  const neighborhood = (p.neighborhood || "").trim();
  const city = (p.city || "").trim();
  const state = (p.state || "").trim().toUpperCase();
  const left = [street, neighborhood].filter(Boolean).join(" - ");
  const right = [city, state].filter(Boolean).join("/");
  return [left, right].filter(Boolean).join(" - ");
}

// Best-effort parse of an address previously stored as "Rua - Bairro - Cidade/UF".
export function parseAddress(addr?: string | null): AddressParts {
  if (!addr) return {};
  const parts = addr.split(" - ").map(s => s.trim()).filter(Boolean);
  let cityState = "";
  if (parts.length >= 1) cityState = parts[parts.length - 1];
  const cityStateMatch = cityState.match(/^(.*)\/([A-Za-z]{2})$/);
  let city = "", state = "";
  if (cityStateMatch) {
    city = cityStateMatch[1].trim();
    state = cityStateMatch[2].toUpperCase();
    parts.pop();
  }
  const street = parts[0] || "";
  const neighborhood = parts.slice(1).join(" - ");
  return { street, neighborhood, city, state };
}

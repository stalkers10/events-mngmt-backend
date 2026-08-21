import { env } from "../config/env";

export interface CamPayTransaction {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  operator?: string;
}
let cachedToken: { value: string; expiresAt: number } | null = null;
const baseUrl = () =>
  env.campay.mode.toLowerCase() === "sandbox"
    ? "https://demo.campay.net/api"
    : "https://www.campay.net/api";

async function accessToken(): Promise<string> {
  if (env.campay.permanentAccessToken) return env.campay.permanentAccessToken;
  if (cachedToken && cachedToken.expiresAt > Date.now())
    return cachedToken.value;
  const response = await fetch(`${baseUrl()}/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: env.campay.appUsername,
      password: env.campay.appPassword,
    }),
  });
  const body = (await response.json()) as {
    token?: string;
    expires_in?: number;
    message?: string;
  };
  if (!response.ok || !body.token)
    throw new Error(body.message || "CamPay authentication failed");
  cachedToken = {
    value: body.token,
    expiresAt: Date.now() + Math.max(60, (body.expires_in ?? 300) - 60) * 1000,
  };
  return body.token;
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Token ${await accessToken()}`,
      "Content-Type": "application/json",
    },
  });
  const body = (await response.json()) as T & {
    message?: string;
    error?: string;
  };
  if (!response.ok)
    throw new Error(body.message || body.error || "CamPay request failed");
  return body;
}
export const CamPayService = {
  initiateCollection: (
    amount: number,
    phone: string,
    externalReference: string,
    description: string,
  ) =>
    request<{ reference: string; ussd_code?: string; operator?: string }>(
      "/collect/",
      {
        method: "POST",
        body: JSON.stringify({
          amount,
          currency: "XAF",
          from: phone,
          external_reference: externalReference,
          description,
        }),
      },
    ),
  transactionStatus: (reference: string) =>
    request<CamPayTransaction>(
      `/transaction/${encodeURIComponent(reference)}/`,
    ),
};

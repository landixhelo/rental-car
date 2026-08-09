import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";
import { api, type User } from "./api";

export function supportsPasskeys() {
  return typeof window !== "undefined" && browserSupportsWebAuthn();
}

export async function loginWithPasskey(email?: string): Promise<User> {
  const options = (await api.passkeyLoginOptions(
    email?.trim() || undefined
  )) as unknown as PublicKeyCredentialRequestOptionsJSON;
  const assertion = await startAuthentication({ optionsJSON: options });
  const { user } = await api.passkeyLoginVerify(assertion);
  return user;
}

export async function registerPasskey() {
  const options =
    (await api.passkeyRegisterOptions()) as unknown as PublicKeyCredentialCreationOptionsJSON;
  const attestation = await startRegistration({ optionsJSON: options });
  return api.passkeyRegisterVerify(attestation);
}

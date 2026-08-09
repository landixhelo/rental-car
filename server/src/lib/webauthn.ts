import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { env, getAllowedOrigins } from "../config/env.js";
import { prisma } from "./prisma.js";

type ChallengeEntry = {
  challenge: string;
  userId?: string;
  expires: number;
};

const challenges = new Map<string, ChallengeEntry>();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function pruneChallenges() {
  const now = Date.now();
  for (const [key, value] of challenges) {
    if (value.expires < now) challenges.delete(key);
  }
}

export function webauthnRp() {
  const appUrl = env.PUBLIC_APP_URL || env.CLIENT_ORIGIN;
  const hostname = new URL(appUrl).hostname;
  const rpID =
    env.WEBAUTHN_RP_ID || hostname.replace(/^www\./i, "") || hostname;
  return {
    rpID,
    rpName: env.WEBAUTHN_RP_NAME || "AutoRent",
    origins: getAllowedOrigins(),
  };
}

function storeChallenge(key: string, challenge: string, userId?: string) {
  pruneChallenges();
  challenges.set(key, {
    challenge,
    userId,
    expires: Date.now() + CHALLENGE_TTL_MS,
  });
}

function takeChallenge(key: string) {
  pruneChallenges();
  const entry = challenges.get(key);
  if (!entry) return null;
  challenges.delete(key);
  if (entry.expires < Date.now()) return null;
  return entry;
}

function userIdBytes(userId: string) {
  return new TextEncoder().encode(userId);
}

function parseClientChallenge(clientDataJSON: string): string | null {
  try {
    const json = Buffer.from(clientDataJSON, "base64url").toString("utf8");
    const data = JSON.parse(json) as { challenge?: string };
    return data.challenge || null;
  } catch {
    return null;
  }
}

export async function createRegistrationOptions(user: {
  id: string;
  email: string;
  fullName: string;
}) {
  const { rpID, rpName } = webauthnRp();
  const existing = await prisma.passkey.findMany({
    where: { userId: user.id },
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: user.email,
    userDisplayName: user.fullName,
    userID: userIdBytes(user.id),
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({
      id: p.credentialId,
      transports: p.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
      authenticatorAttachment: "platform",
    },
  });

  storeChallenge(`reg:${user.id}`, options.challenge, user.id);
  return options;
}

export async function verifyAndSaveRegistration(
  userId: string,
  response: RegistrationResponseJSON
) {
  const { rpID, origins } = webauthnRp();
  const stored = takeChallenge(`reg:${userId}`);
  if (!stored?.challenge) {
    throw new Error("Passkey challenge expired. Try again.");
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: stored.challenge,
    expectedOrigin: origins,
    expectedRPID: rpID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Passkey registration failed");
  }

  const { credential } = verification.registrationInfo;

  await prisma.passkey.create({
    data: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      transports: credential.transports || [],
    },
  });

  return { verified: true as const };
}

export async function createAuthenticationOptions(email?: string) {
  const { rpID } = webauthnRp();
  let allowCredentials:
    | { id: string; transports?: AuthenticatorTransportFuture[] }[]
    | undefined;

  let userId: string | undefined;
  if (email) {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { passkeys: true },
    });
    if (user?.passkeys.length) {
      userId = user.id;
      allowCredentials = user.passkeys.map((p) => ({
        id: p.credentialId,
        transports: p.transports as AuthenticatorTransportFuture[],
      }));
    }
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials,
  });

  if (userId) storeChallenge(`auth:${userId}`, options.challenge, userId);
  storeChallenge(`auth:chal:${options.challenge}`, options.challenge, userId);
  return options;
}

export async function verifyAuthentication(
  response: AuthenticationResponseJSON
) {
  const { rpID, origins } = webauthnRp();
  const passkey = await prisma.passkey.findUnique({
    where: { credentialId: response.id },
    include: { user: true },
  });
  if (!passkey || !passkey.user.isActive) {
    throw new Error("Passkey not found");
  }

  const clientChallenge = parseClientChallenge(
    response.response.clientDataJSON
  );
  const stored =
    takeChallenge(`auth:${passkey.userId}`) ||
    (clientChallenge
      ? takeChallenge(`auth:chal:${clientChallenge}`)
      : null);

  if (!stored?.challenge) {
    throw new Error("Passkey challenge expired. Try again.");
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: stored.challenge,
    expectedOrigin: origins,
    expectedRPID: rpID,
    credential: {
      id: passkey.credentialId,
      publicKey: new Uint8Array(passkey.publicKey),
      counter: Number(passkey.counter),
      transports: passkey.transports as AuthenticatorTransportFuture[],
    },
    requireUserVerification: true,
  });

  if (!verification.verified) {
    throw new Error("Passkey authentication failed");
  }

  await prisma.passkey.update({
    where: { id: passkey.id },
    data: { counter: BigInt(verification.authenticationInfo.newCounter) },
  });

  return passkey.user;
}

export async function listPasskeys(userId: string) {
  const rows = await prisma.passkey.findMany({
    where: { userId },
    select: { id: true, createdAt: true, transports: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    transports: r.transports,
  }));
}

export async function deletePasskey(userId: string, passkeyId: string) {
  const row = await prisma.passkey.findFirst({
    where: { id: passkeyId, userId },
  });
  if (!row) return false;
  await prisma.passkey.delete({ where: { id: row.id } });
  return true;
}

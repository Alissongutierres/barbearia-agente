import crypto from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { logger } from "firebase-functions";
import { defineSecret, defineString } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";

initializeApp();

const whatsappVerifyToken = defineSecret("WHATSAPP_VERIFY_TOKEN");
const metaAppSecret = defineSecret("META_APP_SECRET");
const graphApiVersion = defineString("META_GRAPH_API_VERSION");

const safeEqual = (firstValue, secondValue) => {
  const first = Buffer.from(String(firstValue));
  const second = Buffer.from(String(secondValue));

  return first.length === second.length && crypto.timingSafeEqual(first, second);
};

const hasValidMetaSignature = (request) => {
  const receivedSignature = request.get("x-hub-signature-256");
  if (!receivedSignature?.startsWith("sha256=")) return false;

  const expectedSignature = `sha256=${crypto
    .createHmac("sha256", metaAppSecret.value())
    .update(request.rawBody)
    .digest("hex")}`;

  return safeEqual(receivedSignature, expectedSignature);
};

const getIncomingMessages = (payload) => {
  if (payload?.object !== "whatsapp_business_account") return [];

  return (payload.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => change.value?.messages ?? []),
  );
};

export const whatsappWebhook = onRequest(
  {
    region: "southamerica-east1",
    secrets: [whatsappVerifyToken, metaAppSecret],
  },
  async (request, response) => {
    if (request.method === "GET") {
      const mode = request.query["hub.mode"];
      const token = request.query["hub.verify_token"];
      const challenge = request.query["hub.challenge"];

      if (
        mode === "subscribe" &&
        challenge &&
        safeEqual(token ?? "", whatsappVerifyToken.value())
      ) {
        response.status(200).send(challenge);
        return;
      }

      response.status(403).send("Verificação recusada.");
      return;
    }

    if (request.method !== "POST") {
      response.set("Allow", "GET, POST").status(405).send("Método não permitido.");
      return;
    }

    if (!hasValidMetaSignature(request)) {
      response.status(401).send("Assinatura inválida.");
      return;
    }

    const messages = getIncomingMessages(request.body);

    logger.info("Webhook oficial do WhatsApp recebido.", {
      messageCount: messages.length,
      messageTypes: messages.map((message) => message.type),
      graphApiVersionConfigured: Boolean(graphApiVersion.value()),
    });

    response.sendStatus(200);
  },
);

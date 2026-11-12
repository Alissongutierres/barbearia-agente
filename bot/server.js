import http from "node:http";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT || 3001);
const evolutionUrl = process.env.EVOLUTION_API_URL || "http://evolution-api:8080";
const apiKey = process.env.EVOLUTION_API_KEY;
const instance = process.env.EVOLUTION_INSTANCE || "barberbot";
const sessions = new Map();
const currentDirectory = dirname(fileURLToPath(import.meta.url));
const appointmentsFile = join(currentDirectory, "data", "agendamentos-pendentes.jsonl");

if (!apiKey) throw new Error("EVOLUTION_API_KEY não configurada.");

const services = { "1": "Corte", "2": "Barba", "3": "Corte + Barba" };
const times = { "1": "09:00", "2": "11:00", "3": "14:00", "4": "16:00" };

const normalize = (value) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const extractText = (data) => {
  const message = data?.message || {};
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.buttonsResponseMessage?.selectedButtonId ||
    message.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ""
  );
};

const sendText = async (number, text) => {
  const response = await fetch(`${evolutionUrl}/message/sendText/${instance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify({ number, text }),
  });
  if (!response.ok) throw new Error(`Falha ao enviar mensagem: HTTP ${response.status}`);
};

const savePendingAppointment = async (appointment) => {
  await mkdir(dirname(appointmentsFile), { recursive: true });
  await appendFile(appointmentsFile, `${JSON.stringify(appointment)}\n`, "utf8");
};

const startConversation = async (number) => {
  sessions.set(number, { step: "name" });
  await sendText(
    number,
    "✂️ Olá! Bem-vindo à Barbearia Fio de Ouro.\n\nEu sou o BarberBot e vou fazer seu agendamento. Qual é o seu nome?",
  );
};

const handleMessage = async (number, receivedText) => {
  const text = String(receivedText || "").trim();
  const normalized = normalize(text);
  let session = sessions.get(number);

  if (!session || ["oi", "ola", "menu", "inicio", "comecar"].includes(normalized)) {
    await startConversation(number);
    return;
  }

  if (["cancelar", "sair"].includes(normalized)) {
    sessions.delete(number);
    await sendText(number, "Atendimento cancelado. Quando quiser recomeçar, envie *Oi*.");
    return;
  }

  if (session.step === "name") {
    if (text.length < 2) {
      await sendText(number, "Por favor, envie seu nome para continuar.");
      return;
    }
    session = { ...session, name: text, step: "service" };
    sessions.set(number, session);
    await sendText(number, `Prazer, ${text}! Escolha o serviço:\n\n1️⃣ Corte\n2️⃣ Barba\n3️⃣ Corte + Barba\n\nResponda com 1, 2 ou 3.`);
    return;
  }

  if (session.step === "service") {
    if (!services[text]) {
      await sendText(number, "Opção inválida. Responda com *1*, *2* ou *3*.");
      return;
    }
    session = { ...session, service: services[text], step: "date" };
    sessions.set(number, session);
    await sendText(number, "Escolha a data:\n\n1️⃣ Hoje\n2️⃣ Amanhã\n\nResponda com 1 ou 2.");
    return;
  }

  if (session.step === "date") {
    if (!["1", "2"].includes(text)) {
      await sendText(number, "Opção inválida. Responda com *1* para hoje ou *2* para amanhã.");
      return;
    }
    const date = new Date();
    if (text === "2") date.setDate(date.getDate() + 1);
    session = { ...session, date: formatDate(date), step: "time" };
    sessions.set(number, session);
    await sendText(number, "Escolha o horário:\n\n1️⃣ 09:00\n2️⃣ 11:00\n3️⃣ 14:00\n4️⃣ 16:00\n\nResponda com 1, 2, 3 ou 4.");
    return;
  }

  if (session.step === "time") {
    if (!times[text]) {
      await sendText(number, "Opção inválida. Responda com *1*, *2*, *3* ou *4*.");
      return;
    }
    session = { ...session, time: times[text], step: "confirmation" };
    sessions.set(number, session);
    await sendText(number, `Confirme seu agendamento:\n\n👤 ${session.name}\n✂️ ${session.service}\n📅 ${session.date}\n⏰ ${session.time}\n\nResponda *SIM* para confirmar ou *NÃO* para cancelar.`);
    return;
  }

  if (session.step === "confirmation") {
    if (["nao", "n"].includes(normalized)) {
      sessions.delete(number);
      await sendText(number, "Agendamento cancelado. Envie *Oi* quando quiser recomeçar.");
      return;
    }
    if (!["sim", "s"].includes(normalized)) {
      await sendText(number, "Responda *SIM* para confirmar ou *NÃO* para cancelar.");
      return;
    }

    const appointment = {
      client: session.name,
      phone: number,
      service: session.service,
      date: session.date,
      time: session.time,
      status: "scheduled",
      source: "evolution-api",
      createdAt: new Date().toISOString(),
    };
    await savePendingAppointment(appointment);
    sessions.delete(number);
    await sendText(number, `✅ Agendamento confirmado!\n\n${session.service} em ${session.date}, às ${session.time}.\n\nObrigado! Para fazer outro agendamento, envie *Oi*.`);
  }
};

const receiveBody = (request) =>
  new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) reject(new Error("Payload muito grande."));
    });
    request.on("end", () => resolve(body));
    request.on("error", reject);
  });

const server = http.createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/health") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true, instance }));
    return;
  }
  if (request.method !== "POST" || request.url !== "/webhook/evolution") {
    response.writeHead(404).end();
    return;
  }

  try {
    const payload = JSON.parse(await receiveBody(request));
    response.writeHead(200).end("ok");
    if (normalize(payload?.event).replaceAll("_", ".") !== "messages.upsert") return;

    const data = payload?.data;
    const remoteJid = data?.key?.remoteJid || "";
    if (data?.key?.fromMe || !remoteJid.endsWith("@s.whatsapp.net")) return;
    const text = extractText(data);
    const number = remoteJid.split("@")[0];
    if (!text || !number) return;
    handleMessage(number, text).catch((error) => console.error("Erro ao processar mensagem:", error.message));
  } catch (error) {
    if (!response.headersSent) response.writeHead(400).end("payload inválido");
    console.error("Webhook inválido:", error.message);
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`BarberBot privado ouvindo na porta ${port}`);
});

import {
  auth,
  db,
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  onAuthStateChanged,
  serverTimestamp,
} from "./firebase.js";

const conversation = document.querySelector("#conversa");
const actions = document.querySelector("#acoes");

const state = {
  step: "start",
  client: "",
  phone: "",
  service: null,
  barber: null,
  date: "",
  time: "",
  services: [],
  barbers: [],
  appointments: [],
  hours: null,
  settings: null,
};

const addMessage = (text, author = "bot", isError = false) => {
  const message = document.createElement("div");
  message.className = `mensagem ${author}${isError ? " erro" : ""}`;
  message.textContent = text;
  conversation.appendChild(message);
  conversation.scrollTop = conversation.scrollHeight;
};

const clearActions = () => actions.replaceChildren();

const addButton = (label, value, className = "") => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.value = value;
  if (className) button.className = className;
  actions.appendChild(button);
};

const showTextInput = (placeholder, type = "text") => {
  clearActions();
  const form = document.createElement("form");
  const input = document.createElement("input");
  const button = document.createElement("button");
  form.className = "form-resposta";
  input.type = type;
  input.placeholder = placeholder;
  input.required = true;
  button.type = "submit";
  button.textContent = "Enviar";
  form.append(input, button);
  actions.appendChild(form);
  input.focus();
};

const localDateString = (date) => {
  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 10);
};

const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours * 60) + minutes;
};

const minutesToTime = (minutes) => {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
};

const serviceDuration = (name) => {
  const service = state.services.find((item) => item.name === name);
  return Number(service?.duration || state.hours?.interval || 30);
};

const slotIsAvailable = (date, time) => {
  const start = timeToMinutes(time);
  const end = start + Number(state.service.duration);

  return !state.appointments.some((appointment) => {
    if (
      appointment.status === "cancelled" ||
      appointment.date !== date ||
      appointment.barber !== state.barber.name
    ) return false;

    const appointmentStart = timeToMinutes(appointment.time);
    const appointmentEnd = appointmentStart + Number(
      appointment.duration || serviceDuration(appointment.service),
    );
    return start < appointmentEnd && end > appointmentStart;
  });
};

const availableDates = () => {
  const dates = [];
  const current = new Date();

  for (let offset = 0; offset < 21 && dates.length < 7; offset += 1) {
    const date = new Date(current);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    if (state.hours.days.includes(date.getDay())) dates.push(date);
  }
  return dates;
};

const availableTimes = () => {
  const times = [];
  const opening = timeToMinutes(state.hours.opening);
  const closing = timeToMinutes(state.hours.closing);
  const interval = Number(state.hours.interval);
  const earliest = new Date(
    Date.now() + (Number(state.settings?.minimumNoticeHours || 0) * 3600000),
  );

  for (let start = opening; start + Number(state.service.duration) <= closing; start += interval) {
    const time = minutesToTime(start);
    const dateTime = new Date(`${state.date}T${time}:00`);
    if (dateTime <= earliest || !slotIsAvailable(state.date, time)) continue;
    times.push(time);
  }
  return times;
};

const askName = () => {
  state.step = "name";
  addMessage("Para começar, qual é o seu nome?");
  showTextInput("Digite seu nome");
};

const askPhone = () => {
  state.step = "phone";
  addMessage("Qual é o seu WhatsApp com DDD?");
  showTextInput("(00) 00000-0000", "tel");
};

const askService = () => {
  state.step = "service";
  addMessage("Qual serviço você deseja?");
  clearActions();
  state.services.forEach((service) => {
    const price = Number(service.price || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
    addButton(`${service.name} • ${service.duration} min • ${price}`, service.id);
  });
};

const askBarber = () => {
  state.step = "barber";
  addMessage("Escolha o barbeiro:");
  clearActions();
  state.barbers.forEach((barber) => addButton(barber.name, barber.id));
};

const askDate = () => {
  state.step = "date";
  addMessage("Escolha uma data disponível:");
  clearActions();
  availableDates().forEach((date) => {
    const value = localDateString(date);
    const label = date.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
    addButton(label, value);
  });
};

const askTime = () => {
  state.step = "time";
  const times = availableTimes();
  addMessage(times.length ? "Estes horários estão livres:" : "Não há horários livres nessa data.");
  clearActions();
  times.forEach((time) => addButton(time, time));
  addButton("Escolher outra data", "back-date");
};

const askConfirmation = () => {
  state.step = "confirm";
  const date = new Date(`${state.date}T00:00:00`).toLocaleDateString("pt-BR");
  addMessage(
    `Confirme seu agendamento:\n${state.service.name}\n${state.barber.name}\n${date} às ${state.time}`,
  );
  clearActions();
  addButton("Confirmar agendamento", "confirm", "principal");
  addButton("Recomeçar", "restart");
};

const restart = () => {
  conversation.replaceChildren();
  Object.assign(state, {
    step: "start",
    client: "",
    phone: "",
    service: null,
    barber: null,
    date: "",
    time: "",
  });
  addMessage(state.settings?.welcomeMessage || "Olá! Eu sou o BarberBot. Vamos agendar seu horário?");
  clearActions();
  addButton("Agendar horário", "start", "principal");
};

const confirmAppointment = async () => {
  state.step = "saving";
  clearActions();
  addMessage("Só um instante, estou confirmando o horário...");

  const appointmentsSnapshot = await getDocs(collection(db, "agendamentos"));
  state.appointments = appointmentsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));

  if (!slotIsAvailable(state.date, state.time)) {
    addMessage("Esse horário acabou de ser ocupado. Escolha outro, por favor.", "bot", true);
    askTime();
    return;
  }

  await addDoc(collection(db, "agendamentos"), {
    client: state.client,
    phone: state.phone,
    service: state.service.name,
    barber: state.barber.name,
    date: state.date,
    time: state.time,
    duration: Number(state.service.duration),
    price: Number(state.service.price || 0),
    status: "scheduled",
    source: "simulator",
    createdAt: serverTimestamp(),
  });

  state.step = "done";
  addMessage("Agendamento confirmado! ✅\nEle já está disponível no painel administrativo.");
  clearActions();
  addButton("Fazer outro agendamento", "restart", "principal");
};

const loadData = async () => {
  const [servicesSnapshot, barbersSnapshot, appointmentsSnapshot, hoursSnapshot, settingsSnapshot] =
    await Promise.all([
      getDocs(collection(db, "servicos")),
      getDocs(collection(db, "barbeiros")),
      getDocs(collection(db, "agendamentos")),
      getDoc(doc(db, "configuracoes", "horarios")),
      getDoc(doc(db, "configuracoes", "barbearia")),
    ]);

  state.services = servicesSnapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((item) => item.status === "ativo");
  state.barbers = barbersSnapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .filter((item) => item.status === "ativo");
  state.appointments = appointmentsSnapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  state.hours = hoursSnapshot.exists() ? hoursSnapshot.data() : null;
  state.settings = settingsSnapshot.exists() ? settingsSnapshot.data() : null;

  if (!state.services.length || !state.barbers.length || !state.hours) {
    throw new Error("Cadastre serviços, barbeiros e horários antes de iniciar o simulador.");
  }
};

actions.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-value]");
  if (!button) return;
  const value = button.dataset.value;

  try {
    if (value === "restart") return restart();
    if (state.step === "start" && value === "start") return askName();
    if (state.step === "service") {
      state.service = state.services.find((item) => item.id === value);
      addMessage(state.service.name, "usuario");
      return askBarber();
    }
    if (state.step === "barber") {
      state.barber = state.barbers.find((item) => item.id === value);
      addMessage(state.barber.name, "usuario");
      return askDate();
    }
    if (state.step === "date") {
      state.date = value;
      addMessage(new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR"), "usuario");
      return askTime();
    }
    if (state.step === "time" && value === "back-date") return askDate();
    if (state.step === "time") {
      state.time = value;
      addMessage(value, "usuario");
      return askConfirmation();
    }
    if (state.step === "confirm" && value === "confirm") return await confirmAppointment();
  } catch (error) {
    console.error(error);
    addMessage("Não consegui concluir agora. Verifique o Firebase e tente novamente.", "bot", true);
    addButton("Recomeçar", "restart", "principal");
  }
});

actions.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = event.target.querySelector("input");
  const value = input.value.trim();

  if (state.step === "name") {
    if (value.length < 2) return;
    state.client = value;
    addMessage(value, "usuario");
    askPhone();
    return;
  }

  if (state.step === "phone") {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
      input.setCustomValidity("Informe um WhatsApp válido com DDD.");
      input.reportValidity();
      return;
    }
    state.phone = value;
    addMessage(value, "usuario");
    askService();
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    conversation.innerHTML = '<div class="aviso-login">Entre primeiro no <a href="index.html">painel administrativo</a> e depois volte ao simulador.</div>';
    clearActions();
    return;
  }

  const profile = await getDoc(doc(db, "usuarios", user.uid));
  if (!profile.exists() || profile.data().tipo !== "admin") {
    conversation.innerHTML = '<div class="aviso-login">Esta conta não possui acesso administrativo.</div>';
    clearActions();
    return;
  }

  try {
    await loadData();
    restart();
  } catch (error) {
    console.error(error);
    addMessage(error.message, "bot", true);
    clearActions();
  }
});

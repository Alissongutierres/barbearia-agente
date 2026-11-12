import {
  auth,
  db,
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {
  const todayInput = document.querySelector("#data");
  const searchForm = document.querySelector(".pesquisa");
  const searchInput = searchForm?.querySelector('input[type="search"]');

  const tableBody = document.querySelector("#lista-agendamentos");
  const emptyRow = document.querySelector("#sem-agendamentos");
  const viewAllButton = document.querySelector("caption p");
  const manageAppointmentsButton = document.querySelector("#gerenciar-agendamentos");
  const manageAppointmentsModal = document.querySelector("#modal-gerenciar-agendamentos");
  const closeManageAppointmentsButton = document.querySelector("#fechar-gerenciar-agendamentos");
  const manageAppointmentsList = document.querySelector("#lista-gerenciar-agendamentos");
  const appointmentDateFilter = document.querySelector("#filtro-agendamento-data");
  const appointmentBarberFilter = document.querySelector("#filtro-agendamento-barbeiro");
  const appointmentStatusFilter = document.querySelector("#filtro-agendamento-status");
  const clearAppointmentFiltersButton = document.querySelector("#limpar-filtros-agendamentos");
  const openReportsButton = document.querySelector("#abrir-relatorios");
  const reportsModal = document.querySelector("#modal-relatorios");
  const closeReportsButton = document.querySelector("#fechar-relatorios");
  const reportStartDate = document.querySelector("#relatorio-data-inicial");
  const reportEndDate = document.querySelector("#relatorio-data-final");
  const applyReportButton = document.querySelector("#aplicar-relatorio");
  const reportTotal = document.querySelector("#relatorio-total");
  const reportConfirmed = document.querySelector("#relatorio-confirmados");
  const reportCancelled = document.querySelector("#relatorio-cancelados");
  const reportRevenue = document.querySelector("#relatorio-receita");
  const reportServices = document.querySelector("#relatorio-servicos");
  const openSettingsButton = document.querySelector("#abrir-configuracoes");
  const settingsModal = document.querySelector("#modal-configuracoes");
  const closeSettingsButton = document.querySelector("#fechar-configuracoes");
  const settingsForm = document.querySelector("#form-configuracoes");
  const settingsMessage = document.querySelector("#mensagem-configuracoes");

  const notificationButton = document.querySelector(".notificacao");
  const notificationCounter = notificationButton?.querySelector(".contador");
  const notificationPanel = document.querySelector(".notificacoes");
  const notificationList = document.querySelector("#lista-notificacoes");

  const profileButton = document.querySelector(".seta");
  const navigationLinks = [...document.querySelectorAll(".nav-bar nav a")];

  const openAppointmentButton = document.querySelector("#abrir-agendamento");
  const appointmentModal = document.querySelector("#modal-agendamento");
  const closeAppointmentButton = document.querySelector("#fechar-agendamento");
  const appointmentForm = document.querySelector("#form-agendamento");
  const appointmentClientInput = document.querySelector("#cliente-agendamento");
  const appointmentPhoneInput = document.querySelector("#telefone-agendamento");
  const registeredClientsList = document.querySelector("#clientes-cadastrados");
  const appointmentServiceSelect = document.querySelector("#servico-agendamento");
  const appointmentBarberSelect = document.querySelector("#barbeiro-agendamento");
  const appointmentDateInput = appointmentForm?.querySelector('[name="data"]');
  const appointmentTimeSelect = document.querySelector("#horario-agendamento");
  const openServiceButton = document.querySelector("#abrir-servico");
  const serviceModal = document.querySelector("#modal-servico");
  const closeServiceButton = document.querySelector("#fechar-servico");
  const serviceForm = document.querySelector("#form-servico");
  const serviceMessage = document.querySelector("#mensagem-servico");
  const manageServicesButton = document.querySelector("#gerenciar-servicos");
  const manageServicesModal = document.querySelector("#modal-gerenciar-servicos");
  const closeManageServicesButton = document.querySelector("#fechar-gerenciar-servicos");
  const manageServicesList = document.querySelector("#lista-gerenciar-servicos");
  const openClientButton = document.querySelector("#abrir-cliente");
  const clientModal = document.querySelector("#modal-cliente");
  const closeClientButton = document.querySelector("#fechar-cliente");
  const clientForm = document.querySelector("#form-cliente");
  const clientMessage = document.querySelector("#mensagem-cliente");
  const manageClientsButton = document.querySelector("#gerenciar-clientes");
  const manageClientsModal = document.querySelector("#modal-gerenciar-clientes");
  const closeManageClientsButton = document.querySelector("#fechar-gerenciar-clientes");
  const manageClientsList = document.querySelector("#lista-gerenciar-clientes");
  const configureHoursButton = document.querySelector("#configurar-horarios");
  const hoursModal = document.querySelector("#modal-horarios");
  const closeHoursButton = document.querySelector("#fechar-horarios");
  const hoursForm = document.querySelector("#form-horarios");
  const hoursMessage = document.querySelector("#mensagem-horarios");
  const openBarberButton = document.querySelector("#abrir-barbeiro");
  const barberModal = document.querySelector("#modal-barbeiro");
  const closeBarberButton = document.querySelector("#fechar-barbeiro");
  const barberForm = document.querySelector("#form-barbeiro");
  const barberMessage = document.querySelector("#mensagem-barbeiro");
  const manageBarbersButton = document.querySelector("#gerenciar-barbeiros");
  const manageBarbersModal = document.querySelector("#modal-gerenciar-barbeiros");
  const closeManageBarbersButton = document.querySelector("#fechar-gerenciar-barbeiros");
  const manageBarbersList = document.querySelector("#lista-gerenciar-barbeiros");
  const panel = document.querySelector("#painel");
  const loginScreen = document.querySelector("#login-screen");
  const loginForm = document.querySelector("#form-login");
  const loginMessage = document.querySelector("#mensagem-login");
  const greeting = document.querySelector("#saudacao");

  const currentHour = new Date().getHours();

  if (greeting) {
    greeting.textContent = currentHour < 12
      ? "Bom dia!"
      : currentHour < 18
        ? "Boa tarde!"
        : "Boa noite!";
  }

  let showingAllAppointments = false;
  let savingAppointment = false;
  let appointmentsLoaded = false;
  let unsubscribeAppointments = null;
  let unsubscribeHours = null;
  let unsubscribeSettings = null;
  let unsubscribeClients = null;
  let unsubscribeServices = null;
  let unsubscribeBarbers = null;
  let savingService = false;
  let savingClient = false;
  let savingBarber = false;
  let savingHours = false;
  let savingSettings = false;
  const updatingServices = new Set();
  const updatingClients = new Set();
  const updatingBarbers = new Set();
  let registeredServices = [];
  let registeredClients = [];
  let registeredBarbers = [];
  let registeredAppointments = [];
  let hoursSettings = null;
  let businessSettings = null;
  let currentNotificationIds = [];
  const pendingStatusUpdates = new Set();
  const appointmentsCollection = collection(db, "agendamentos");
  const clientsCollection = collection(db, "clientes");
  const servicesCollection = collection(db, "servicos");
  const barbersCollection = collection(db, "barbeiros");
  const hoursDocument = doc(db, "configuracoes", "horarios");
  const businessSettingsDocument = doc(db, "configuracoes", "barbearia");
  const readNotificationsStorageKey = "barberbot-notificacoes-lidas";

  const getReadNotificationIds = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem(readNotificationsStorageKey) || "[]"));
    } catch {
      return new Set();
    }
  };

  const saveReadNotificationIds = (ids) => {
    try {
      localStorage.setItem(readNotificationsStorageKey, JSON.stringify([...ids]));
    } catch (error) {
      console.warn("Não foi possível salvar as notificações lidas.", error);
    }
  };

  const updateNotificationCounter = (amount) => {
    if (!notificationCounter || !notificationButton) return;

    notificationCounter.textContent = amount > 99 ? "99+" : String(amount);
    notificationCounter.hidden = amount === 0;
    notificationButton.setAttribute(
      "aria-label",
      amount === 0
        ? "Notificações: nenhuma nova"
        : `Notificações: ${amount} nova(s)`,
    );
  };

  const renderNotifications = (snapshot) => {
    if (!notificationList) return;

    const appointments = snapshot.docs
      .map((appointmentDoc) => ({
        id: appointmentDoc.id,
        ...appointmentDoc.data(),
      }))
      .sort((first, second) => {
        const firstTime = first.createdAt?.toMillis?.() ?? 0;
        const secondTime = second.createdAt?.toMillis?.() ?? 0;
        return secondTime - firstTime;
      });

    currentNotificationIds = appointments.map((appointment) => appointment.id);
    notificationList.replaceChildren();

    if (appointments.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "notificacoes-vazia";
      emptyMessage.textContent = "Nenhuma notificação recente.";
      notificationList.appendChild(emptyMessage);
    } else {
      appointments.slice(0, 4).forEach((appointment, index) => {
        if (index > 0) notificationList.appendChild(document.createElement("hr"));

        const item = document.createElement("div");
        item.className = "notificacoes-item";

        const point = document.createElement("span");
        point.className = "notificacao-ponto";

        const title = document.createElement("h3");
        title.textContent = "Novo agendamento realizado";

        const client = document.createElement("p");
        client.textContent = `Cliente: ${appointment.client}`;

        const schedule = document.createElement("p");
        schedule.textContent = `${new Date(`${appointment.date}T00:00:00`).toLocaleDateString("pt-BR")} às ${appointment.time}`;

        item.append(point, title, client, schedule);
        notificationList.appendChild(item);
      });
    }

    const readIds = getReadNotificationIds();
    const unreadAmount = currentNotificationIds.filter((id) => !readIds.has(id)).length;
    updateNotificationCounter(unreadAmount);
  };

  const statusDefinitions = {
    scheduled: {
      label: "Agendado",
      color: "orange",
      className: "botao-agenda",
    },
    confirmed: {
      label: "Confirmado",
      color: "green",
      className: "botao-confirma",
    },
    "in-service": {
      label: "Em atendimento",
      color: "blue",
      className: "botao-atend",
    },
    cancelled: {
      label: "Cancelado",
      color: "#EF4444",
      className: "botao-cancelado",
    },
  };

  const statusOrder = [
    "scheduled",
    "confirmed",
    "in-service",
    "cancelled",
  ];

  if (todayInput && !todayInput.value) {
    const date = new Date();
    const offset = date.getTimezoneOffset() * 60000;
    todayInput.value = new Date(date - offset).toISOString().slice(0, 10);
  }

  const getAppointments = () => {
    return [...tableBody.querySelectorAll("tr[data-agendamento]")];
  };

  const renderAppointmentBarberFilter = () => {
    if (!appointmentBarberFilter) return;

    const selectedBarber = appointmentBarberFilter.value;
    const names = [...new Set(registeredAppointments.map((item) => item.barber).filter(Boolean))]
      .sort((first, second) => first.localeCompare(second, "pt-BR"));

    appointmentBarberFilter.replaceChildren();
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "Todos";
    appointmentBarberFilter.appendChild(allOption);

    names.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      appointmentBarberFilter.appendChild(option);
    });

    if (names.includes(selectedBarber)) appointmentBarberFilter.value = selectedBarber;
  };

  const renderAppointmentManagement = () => {
    if (!manageAppointmentsList) return;

    renderAppointmentBarberFilter();
    const dateFilter = appointmentDateFilter?.value ?? "";
    const barberFilter = appointmentBarberFilter?.value ?? "";
    const statusFilter = appointmentStatusFilter?.value ?? "";
    const filteredAppointments = [...registeredAppointments]
      .filter((appointment) => !dateFilter || appointment.date === dateFilter)
      .filter((appointment) => !barberFilter || appointment.barber === barberFilter)
      .filter((appointment) => !statusFilter || appointment.status === statusFilter)
      .sort((first, second) =>
        `${first.date} ${first.time}`.localeCompare(`${second.date} ${second.time}`),
      );

    manageAppointmentsList.replaceChildren();

    if (filteredAppointments.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "lista-vazia";
      emptyMessage.textContent = "Nenhum agendamento encontrado.";
      manageAppointmentsList.appendChild(emptyMessage);
      return;
    }

    filteredAppointments.forEach((appointment) => {
      const item = document.createElement("article");
      item.className = "item-gerenciamento";

      const information = document.createElement("div");
      const client = document.createElement("h3");
      const details = document.createElement("p");
      const statusSelect = document.createElement("select");
      const formattedDate = new Date(`${appointment.date}T00:00:00`)
        .toLocaleDateString("pt-BR");

      client.textContent = appointment.client;
      details.textContent = `${formattedDate} às ${appointment.time} • ${appointment.service} • ${appointment.barber}`;
      statusSelect.className = "status-agendamento-select";
      statusSelect.dataset.appointmentId = appointment.id;
      statusSelect.setAttribute("aria-label", `Status do agendamento de ${appointment.client}`);
      statusSelect.disabled = pendingStatusUpdates.has(appointment.id);

      statusOrder.forEach((status) => {
        const option = document.createElement("option");
        option.value = status;
        option.textContent = statusDefinitions[status].label;
        statusSelect.appendChild(option);
      });
      statusSelect.value = statusOrder.includes(appointment.status)
        ? appointment.status
        : "scheduled";

      information.append(client, details);
      item.append(information, statusSelect);
      manageAppointmentsList.appendChild(item);
    });
  };

  const openManageAppointmentsModal = () => {
    renderAppointmentManagement();
    manageAppointmentsModal.hidden = false;
  };

  const closeManageAppointmentsModal = () => {
    if (pendingStatusUpdates.size > 0) return;
    manageAppointmentsModal.hidden = true;
  };

  const getAppointmentPrice = (appointment) => {
    if (Number.isFinite(Number(appointment.price))) return Number(appointment.price);
    const service = registeredServices.find((item) => item.name === appointment.service);
    return Number(service?.price || 0);
  };

  const renderReports = () => {
    if (!reportServices) return;

    const startDate = reportStartDate?.value ?? "";
    const endDate = reportEndDate?.value ?? "";
    const periodAppointments = registeredAppointments.filter((appointment) => {
      return (!startDate || appointment.date >= startDate) &&
        (!endDate || appointment.date <= endDate);
    });
    const confirmedAmount = periodAppointments.filter(
      (appointment) => appointment.status === "confirmed",
    ).length;
    const cancelledAmount = periodAppointments.filter(
      (appointment) => appointment.status === "cancelled",
    ).length;
    const expectedRevenue = periodAppointments
      .filter((appointment) => appointment.status !== "cancelled")
      .reduce((total, appointment) => total + getAppointmentPrice(appointment), 0);

    reportTotal.textContent = String(periodAppointments.length);
    reportConfirmed.textContent = String(confirmedAmount);
    reportCancelled.textContent = String(cancelledAmount);
    reportRevenue.textContent = expectedRevenue.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    const serviceAmounts = periodAppointments.reduce((totals, appointment) => {
      totals.set(appointment.service, (totals.get(appointment.service) || 0) + 1);
      return totals;
    }, new Map());
    const orderedServices = [...serviceAmounts.entries()]
      .sort((first, second) => second[1] - first[1]);

    reportServices.replaceChildren();

    if (orderedServices.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "lista-vazia";
      emptyMessage.textContent = "Nenhum dado no período.";
      reportServices.appendChild(emptyMessage);
      return;
    }

    orderedServices.forEach(([serviceName, amount]) => {
      const row = document.createElement("div");
      const name = document.createElement("span");
      const total = document.createElement("strong");
      row.className = "linha-servico-relatorio";
      name.textContent = serviceName;
      total.textContent = `${amount} agendamento(s)`;
      row.append(name, total);
      reportServices.appendChild(row);
    });
  };

  const openReportsModal = () => {
    if (!reportStartDate.value || !reportEndDate.value) {
      const today = new Date();
      const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 10);
      reportStartDate.value = `${localToday.slice(0, 8)}01`;
      reportEndDate.value = localToday;
    }
    renderReports();
    reportsModal.hidden = false;
  };

  const closeReportsModal = () => {
    reportsModal.hidden = true;
  };

  const renderSettingsForm = () => {
    if (!settingsForm) return;

    const settings = businessSettings ?? {
      name: "Barbearia Fio de Ouro",
      phone: "",
      address: "",
      city: "",
      minimumNoticeHours: 0,
      welcomeMessage: "Olá! Bem-vindo à Barbearia Fio de Ouro.",
    };

    settingsForm.querySelector('[name="nome"]').value = settings.name ?? "";
    settingsForm.querySelector('[name="telefone"]').value = settings.phone ?? "";
    settingsForm.querySelector('[name="endereco"]').value = settings.address ?? "";
    settingsForm.querySelector('[name="cidade"]').value = settings.city ?? "";
    settingsForm.querySelector('[name="antecedencia"]').value = String(
      settings.minimumNoticeHours ?? 0,
    );
    settingsForm.querySelector('[name="mensagem"]').value = settings.welcomeMessage ?? "";
  };

  const openSettingsModal = () => {
    renderSettingsForm();
    settingsMessage.textContent = "";
    settingsModal.hidden = false;
  };

  const closeSettingsModal = () => {
    if (savingSettings) return;
    settingsModal.hidden = true;
    settingsMessage.textContent = "";
  };

  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(":").map(Number);
    return (hours * 60) + minutes;
  };

  const minutesToTime = (totalMinutes) => {
    const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
    const minutes = String(totalMinutes % 60).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const getServiceDuration = (serviceName) => {
    const service = registeredServices.find((item) => item.name === serviceName);
    return Number(service?.duration || hoursSettings?.interval || 30);
  };

  const isAppointmentSlotAvailable = ({ date, time, barber, service }) => {
    const candidateStart = timeToMinutes(time);
    const candidateEnd = candidateStart + getServiceDuration(service);

    return !getAppointments().some((row) => {
      const status = row.querySelector("button[data-status]")?.dataset.status;
      if (
        status === "cancelled" ||
        row.dataset.date !== date ||
        row.dataset.barber !== barber
      ) {
        return false;
      }

      const existingStart = timeToMinutes(row.dataset.time);
      const existingDuration = Number(
        row.dataset.duration || getServiceDuration(row.dataset.service),
      );
      const existingEnd = existingStart + existingDuration;
      return candidateStart < existingEnd && candidateEnd > existingStart;
    });
  };

  const renderAvailableAppointmentTimes = () => {
    if (!appointmentTimeSelect) return;

    const selectedTime = appointmentTimeSelect.value;
    const date = appointmentDateInput?.value;
    const service = appointmentServiceSelect?.value;
    const barber = appointmentBarberSelect?.value;
    appointmentTimeSelect.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    appointmentTimeSelect.appendChild(placeholder);

    if (!hoursSettings) {
      placeholder.textContent = "Configure os horários de funcionamento";
      appointmentTimeSelect.disabled = true;
      return;
    }

    if (!date || !service || !barber) {
      placeholder.textContent = "Selecione data, serviço e barbeiro";
      appointmentTimeSelect.disabled = true;
      return;
    }

    const selectedDate = new Date(`${date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today || !hoursSettings.days.includes(selectedDate.getDay())) {
      placeholder.textContent = selectedDate < today
        ? "Não é possível agendar em uma data passada"
        : "A barbearia não funciona nesta data";
      appointmentTimeSelect.disabled = true;
      return;
    }

    const opening = timeToMinutes(hoursSettings.opening);
    const closing = timeToMinutes(hoursSettings.closing);
    const duration = getServiceDuration(service);
    const interval = Number(hoursSettings.interval);
    const earliestAllowedTime = new Date(
      Date.now() + (Number(businessSettings?.minimumNoticeHours || 0) * 60 * 60 * 1000),
    );
    let availableAmount = 0;

    for (let start = opening; start + duration <= closing; start += interval) {
      const time = minutesToTime(start);
      const slotDateTime = new Date(`${date}T${time}:00`);
      if (slotDateTime <= earliestAllowedTime) continue;
      if (!isAppointmentSlotAvailable({ date, time, barber, service })) continue;

      const option = document.createElement("option");
      option.value = time;
      option.textContent = time;
      appointmentTimeSelect.appendChild(option);
      availableAmount += 1;
    }

    placeholder.textContent = availableAmount
      ? "Selecione um horário disponível"
      : "Nenhum horário disponível";
    appointmentTimeSelect.disabled = availableAmount === 0;

    if ([...appointmentTimeSelect.options].some((option) => option.value === selectedTime)) {
      appointmentTimeSelect.value = selectedTime;
    }
  };

  const updateCards = () => {
    const selectedDate = todayInput?.value;
    const appointmentsToday = getAppointments().filter(
      (row) => row.dataset.date === selectedDate,
    );

    const buttons = appointmentsToday
      .map((row) => row.querySelector("button[data-status]"))
      .filter(Boolean);

    const confirmed = buttons.filter(
      (button) => button.dataset.status === "confirmed",
    ).length;

    const inService = buttons.filter(
      (button) => button.dataset.status === "in-service",
    ).length;

    const cancelled = buttons.filter(
      (button) => button.dataset.status === "cancelled",
    ).length;

    const cards = document.querySelectorAll(".status-painel .painel-item");

    if (cards.length < 4) return;

    cards[0].querySelector(".number").textContent = buttons.length;
    cards[0].querySelector(".painel-port").textContent =
      buttons.length === 0
        ? "Nenhum agendamento hoje"
        : buttons.length === 1
          ? "Agendamento nesta data"
          : "Agendamentos nesta data";

    cards[1].querySelector(".number").textContent = confirmed;
    cards[1].querySelector(".painel-port").textContent =
      buttons.length
        ? `${Math.round((confirmed / buttons.length) * 100)} % do total`
        : "0 % do total";

    cards[2].querySelector(".number").textContent = inService;
    cards[3].querySelector(".number").textContent = cancelled;
    cards[3].querySelector(".painel-port").textContent =
      buttons.length
        ? `${Math.round((cancelled / buttons.length) * 100)}% Total`
        : "0% Total";
  };

  const updateTableView = () => {
    const selectedDate = todayInput?.value;
    const searchTerm = searchInput?.value.trim().toLowerCase() ?? "";
    const appointments = getAppointments();

    appointments.forEach((row) => {
      const matchesDate =
        showingAllAppointments || row.dataset.date === selectedDate;

      const matchesSearch =
        searchTerm === "" ||
        row.textContent.toLowerCase().includes(searchTerm);

      row.hidden = !matchesDate || !matchesSearch;
    });

    const visibleAppointments = appointments.filter((row) => !row.hidden);

    if (emptyRow) {
      emptyRow.hidden = visibleAppointments.length > 0;

      emptyRow.querySelector("td").textContent = showingAllAppointments
        ? "Nenhum agendamento cadastrado."
        : "Nenhum agendamento para esta data.";
    }

    updateCards();
  };

  const configureStatusButton = (button, appointmentId, initialStatus) => {
    button.type = "button";
    button.dataset.status = initialStatus;

    const applyStatus = (status) => {
      const definition = statusDefinitions[status];

      button.dataset.status = status;
      button.className = definition.className;
      button.style.backgroundColor = definition.color;
      button.setAttribute(
        "aria-label",
        `Status: ${definition.label}. Clique para alterar.`,
      );

      const textElement = button.querySelector(".boton-text");

      if (textElement) {
        textElement.textContent = definition.label;
      } else {
        button.textContent = definition.label;
      }
    };

    applyStatus(statusOrder.includes(initialStatus) ? initialStatus : "scheduled");

    button.addEventListener("click", async () => {
      if (pendingStatusUpdates.has(appointmentId)) return;
      const currentIndex = statusOrder.indexOf(button.dataset.status);
      const nextStatus =
        statusOrder[(currentIndex + 1) % statusOrder.length];

      pendingStatusUpdates.add(appointmentId);

      try {
        await updateDoc(doc(appointmentsCollection, appointmentId), {
          status: nextStatus,
        });
      } catch (error) {
        console.error("Erro ao atualizar o status do agendamento.", error);
        alert("Não foi possível atualizar o status. Tente novamente.");
      } finally {
        pendingStatusUpdates.delete(appointmentId);
      }
    });
  };

  const addAppointmentToTable = (appointment) => {
    const row = document.createElement("tr");

    row.dataset.agendamento = "true";
    row.dataset.date = appointment.date;
    row.dataset.time = appointment.time;
    row.dataset.barber = appointment.barber;
    row.dataset.service = appointment.service;
    row.dataset.duration = String(
      appointment.duration || getServiceDuration(appointment.service),
    );
    row.dataset.phone = appointment.phone;

    const dateCell = document.createElement("td");

    dateCell.textContent = new Date(
      `${appointment.date}T00:00:00`,
    ).toLocaleDateString("pt-BR");

    const timeCell = document.createElement("td");
    timeCell.textContent = appointment.time;

    const clientCell = document.createElement("td");
    clientCell.textContent = appointment.client;

    const serviceCell = document.createElement("td");
    serviceCell.textContent = appointment.service;

    const barberCell = document.createElement("td");
    barberCell.textContent = appointment.barber;

    const statusCell = document.createElement("td");
    const statusButton = document.createElement("button");
    const statusText = document.createElement("span");

    statusText.className = "boton-text";
    statusButton.appendChild(statusText);
    statusCell.appendChild(statusButton);

    row.append(
      dateCell,
      timeCell,
      clientCell,
      serviceCell,
      barberCell,
      statusCell,
    );

    tableBody.appendChild(row);
    configureStatusButton(statusButton, appointment.id, appointment.status);
  };

  const openAppointmentModal = () => {
    appointmentModal.hidden = false;

    const now = new Date();
    const localToday = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    appointmentDateInput.min = localToday;
    appointmentDateInput.value = todayInput.value >= localToday
      ? todayInput.value
      : localToday;
    renderAvailableAppointmentTimes();

    appointmentForm.querySelector('[name="cliente"]').focus();
  };

  const renderHoursForm = () => {
    if (!hoursForm) return;

    const settings = hoursSettings ?? {
      days: [1, 2, 3, 4, 5, 6],
      opening: "09:00",
      closing: "18:00",
      interval: 30,
    };

    hoursForm.querySelectorAll('[name="dias"]').forEach((checkbox) => {
      checkbox.checked = settings.days.includes(Number(checkbox.value));
    });
    hoursForm.querySelector('[name="abertura"]').value = settings.opening;
    hoursForm.querySelector('[name="fechamento"]').value = settings.closing;
    hoursForm.querySelector('[name="intervalo"]').value = String(settings.interval);
  };

  const openHoursModal = () => {
    renderHoursForm();
    hoursMessage.textContent = "";
    hoursModal.hidden = false;
  };

  const closeHoursModal = () => {
    if (savingHours) return;
    hoursModal.hidden = true;
    hoursMessage.textContent = "";
  };

  const renderAppointmentBarbers = () => {
    if (!appointmentBarberSelect) return;

    const selectedBarber = appointmentBarberSelect.value;
    const activeBarbers = registeredBarbers
      .filter((barber) => barber.status === "ativo")
      .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));

    appointmentBarberSelect.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = activeBarbers.length
      ? "Selecione"
      : "Cadastre um barbeiro ativo";
    appointmentBarberSelect.appendChild(placeholder);

    activeBarbers.forEach((barber) => {
      const option = document.createElement("option");
      option.value = barber.name;
      option.textContent = barber.name;
      option.dataset.barberId = barber.id;
      appointmentBarberSelect.appendChild(option);
    });

    appointmentBarberSelect.disabled = activeBarbers.length === 0;

    if (activeBarbers.some((barber) => barber.name === selectedBarber)) {
      appointmentBarberSelect.value = selectedBarber;
    }
    renderAvailableAppointmentTimes();
  };

  const renderBarberManagement = () => {
    if (!manageBarbersList) return;

    manageBarbersList.replaceChildren();

    if (registeredBarbers.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "lista-vazia";
      emptyMessage.textContent = "Nenhum barbeiro cadastrado.";
      manageBarbersList.appendChild(emptyMessage);
      return;
    }

    [...registeredBarbers]
      .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"))
      .forEach((barber) => {
        const item = document.createElement("article");
        item.className = "item-gerenciamento";

        const information = document.createElement("div");
        const name = document.createElement("h3");
        const details = document.createElement("p");
        const toggleButton = document.createElement("button");
        const isActive = barber.status === "ativo";

        name.textContent = barber.name;
        details.textContent = `${barber.phone} • ${isActive ? "Ativo" : "Inativo"}`;
        toggleButton.type = "button";
        toggleButton.dataset.barberId = barber.id;
        toggleButton.dataset.nextStatus = isActive ? "inativo" : "ativo";
        toggleButton.textContent = isActive ? "Inativar" : "Ativar";
        toggleButton.disabled = updatingBarbers.has(barber.id);

        information.append(name, details);
        item.append(information, toggleButton);
        manageBarbersList.appendChild(item);
      });
  };

  const openManageBarbersModal = () => {
    renderBarberManagement();
    manageBarbersModal.hidden = false;
  };

  const closeManageBarbersModal = () => {
    if (updatingBarbers.size > 0) return;
    manageBarbersModal.hidden = true;
  };

  const renderAppointmentServices = () => {
    if (!appointmentServiceSelect) return;

    const selectedService = appointmentServiceSelect.value;
    const activeServices = registeredServices
      .filter((service) => service.status === "ativo")
      .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));

    appointmentServiceSelect.replaceChildren();

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = activeServices.length
      ? "Selecione"
      : "Cadastre um serviço ativo";
    appointmentServiceSelect.appendChild(placeholder);

    activeServices.forEach((service) => {
      const option = document.createElement("option");
      option.value = service.name;
      option.textContent = service.name;
      option.dataset.serviceId = service.id;
      option.dataset.duration = String(service.duration);
      appointmentServiceSelect.appendChild(option);
    });

    appointmentServiceSelect.disabled = activeServices.length === 0;

    if (activeServices.some((service) => service.name === selectedService)) {
      appointmentServiceSelect.value = selectedService;
    }
    renderAvailableAppointmentTimes();
  };

  const renderServiceManagement = () => {
    if (!manageServicesList) return;

    manageServicesList.replaceChildren();

    if (registeredServices.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "lista-vazia";
      emptyMessage.textContent = "Nenhum serviço cadastrado.";
      manageServicesList.appendChild(emptyMessage);
      return;
    }

    [...registeredServices]
      .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"))
      .forEach((service) => {
        const item = document.createElement("article");
        item.className = "item-gerenciamento";

        const information = document.createElement("div");
        const name = document.createElement("h3");
        const details = document.createElement("p");
        const toggleButton = document.createElement("button");
        const isActive = service.status === "ativo";
        const formattedPrice = Number(service.price || 0).toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        });

        name.textContent = service.name;
        details.textContent = `${service.duration} min • ${formattedPrice} • ${isActive ? "Ativo" : "Inativo"}`;
        toggleButton.type = "button";
        toggleButton.dataset.serviceId = service.id;
        toggleButton.dataset.nextStatus = isActive ? "inativo" : "ativo";
        toggleButton.textContent = isActive ? "Inativar" : "Ativar";
        toggleButton.disabled = updatingServices.has(service.id);

        information.append(name, details);
        item.append(information, toggleButton);
        manageServicesList.appendChild(item);
      });
  };

  const openManageServicesModal = () => {
    renderServiceManagement();
    manageServicesModal.hidden = false;
  };

  const closeManageServicesModal = () => {
    if (updatingServices.size > 0) return;
    manageServicesModal.hidden = true;
  };

  const renderAppointmentClients = () => {
    if (!registeredClientsList) return;

    const activeClients = registeredClients
      .filter((client) => client.status === "ativo")
      .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"));

    registeredClientsList.replaceChildren();

    activeClients.forEach((client) => {
      const option = document.createElement("option");
      option.value = client.name;
      option.label = client.phone;
      registeredClientsList.appendChild(option);
    });
  };

  const renderClientManagement = () => {
    if (!manageClientsList) return;

    manageClientsList.replaceChildren();

    if (registeredClients.length === 0) {
      const emptyMessage = document.createElement("p");
      emptyMessage.className = "lista-vazia";
      emptyMessage.textContent = "Nenhum cliente cadastrado.";
      manageClientsList.appendChild(emptyMessage);
      return;
    }

    [...registeredClients]
      .sort((first, second) => first.name.localeCompare(second.name, "pt-BR"))
      .forEach((client) => {
        const item = document.createElement("article");
        item.className = "item-gerenciamento";

        const information = document.createElement("div");
        const name = document.createElement("h3");
        const details = document.createElement("p");
        const toggleButton = document.createElement("button");
        const isActive = client.status === "ativo";
        const contact = client.email ? `${client.phone} • ${client.email}` : client.phone;

        name.textContent = client.name;
        details.textContent = `${contact} • ${isActive ? "Ativo" : "Inativo"}`;
        toggleButton.type = "button";
        toggleButton.dataset.clientId = client.id;
        toggleButton.dataset.nextStatus = isActive ? "inativo" : "ativo";
        toggleButton.textContent = isActive ? "Inativar" : "Ativar";
        toggleButton.disabled = updatingClients.has(client.id);

        information.append(name, details);
        item.append(information, toggleButton);
        manageClientsList.appendChild(item);
      });
  };

  const openManageClientsModal = () => {
    renderClientManagement();
    manageClientsModal.hidden = false;
  };

  const closeManageClientsModal = () => {
    if (updatingClients.size > 0) return;
    manageClientsModal.hidden = true;
  };

  const fillRegisteredClientPhone = () => {
    if (!appointmentClientInput || !appointmentPhoneInput) return;

    const selectedName = appointmentClientInput.value.trim().toLocaleLowerCase("pt-BR");
    const selectedClient = registeredClients.find(
      (client) =>
        client.status === "ativo" &&
        client.name.toLocaleLowerCase("pt-BR") === selectedName,
    );

    if (selectedClient) {
      appointmentPhoneInput.value = selectedClient.phone;
    }
  };

  const openClientModal = () => {
    clientModal.hidden = false;
    clientMessage.textContent = "";
    clientForm.querySelector('[name="nome"]').focus();
  };

  const closeClientModal = () => {
    if (savingClient) return;
    clientModal.hidden = true;
    clientForm.reset();
    clientMessage.textContent = "";
  };

  const openServiceModal = () => {
    serviceModal.hidden = false;
    serviceMessage.textContent = "";
    serviceForm.querySelector('[name="nome"]').focus();
  };

  const closeServiceModal = () => {
    if (savingService) return;
    serviceModal.hidden = true;
    serviceForm.reset();
    serviceMessage.textContent = "";
  };

  const openBarberModal = () => {
    barberModal.hidden = false;
    barberMessage.textContent = "";
    barberForm.querySelector('[name="nome"]').focus();
  };

  const closeBarberModal = () => {
    if (savingBarber) return;
    barberModal.hidden = true;
    barberForm.reset();
    barberMessage.textContent = "";
  };

  const closeAppointmentModal = () => {
    if (savingAppointment) return;
    appointmentModal.hidden = true;
    appointmentForm.reset();
  };

  openAppointmentButton?.addEventListener("click", openAppointmentModal);

  openAppointmentButton?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openAppointmentModal();
    }
  });

  closeAppointmentButton?.addEventListener("click", closeAppointmentModal);

  openReportsButton?.addEventListener("click", (event) => {
    event.preventDefault();
    openReportsModal();
  });

  closeReportsButton?.addEventListener("click", closeReportsModal);

  openSettingsButton?.addEventListener("click", (event) => {
    event.preventDefault();
    openSettingsModal();
  });

  closeSettingsButton?.addEventListener("click", closeSettingsModal);

  manageAppointmentsButton?.addEventListener("click", (event) => {
    event.preventDefault();
    openManageAppointmentsModal();
  });

  closeManageAppointmentsButton?.addEventListener("click", closeManageAppointmentsModal);

  configureHoursButton?.addEventListener("click", (event) => {
    event.preventDefault();
    openHoursModal();
  });

  closeHoursButton?.addEventListener("click", closeHoursModal);

  manageClientsButton?.addEventListener("click", (event) => {
    event.preventDefault();
    openManageClientsModal();
  });

  closeManageClientsButton?.addEventListener("click", closeManageClientsModal);

  manageServicesButton?.addEventListener("click", (event) => {
    event.preventDefault();
    openManageServicesModal();
  });

  closeManageServicesButton?.addEventListener("click", closeManageServicesModal);

  manageBarbersButton?.addEventListener("click", (event) => {
    event.preventDefault();
    openManageBarbersModal();
  });

  closeManageBarbersButton?.addEventListener("click", closeManageBarbersModal);

  openClientButton?.addEventListener("click", openClientModal);

  openClientButton?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openClientModal();
    }
  });

  closeClientButton?.addEventListener("click", closeClientModal);

  openServiceButton?.addEventListener("click", openServiceModal);

  openServiceButton?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openServiceModal();
    }
  });

  closeServiceButton?.addEventListener("click", closeServiceModal);

  openBarberButton?.addEventListener("click", openBarberModal);

  openBarberButton?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openBarberModal();
    }
  });

  closeBarberButton?.addEventListener("click", closeBarberModal);

  appointmentModal?.addEventListener("click", (event) => {
    if (event.target === appointmentModal) {
      closeAppointmentModal();
    }
  });

  reportsModal?.addEventListener("click", (event) => {
    if (event.target === reportsModal) closeReportsModal();
  });

  settingsModal?.addEventListener("click", (event) => {
    if (event.target === settingsModal) closeSettingsModal();
  });

  manageAppointmentsModal?.addEventListener("click", (event) => {
    if (event.target === manageAppointmentsModal) {
      closeManageAppointmentsModal();
    }
  });

  hoursModal?.addEventListener("click", (event) => {
    if (event.target === hoursModal) {
      closeHoursModal();
    }
  });

  manageClientsModal?.addEventListener("click", (event) => {
    if (event.target === manageClientsModal) {
      closeManageClientsModal();
    }
  });

  manageServicesModal?.addEventListener("click", (event) => {
    if (event.target === manageServicesModal) {
      closeManageServicesModal();
    }
  });

  manageBarbersModal?.addEventListener("click", (event) => {
    if (event.target === manageBarbersModal) {
      closeManageBarbersModal();
    }
  });

  clientModal?.addEventListener("click", (event) => {
    if (event.target === clientModal) {
      closeClientModal();
    }
  });

  serviceModal?.addEventListener("click", (event) => {
    if (event.target === serviceModal) {
      closeServiceModal();
    }
  });

  barberModal?.addEventListener("click", (event) => {
    if (event.target === barberModal) {
      closeBarberModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && appointmentModal && !appointmentModal.hidden) {
      closeAppointmentModal();
    }

    if (event.key === "Escape" && reportsModal && !reportsModal.hidden) {
      closeReportsModal();
    }

    if (event.key === "Escape" && settingsModal && !settingsModal.hidden) {
      closeSettingsModal();
    }

    if (event.key === "Escape" && manageAppointmentsModal && !manageAppointmentsModal.hidden) {
      closeManageAppointmentsModal();
    }

    if (event.key === "Escape" && hoursModal && !hoursModal.hidden) {
      closeHoursModal();
    }

    if (event.key === "Escape" && manageClientsModal && !manageClientsModal.hidden) {
      closeManageClientsModal();
    }

    if (event.key === "Escape" && manageServicesModal && !manageServicesModal.hidden) {
      closeManageServicesModal();
    }

    if (event.key === "Escape" && manageBarbersModal && !manageBarbersModal.hidden) {
      closeManageBarbersModal();
    }

    if (event.key === "Escape" && clientModal && !clientModal.hidden) {
      closeClientModal();
    }

    if (event.key === "Escape" && serviceModal && !serviceModal.hidden) {
      closeServiceModal();
    }

    if (event.key === "Escape" && barberModal && !barberModal.hidden) {
      closeBarberModal();
    }
  });

  appointmentClientInput?.addEventListener("change", fillRegisteredClientPhone);
  appointmentClientInput?.addEventListener("blur", fillRegisteredClientPhone);
  appointmentDateInput?.addEventListener("change", renderAvailableAppointmentTimes);
  appointmentServiceSelect?.addEventListener("change", renderAvailableAppointmentTimes);
  appointmentBarberSelect?.addEventListener("change", renderAvailableAppointmentTimes);

  appointmentDateFilter?.addEventListener("change", renderAppointmentManagement);
  appointmentBarberFilter?.addEventListener("change", renderAppointmentManagement);
  appointmentStatusFilter?.addEventListener("change", renderAppointmentManagement);

  applyReportButton?.addEventListener("click", () => {
    if (reportStartDate.value && reportEndDate.value && reportStartDate.value > reportEndDate.value) {
      alert("A data inicial deve ser anterior à data final.");
      return;
    }
    renderReports();
  });

  settingsForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (savingSettings) return;

    const formData = new FormData(settingsForm);
    const name = formData.get("nome").trim().replace(/\s+/g, " ");
    const phone = formData.get("telefone").trim();
    const address = formData.get("endereco").trim().replace(/\s+/g, " ");
    const city = formData.get("cidade").trim().replace(/\s+/g, " ");
    const minimumNoticeHours = Number(formData.get("antecedencia"));
    const welcomeMessage = formData.get("mensagem").trim();
    const phoneDigits = phone.replace(/\D/g, "");

    settingsMessage.textContent = "";

    if (name.length < 2 || address.length < 3 || city.length < 2) {
      settingsMessage.textContent = "Preencha corretamente os dados da barbearia.";
      return;
    }

    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      settingsMessage.textContent = "Informe um WhatsApp válido com DDD.";
      return;
    }

    if (![0, 1, 2, 4, 12, 24].includes(minimumNoticeHours)) {
      settingsMessage.textContent = "Selecione uma antecedência válida.";
      return;
    }

    savingSettings = true;
    const submitButton = event.submitter;
    if (submitButton) submitButton.disabled = true;
    settingsMessage.textContent = "Salvando...";

    try {
      await setDoc(businessSettingsDocument, {
        name,
        phone,
        address,
        city,
        minimumNoticeHours,
        welcomeMessage,
        updatedAt: serverTimestamp(),
      });

      savingSettings = false;
      closeSettingsModal();
      alert("Configurações salvas com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar as configurações.", error);
      settingsMessage.textContent = "Não foi possível salvar as configurações.";
    } finally {
      savingSettings = false;
      if (submitButton) submitButton.disabled = false;
    }
  });

  clearAppointmentFiltersButton?.addEventListener("click", () => {
    appointmentDateFilter.value = "";
    appointmentBarberFilter.value = "";
    appointmentStatusFilter.value = "";
    renderAppointmentManagement();
  });

  manageAppointmentsList?.addEventListener("change", async (event) => {
    const select = event.target.closest("select[data-appointment-id]");
    if (!select || pendingStatusUpdates.has(select.dataset.appointmentId)) return;

    const appointmentId = select.dataset.appointmentId;
    const nextStatus = select.value;
    pendingStatusUpdates.add(appointmentId);
    renderAppointmentManagement();

    try {
      await updateDoc(doc(appointmentsCollection, appointmentId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Erro ao atualizar o agendamento.", error);
      alert("Não foi possível atualizar o agendamento.");
    } finally {
      pendingStatusUpdates.delete(appointmentId);
      renderAppointmentManagement();
    }
  });

  hoursForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (savingHours) return;

    const formData = new FormData(hoursForm);
    const days = formData.getAll("dias").map(Number).sort((first, second) => first - second);
    const opening = formData.get("abertura");
    const closing = formData.get("fechamento");
    const interval = Number(formData.get("intervalo"));

    hoursMessage.textContent = "";

    if (days.length === 0) {
      hoursMessage.textContent = "Selecione pelo menos um dia de atendimento.";
      return;
    }

    if (!opening || !closing || opening >= closing) {
      hoursMessage.textContent = "O fechamento deve ser depois da abertura.";
      return;
    }

    if (![15, 30, 45, 60].includes(interval)) {
      hoursMessage.textContent = "Selecione um intervalo válido.";
      return;
    }

    savingHours = true;
    const submitButton = event.submitter;
    if (submitButton) submitButton.disabled = true;
    hoursMessage.textContent = "Salvando...";

    try {
      await setDoc(hoursDocument, {
        days,
        opening,
        closing,
        interval,
        updatedAt: serverTimestamp(),
      });

      savingHours = false;
      closeHoursModal();
      alert("Horários salvos com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar os horários.", error);
      hoursMessage.textContent = "Não foi possível salvar. Verifique o acesso ao Firebase.";
    } finally {
      savingHours = false;
      if (submitButton) submitButton.disabled = false;
    }
  });

  manageClientsList?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-client-id]");
    if (!button || updatingClients.has(button.dataset.clientId)) return;

    const clientId = button.dataset.clientId;
    const nextStatus = button.dataset.nextStatus;
    updatingClients.add(clientId);
    renderClientManagement();

    try {
      await updateDoc(doc(db, "clientes", clientId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Erro ao atualizar o cliente.", error);
      alert("Não foi possível atualizar o cliente.");
    } finally {
      updatingClients.delete(clientId);
      renderClientManagement();
    }
  });

  manageServicesList?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-service-id]");
    if (!button || updatingServices.has(button.dataset.serviceId)) return;

    const serviceId = button.dataset.serviceId;
    const nextStatus = button.dataset.nextStatus;
    updatingServices.add(serviceId);
    renderServiceManagement();

    try {
      await updateDoc(doc(db, "servicos", serviceId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Erro ao atualizar o serviço.", error);
      alert("Não foi possível atualizar o serviço.");
    } finally {
      updatingServices.delete(serviceId);
      renderServiceManagement();
    }
  });

  manageBarbersList?.addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-barber-id]");
    if (!button || updatingBarbers.has(button.dataset.barberId)) return;

    const barberId = button.dataset.barberId;
    const nextStatus = button.dataset.nextStatus;
    updatingBarbers.add(barberId);
    renderBarberManagement();

    try {
      await updateDoc(doc(db, "barbeiros", barberId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Erro ao atualizar o barbeiro.", error);
      alert("Não foi possível atualizar o barbeiro.");
    } finally {
      updatingBarbers.delete(barberId);
      renderBarberManagement();
    }
  });

  clientForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (savingClient) return;

    const formData = new FormData(clientForm);
    const name = formData.get("nome").trim().replace(/\s+/g, " ");
    const phone = formData.get("telefone").trim();
    const email = formData.get("email").trim().toLocaleLowerCase("pt-BR");
    const status = formData.get("status");
    const phoneDigits = phone.replace(/\D/g, "");

    clientMessage.textContent = "";

    if (name.length < 2) {
      clientMessage.textContent = "Informe o nome do cliente.";
      return;
    }

    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      clientMessage.textContent = "Informe um WhatsApp válido com DDD.";
      return;
    }

    const alreadyRegistered = registeredClients.some(
      (client) =>
        client.phone.replace(/\D/g, "") === phoneDigits ||
        client.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"),
    );

    if (alreadyRegistered) {
      clientMessage.textContent = "Este cliente já está cadastrado.";
      return;
    }

    savingClient = true;
    const submitButton = event.submitter;
    if (submitButton) submitButton.disabled = true;
    clientMessage.textContent = "Salvando...";

    try {
      await addDoc(clientsCollection, {
        name,
        phone,
        email,
        status,
        createdAt: serverTimestamp(),
      });

      savingClient = false;
      closeClientModal();
      alert("Cliente cadastrado com sucesso.");
    } catch (error) {
      console.error("Erro ao cadastrar cliente.", error);
      clientMessage.textContent = "Não foi possível salvar. Verifique o acesso ao Firebase.";
    } finally {
      savingClient = false;
      if (submitButton) submitButton.disabled = false;
    }
  });

  serviceForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (savingService) return;

    const formData = new FormData(serviceForm);
    const name = formData.get("nome").trim().replace(/\s+/g, " ");
    const duration = Number(formData.get("duracao"));
    const price = Number(formData.get("preco"));
    const status = formData.get("status");

    serviceMessage.textContent = "";

    if (name.length < 2) {
      serviceMessage.textContent = "Informe o nome do serviço.";
      return;
    }

    if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
      serviceMessage.textContent = "Informe uma duração válida entre 5 e 480 minutos.";
      return;
    }

    if (!Number.isFinite(price) || price < 0 || price > 10000) {
      serviceMessage.textContent = "Informe um preço válido.";
      return;
    }

    const alreadyRegistered = registeredServices.some(
      (service) => service.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"),
    );

    if (alreadyRegistered) {
      serviceMessage.textContent = "Este serviço já está cadastrado.";
      return;
    }

    savingService = true;
    const submitButton = event.submitter;
    if (submitButton) submitButton.disabled = true;
    serviceMessage.textContent = "Salvando...";

    try {
      await addDoc(servicesCollection, {
        name,
        duration,
        price: Math.round(price * 100) / 100,
        status,
        createdAt: serverTimestamp(),
      });

      savingService = false;
      closeServiceModal();
      alert("Serviço cadastrado com sucesso.");
    } catch (error) {
      console.error("Erro ao cadastrar serviço.", error);
      serviceMessage.textContent = "Não foi possível salvar. Verifique o acesso ao Firebase.";
    } finally {
      savingService = false;
      if (submitButton) submitButton.disabled = false;
    }
  });

  barberForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (savingBarber) return;

    const formData = new FormData(barberForm);
    const name = formData.get("nome").trim().replace(/\s+/g, " ");
    const phone = formData.get("telefone").trim();
    const status = formData.get("status");
    const phoneDigits = phone.replace(/\D/g, "");

    barberMessage.textContent = "";

    if (name.length < 2) {
      barberMessage.textContent = "Informe o nome completo do barbeiro.";
      return;
    }

    if (phoneDigits.length < 10 || phoneDigits.length > 13) {
      barberMessage.textContent = "Informe um WhatsApp válido com DDD.";
      return;
    }

    const alreadyRegistered = registeredBarbers.some(
      (barber) => barber.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"),
    );

    if (alreadyRegistered) {
      barberMessage.textContent = "Este barbeiro já está cadastrado.";
      return;
    }

    savingBarber = true;
    const submitButton = event.submitter;
    if (submitButton) submitButton.disabled = true;
    barberMessage.textContent = "Salvando...";

    try {
      await addDoc(barbersCollection, {
        name,
        phone,
        status,
        createdAt: serverTimestamp(),
      });

      savingBarber = false;
      closeBarberModal();
      alert("Barbeiro cadastrado com sucesso.");
    } catch (error) {
      console.error("Erro ao cadastrar barbeiro.", error);
      barberMessage.textContent = "Não foi possível salvar. Verifique o acesso ao Firebase.";
    } finally {
      savingBarber = false;
      if (submitButton) submitButton.disabled = false;
    }
  });

  appointmentForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (savingAppointment) return;
    if (!appointmentsLoaded) {
      alert("Aguarde o carregamento dos agendamentos antes de cadastrar.");
      return;
    }

    const formData = new FormData(appointmentForm);

    const appointment = {
      client: formData.get("cliente").trim(),
      phone: formData.get("telefone").trim(),
      service: formData.get("servico"),
      barber: formData.get("barbeiro"),
      date: formData.get("data"),
      time: formData.get("horario"),
    };
    appointment.duration = getServiceDuration(appointment.service);
    appointment.price = Number(
      registeredServices.find((service) => service.name === appointment.service)?.price || 0,
    );

    if (!isAppointmentSlotAvailable(appointment)) {
      alert("Este horário não está mais disponível para o barbeiro selecionado.");
      renderAvailableAppointmentTimes();
      return;
    }

    savingAppointment = true;
    const submitButton = event.submitter;
    if (submitButton) submitButton.disabled = true;

    try {
      await addDoc(appointmentsCollection, {
        ...appointment,
        status: "scheduled",
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Erro ao salvar o agendamento.", error);
      alert("Não foi possível salvar o agendamento. Tente novamente.");
      return;
    } finally {
      savingAppointment = false;
      if (submitButton) submitButton.disabled = false;
    }

    todayInput.value = appointment.date;
    showingAllAppointments = false;

    if (viewAllButton) {
      viewAllButton.textContent = "Ver todos";
    }

    closeAppointmentModal();
    updateTableView();
  });

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    updateTableView();
  });

  searchInput?.addEventListener("input", updateTableView);

  todayInput?.addEventListener("change", () => {
    showingAllAppointments = false;

    if (viewAllButton) {
      viewAllButton.textContent = "Ver todos";
    }

    updateTableView();
  });

  if (viewAllButton) {
    viewAllButton.setAttribute("role", "button");
    viewAllButton.setAttribute("tabindex", "0");

    const toggleAllAppointments = () => {
      showingAllAppointments = !showingAllAppointments;

      viewAllButton.textContent = showingAllAppointments
        ? "Ver somente esta data"
        : "Ver todos";

      updateTableView();
    };

    viewAllButton.addEventListener("click", toggleAllAppointments);

    viewAllButton.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleAllAppointments();
      }
    });
  }

  notificationButton?.addEventListener("click", () => {
    notificationPanel?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    const readIds = getReadNotificationIds();
    currentNotificationIds.forEach((id) => readIds.add(id));
    saveReadNotificationIds(readIds);
    updateNotificationCounter(0);
  });

  profileButton?.addEventListener("click", async () => {
    if (!auth.currentUser) return;

    if (window.confirm("Deseja sair do painel administrativo?")) {
      await signOut(auth);
    }
  });

  navigationLinks.forEach((link) => {
    link.addEventListener("click", () => {
      navigationLinks.forEach((item) => item.removeAttribute("aria-current"));
      link.setAttribute("aria-current", "page");
    });
  });

  const showLogin = (message = "") => {
    if (unsubscribeAppointments) {
      unsubscribeAppointments();
      unsubscribeAppointments = null;
    }

    if (unsubscribeHours) {
      unsubscribeHours();
      unsubscribeHours = null;
    }

    if (unsubscribeSettings) {
      unsubscribeSettings();
      unsubscribeSettings = null;
    }

    if (unsubscribeClients) {
      unsubscribeClients();
      unsubscribeClients = null;
    }

    if (unsubscribeServices) {
      unsubscribeServices();
      unsubscribeServices = null;
    }

    if (unsubscribeBarbers) {
      unsubscribeBarbers();
      unsubscribeBarbers = null;
    }

    appointmentsLoaded = false;
    registeredAppointments = [];
    hoursSettings = null;
    businessSettings = null;
    registeredClients = [];
    registeredServices = [];
    registeredBarbers = [];
    renderAppointmentClients();
    renderAppointmentServices();
    renderAppointmentBarbers();
    panel.hidden = true;
    loginScreen.hidden = false;
    loginMessage.textContent = message;
  };

  const startAppointmentsListener = () => {
    if (unsubscribeAppointments) unsubscribeAppointments();

    unsubscribeAppointments = onSnapshot(
      appointmentsCollection,
      { includeMetadataChanges: true },
      (snapshot) => {
        appointmentsLoaded = !snapshot.metadata.fromCache;
        registeredAppointments = snapshot.docs.map((appointmentDoc) => ({
          id: appointmentDoc.id,
          ...appointmentDoc.data(),
        }));
        getAppointments().forEach((row) => row.remove());

        snapshot.forEach((appointmentDoc) => {
          addAppointmentToTable({ ...appointmentDoc.data(), id: appointmentDoc.id });
        });

        renderNotifications(snapshot);
        updateTableView();
        renderAvailableAppointmentTimes();
        renderAppointmentManagement();
        renderReports();
      },
      (error) => {
        appointmentsLoaded = false;
        registeredAppointments = [];
        console.error("Erro ao carregar os agendamentos.", error);
        showLogin("Não foi possível acessar os agendamentos.");
      },
    );
  };

  const startHoursListener = () => {
    if (unsubscribeHours) unsubscribeHours();

    unsubscribeHours = onSnapshot(
      hoursDocument,
      (snapshot) => {
        hoursSettings = snapshot.exists() ? snapshot.data() : null;
        if (hoursModal && !hoursModal.hidden) renderHoursForm();
        renderAvailableAppointmentTimes();
      },
      (error) => {
        console.error("Erro ao carregar os horários.", error);
        hoursSettings = null;
      },
    );
  };

  const startSettingsListener = () => {
    if (unsubscribeSettings) unsubscribeSettings();

    unsubscribeSettings = onSnapshot(
      businessSettingsDocument,
      (snapshot) => {
        businessSettings = snapshot.exists() ? snapshot.data() : null;
        if (settingsModal && !settingsModal.hidden) renderSettingsForm();
        renderAvailableAppointmentTimes();
      },
      (error) => {
        console.error("Erro ao carregar as configurações.", error);
        businessSettings = null;
      },
    );
  };

  const startBarbersListener = () => {
    if (unsubscribeBarbers) unsubscribeBarbers();

    unsubscribeBarbers = onSnapshot(
      barbersCollection,
      (snapshot) => {
        registeredBarbers = snapshot.docs.map((barberDoc) => ({
          id: barberDoc.id,
          ...barberDoc.data(),
        }));
        renderAppointmentBarbers();
        renderBarberManagement();
      },
      (error) => {
        console.error("Erro ao carregar os barbeiros.", error);
        registeredBarbers = [];
        renderAppointmentBarbers();
        renderBarberManagement();
      },
    );
  };

  const startServicesListener = () => {
    if (unsubscribeServices) unsubscribeServices();

    unsubscribeServices = onSnapshot(
      servicesCollection,
      (snapshot) => {
        registeredServices = snapshot.docs.map((serviceDoc) => ({
          id: serviceDoc.id,
          ...serviceDoc.data(),
        }));
        renderAppointmentServices();
        renderServiceManagement();
        renderReports();
      },
      (error) => {
        console.error("Erro ao carregar os serviços.", error);
        registeredServices = [];
        renderAppointmentServices();
        renderServiceManagement();
      },
    );
  };

  const startClientsListener = () => {
    if (unsubscribeClients) unsubscribeClients();

    unsubscribeClients = onSnapshot(
      clientsCollection,
      (snapshot) => {
        registeredClients = snapshot.docs.map((clientDoc) => ({
          id: clientDoc.id,
          ...clientDoc.data(),
        }));
        renderAppointmentClients();
        renderClientManagement();
      },
      (error) => {
        console.error("Erro ao carregar os clientes.", error);
        registeredClients = [];
        renderAppointmentClients();
        renderClientManagement();
      },
    );
  };

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(loginForm);
    const submitButton = loginForm.querySelector('button[type="submit"]');

    loginMessage.textContent = "";
    submitButton.disabled = true;

    try {
      await signInWithEmailAndPassword(
        auth,
        formData.get("email").trim(),
        formData.get("senha"),
      );
    } catch (error) {
      console.error("Erro ao entrar no painel.", error);
      loginMessage.textContent = "E-mail ou senha inválidos.";
    } finally {
      submitButton.disabled = false;
    }
  });

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      showLogin();
      return;
    }

    try {
      const profile = await getDoc(doc(db, "usuarios", user.uid));
      const isAdmin = profile.exists() && profile.data().tipo === "admin";

      if (!isAdmin) {
        await signOut(auth);
        showLogin("Esta conta não tem permissão de administrador.");
        return;
      }

      loginScreen.hidden = true;
      panel.hidden = false;
      loginMessage.textContent = "";
      startAppointmentsListener();
      startHoursListener();
      startSettingsListener();
      startClientsListener();
      startServicesListener();
      startBarbersListener();
    } catch (error) {
      console.error("Erro ao validar o administrador.", error);
      await signOut(auth);
      showLogin("Não foi possível validar sua conta de administrador.");
    }
  });

  updateTableView();
});

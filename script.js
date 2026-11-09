import {
  auth,
  db,
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
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
  const appointmentBarberSelect = document.querySelector("#barbeiro-agendamento");
  const openBarberButton = document.querySelector("#abrir-barbeiro");
  const barberModal = document.querySelector("#modal-barbeiro");
  const closeBarberButton = document.querySelector("#fechar-barbeiro");
  const barberForm = document.querySelector("#form-barbeiro");
  const barberMessage = document.querySelector("#mensagem-barbeiro");
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
  let unsubscribeBarbers = null;
  let savingBarber = false;
  let registeredBarbers = [];
  let currentNotificationIds = [];
  const pendingStatusUpdates = new Set();
  const appointmentsCollection = collection(db, "agendamentos");
  const barbersCollection = collection(db, "barbeiros");
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
        : `${buttons.length} agendamento(s) nesta data`;

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

    const formDate = appointmentForm.querySelector('[name="data"]');
    formDate.value = todayInput.value;

    appointmentForm.querySelector('[name="cliente"]').focus();
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

  barberModal?.addEventListener("click", (event) => {
    if (event.target === barberModal) {
      closeBarberModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && appointmentModal && !appointmentModal.hidden) {
      closeAppointmentModal();
    }

    if (event.key === "Escape" && barberModal && !barberModal.hidden) {
      closeBarberModal();
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

    const timeAlreadyBooked = getAppointments().some((row) => {
      return (
        row.dataset.date === appointment.date &&
        row.dataset.time === appointment.time &&
        row.dataset.barber === appointment.barber
      );
    });

    if (timeAlreadyBooked) {
      alert("Este barbeiro já possui um agendamento neste horário.");
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

    if (unsubscribeBarbers) {
      unsubscribeBarbers();
      unsubscribeBarbers = null;
    }

    appointmentsLoaded = false;
    registeredBarbers = [];
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
        getAppointments().forEach((row) => row.remove());

        snapshot.forEach((appointmentDoc) => {
          addAppointmentToTable({ ...appointmentDoc.data(), id: appointmentDoc.id });
        });

        renderNotifications(snapshot);
        updateTableView();
      },
      (error) => {
        appointmentsLoaded = false;
        console.error("Erro ao carregar os agendamentos.", error);
        showLogin("Não foi possível acessar os agendamentos.");
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
      },
      (error) => {
        console.error("Erro ao carregar os barbeiros.", error);
        registeredBarbers = [];
        renderAppointmentBarbers();
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
      startBarbersListener();
    } catch (error) {
      console.error("Erro ao validar o administrador.", error);
      await signOut(auth);
      showLogin("Não foi possível validar sua conta de administrador.");
    }
  });

  updateTableView();
});

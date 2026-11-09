import { db, collection, addDoc, updateDoc, doc, onSnapshot, serverTimestamp } from "./firebase.js";

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

  const profileButton = document.querySelector(".seta");
  const navigationLinks = [...document.querySelectorAll(".nav-bar nav a")];

  const openAppointmentButton = document.querySelector("#abrir-agendamento");
  const appointmentModal = document.querySelector("#modal-agendamento");
  const closeAppointmentButton = document.querySelector("#fechar-agendamento");
  const appointmentForm = document.querySelector("#form-agendamento");

  let showingAllAppointments = false;
  let savingAppointment = false;
  let appointmentsLoaded = false;
  const pendingStatusUpdates = new Set();
  const appointmentsCollection = collection(db, "agendamentos");

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

  appointmentModal?.addEventListener("click", (event) => {
    if (event.target === appointmentModal) {
      closeAppointmentModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && appointmentModal && !appointmentModal.hidden) {
      closeAppointmentModal();
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

    if (notificationCounter) {
      notificationCounter.textContent = "0";
    }

    notificationButton.setAttribute(
      "aria-label",
      "Notificações: nenhuma nova",
    );
  });

  profileButton?.addEventListener("click", () => {
    const isOpen = profileButton.getAttribute("aria-expanded") === "true";
    profileButton.setAttribute("aria-expanded", String(!isOpen));
  });

  navigationLinks.forEach((link) => {
    link.addEventListener("click", () => {
      navigationLinks.forEach((item) => item.removeAttribute("aria-current"));
      link.setAttribute("aria-current", "page");
    });
  });

  updateTableView();

  onSnapshot(
    appointmentsCollection,
    { includeMetadataChanges: true },
    (snapshot) => {
      appointmentsLoaded = !snapshot.metadata.fromCache;
      getAppointments().forEach((row) => row.remove());

      snapshot.forEach((appointmentDoc) => {
        addAppointmentToTable({ ...appointmentDoc.data(), id: appointmentDoc.id });
      });

      updateTableView();
    },
    (error) => {
      appointmentsLoaded = false;
      console.error("Erro ao carregar os agendamentos.", error);
      alert("Não foi possível carregar os agendamentos. Verifique o acesso ao Firestore.");
    },
  );
});
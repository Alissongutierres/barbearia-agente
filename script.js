document.addEventListener("DOMContentLoaded", () => {
  const todayInput = document.querySelector("#data");
  const searchForm = document.querySelector(".pesquisa");
  const searchInput = searchForm?.querySelector('input[type="search"]');
  const appointmentRows = [
    ...document.querySelectorAll(".todos-agendamentos tbody tr"),
  ];

  const notificationButton = document.querySelector(".notificacao");
  const notificationCounter = notificationButton?.querySelector(".contador");
  const notificationPanel = document.querySelector(".notificacoes");
  const profileButton = document.querySelector(".seta");
  const navigationLinks = [...document.querySelectorAll(".nav-bar nav a")];

  if (todayInput && !todayInput.value) {
    const date = new Date();
    const offset = date.getTimezoneOffset() * 60000;
    todayInput.value = new Date(date - offset).toISOString().slice(0, 10);
  }

  const statusDefinitions = {
    scheduled: { label: "Agendado", color: "orange" },
    confirmed: { label: "Confirmado", color: "green" },
    "in-service": { label: "Em atendimento", color: "blue" },
    cancelled: { label: "Cancelado", color: "#EF4444" },
  };

  const statusOrder = [
    "scheduled",
    "confirmed",
    "in-service",
    "cancelled",
  ];

  const atualizarCards = () => {
    const botoes = document.querySelectorAll(
      ".todos-agendamentos tbody button",
    );

    let confirmados = 0;
    let emAtendimento = 0;
    let cancelados = 0;

    botoes.forEach((botao) => {
      if (botao.dataset.status === "confirmed") confirmados++;
      if (botao.dataset.status === "in-service") emAtendimento++;
      if (botao.dataset.status === "cancelled") cancelados++;
    });

    const cards = document.querySelectorAll(".status-painel .painel-item");

    if (cards.length < 4) return;

    cards[0].querySelector(".number").textContent = botoes.length;
    cards[1].querySelector(".number").textContent = confirmados;
    cards[2].querySelector(".number").textContent = emAtendimento;
    cards[3].querySelector(".number").textContent = cancelados;
  };

  document
    .querySelectorAll(".todos-agendamentos tbody button")
    .forEach((button) => {
      const text = button.textContent.trim().toLowerCase();

      button.dataset.status = text.includes("atendimento")
        ? "in-service"
        : text.includes("confirm")
          ? "confirmed"
          : "scheduled";

      button.type = "button";

      button.addEventListener("click", () => {
        const currentIndex = statusOrder.indexOf(button.dataset.status);
        const nextStatus =
          statusOrder[(currentIndex + 1) % statusOrder.length];

        const definition = statusDefinitions[nextStatus];

        button.dataset.status = nextStatus;
        button.style.backgroundColor = definition.color;
        button.querySelector(".boton-text").textContent = definition.label;

        atualizarCards();
      });
    });

  const filtrarAgendamentos = () => {
    const term = searchInput?.value.trim().toLowerCase() ?? "";

    appointmentRows.forEach((row) => {
      row.hidden = term !== "" && !row.textContent.toLowerCase().includes(term);
    });
  };

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    filtrarAgendamentos();
  });

  searchInput?.addEventListener("input", filtrarAgendamentos);

  notificationButton?.addEventListener("click", () => {
    notificationPanel?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    if (notificationCounter) {
      notificationCounter.textContent = "0";
    }
  });

  profileButton?.addEventListener("click", () => {
    const aberto = profileButton.getAttribute("aria-expanded") === "true";
    profileButton.setAttribute("aria-expanded", String(!aberto));
  });

  navigationLinks.forEach((link) => {
    link.addEventListener("click", () => {
      navigationLinks.forEach((item) => item.removeAttribute("aria-current"));
      link.setAttribute("aria-current", "page");
    });
  });

  atualizarCards();
});
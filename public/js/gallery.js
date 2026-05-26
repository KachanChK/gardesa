"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/client/gallery.ts
  var require_gallery = __commonJS({
    "src/client/gallery.ts"() {
      document.addEventListener("DOMContentLoaded", () => {
        const grid = document.querySelector("[data-gallery-grid]");
        const loader = document.querySelector("[data-gallery-loader]");
        const sentinel = document.querySelector("[data-gallery-sentinel]");
        const title = document.querySelector("[data-gallery-title]");
        if (!grid || !loader || !sentinel || !title) {
          return;
        }
        const elements = {
          afterLabel: document.querySelector("[data-gallery-after-label]"),
          beforeLabel: document.querySelector("[data-gallery-before-label]"),
          compareHandle: document.querySelector("[data-gallery-compare-handle]"),
          compareIcon: document.querySelector("[data-gallery-compare-icon]"),
          compareRange: document.querySelector("[data-gallery-compare-range]"),
          compareToggle: document.querySelector("[data-gallery-compare-toggle]"),
          confirm: document.querySelector("[data-gallery-confirm]"),
          confirmError: document.querySelector("[data-gallery-confirm-error]"),
          deleteCancel: document.querySelector("[data-gallery-delete-cancel]"),
          deleteConfirm: document.querySelector("[data-gallery-delete-confirm]"),
          deleteOpen: document.querySelector("[data-gallery-delete-open]"),
          download: document.querySelector("[data-gallery-download]"),
          empty: document.querySelector("[data-gallery-empty]"),
          emptyCopy: document.querySelector("[data-gallery-empty-copy]"),
          error: document.querySelector("[data-gallery-error]"),
          fullscreen: document.querySelector("[data-gallery-fullscreen]"),
          fullscreenClose: document.querySelector("[data-gallery-fullscreen-close]"),
          fullscreenImage: document.querySelector("[data-gallery-fullscreen-image]"),
          fullscreenOpen: document.querySelector("[data-gallery-fullscreen-open]"),
          grid,
          loader,
          modal: document.querySelector("[data-gallery-modal]"),
          modalBase: document.querySelector("[data-gallery-modal-base]"),
          modalClose: document.querySelector("[data-gallery-modal-close]"),
          modalDate: document.querySelector("[data-gallery-modal-date]"),
          modalError: document.querySelector("[data-gallery-modal-error]"),
          modalFavorite: document.querySelector("[data-gallery-modal-favorite]"),
          modalFavoriteIcon: document.querySelector("[data-gallery-modal-favorite-icon]"),
          modalPanel: document.querySelector("[data-gallery-modal-panel]"),
          modalQuality: document.querySelector("[data-gallery-modal-quality]"),
          modalRendered: document.querySelector("[data-gallery-modal-rendered]"),
          modalTitle: document.querySelector("[data-gallery-modal-title]"),
          modalType: document.querySelector("[data-gallery-modal-type]"),
          modalWeather: document.querySelector("[data-gallery-modal-weather]"),
          renderedLayer: document.querySelector("[data-gallery-rendered-layer]"),
          sentinel,
          tabs: Array.from(document.querySelectorAll("[data-gallery-tab]")),
          title
        };
        const state = {
          compareActive: false,
          comparePosition: 50,
          confirmId: null,
          fullscreenOpen: false,
          initialized: false,
          items: /* @__PURE__ */ new Map(),
          loading: false,
          nextCursor: null,
          order: [],
          selectedId: null,
          tab: "all"
        };
        bindEvents();
        observeInfiniteScroll();
        renderTabs();
        void loadItems(true);
        function bindEvents() {
          elements.tabs.forEach((button) => {
            button.addEventListener("click", () => {
              const nextTab = button.dataset.galleryTab === "favorites" ? "favorites" : "all";
              if (nextTab === state.tab) {
                return;
              }
              state.tab = nextTab;
              renderTabs();
              void loadItems(true);
            });
          });
          elements.compareToggle?.addEventListener("click", () => {
            const item = getSelectedItem();
            if (!item) {
              return;
            }
            state.compareActive = !state.compareActive;
            state.comparePosition = 50;
            renderModal();
          });
          elements.compareRange?.addEventListener("input", () => {
            state.comparePosition = Number(elements.compareRange?.value ?? 50);
            renderComparison();
          });
          elements.fullscreenOpen?.addEventListener("click", () => {
            if (!getSelectedItem()) {
              return;
            }
            state.fullscreenOpen = true;
            renderFullscreen();
          });
          elements.fullscreenClose?.addEventListener("click", () => {
            state.fullscreenOpen = false;
            renderFullscreen();
          });
          elements.fullscreen?.addEventListener("click", (event) => {
            if (event.target === elements.fullscreen) {
              state.fullscreenOpen = false;
              renderFullscreen();
            }
          });
          elements.modalClose?.addEventListener("click", closeModal);
          elements.modal?.addEventListener("click", (event) => {
            if (event.target === elements.modal) {
              closeModal();
            }
          });
          elements.modalFavorite?.addEventListener("click", () => {
            const item = getSelectedItem();
            if (item) {
              void setFavorite(item.id, !item.isFavorite);
            }
          });
          elements.download?.addEventListener("click", () => {
            const item = getSelectedItem();
            if (!item) {
              return;
            }
            const link = document.createElement("a");
            link.href = `/member/gallery/${item.id}/download`;
            link.download = `gardesa-render-${item.id}.jpg`;
            document.body.appendChild(link);
            link.click();
            link.remove();
          });
          elements.deleteOpen?.addEventListener("click", () => {
            const item = getSelectedItem();
            if (!item) {
              return;
            }
            state.confirmId = item.id;
            renderConfirm();
          });
          elements.deleteCancel?.addEventListener("click", closeConfirm);
          elements.confirm?.addEventListener("click", (event) => {
            if (event.target === elements.confirm) {
              closeConfirm();
            }
          });
          elements.deleteConfirm?.addEventListener("click", () => {
            void deleteSelectedRender();
          });
          document.addEventListener("keydown", (event) => {
            if (event.key !== "Escape") {
              return;
            }
            if (state.fullscreenOpen) {
              state.fullscreenOpen = false;
              renderFullscreen();
              return;
            }
            if (state.confirmId) {
              closeConfirm();
              return;
            }
            if (state.selectedId) {
              closeModal();
            }
          });
        }
        function observeInfiniteScroll() {
          const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
              void loadItems(false);
            }
          }, {
            rootMargin: "360px 0px"
          });
          observer.observe(elements.sentinel);
        }
        async function loadItems(reset) {
          if (state.loading || !reset && !state.nextCursor) {
            return;
          }
          state.loading = true;
          clearError();
          if (reset) {
            state.items.clear();
            state.order = [];
            state.nextCursor = null;
            state.initialized = false;
            renderGrid();
          }
          renderLoading();
          try {
            const params = new URLSearchParams({
              limit: "15",
              tab: state.tab
            });
            if (!reset && state.nextCursor) {
              params.set("cursor", state.nextCursor);
            }
            const response = await fetch(`/member/gallery/items?${params.toString()}`);
            const payload = await parseJsonResponse(response);
            payload.items.forEach((item) => {
              state.items.set(item.id, item);
              if (!state.order.includes(item.id)) {
                state.order.push(item.id);
              }
            });
            state.nextCursor = payload.nextCursor;
            state.initialized = true;
            renderGrid();
          } catch (error) {
            showError(getErrorMessage(error));
          } finally {
            state.loading = false;
            renderLoading();
          }
        }
        async function setFavorite(id, isFavorite) {
          const item = state.items.get(id);
          if (!item) {
            return;
          }
          const previousFavorite = item.isFavorite;
          const previousOrder = [...state.order];
          applyFavoriteState(id, isFavorite);
          try {
            const response = await fetch(`/member/gallery/${id}/favorite`, {
              body: JSON.stringify({ isFavorite }),
              headers: {
                "Content-Type": "application/json"
              },
              method: "PATCH"
            });
            const payload = await parseJsonResponse(response);
            applyFavoriteState(payload.id, payload.isFavorite);
          } catch (error) {
            item.isFavorite = previousFavorite;
            state.order = previousOrder;
            renderGrid();
            renderModal();
            showContextError(getErrorMessage(error));
          }
        }
        async function deleteSelectedRender() {
          const id = state.confirmId;
          if (!id || !elements.deleteConfirm) {
            return;
          }
          setDeleteLoading(true);
          clearConfirmError();
          try {
            const response = await fetch(`/member/gallery/${id}`, {
              method: "DELETE"
            });
            await parseJsonResponse(response);
            state.items.delete(id);
            state.order = state.order.filter((itemId) => itemId !== id);
            closeConfirm();
            if (state.selectedId === id) {
              closeModal();
            }
            renderGrid();
            if (state.nextCursor && state.order.length < 15) {
              void loadItems(false);
            }
          } catch (error) {
            showConfirmError(getErrorMessage(error));
          } finally {
            setDeleteLoading(false);
          }
        }
        async function parseJsonResponse(response) {
          const payload = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(payload?.message ?? "Nao foi possivel concluir a acao.");
          }
          return payload;
        }
        function renderTabs() {
          elements.title.textContent = state.tab === "favorites" ? "Galeria - Favoritos" : "Galeria - Todos";
          elements.tabs.forEach((button) => {
            const selected = button.dataset.galleryTab === state.tab;
            button.classList.toggle("border-preto", selected);
            button.classList.toggle("bg-preto", selected);
            button.classList.toggle("text-white", selected);
            button.classList.toggle("border-[#d9d9d9]", !selected);
            button.classList.toggle("bg-white", !selected);
            button.classList.toggle("text-preto", !selected);
            button.setAttribute("aria-pressed", String(selected));
          });
        }
        function renderGrid() {
          const cards = state.order.map((id) => state.items.get(id)).filter((item) => Boolean(item)).map(createCard);
          elements.grid.replaceChildren(...cards);
          const isEmpty = state.initialized && !state.loading && state.order.length === 0;
          elements.empty?.classList.toggle("hidden", !isEmpty);
          elements.empty?.classList.toggle("flex", isEmpty);
          if (elements.emptyCopy) {
            elements.emptyCopy.textContent = state.tab === "favorites" ? "Os renders favoritados aparecem aqui." : "Quando voce gerar renders, eles aparecerao aqui.";
          }
        }
        function createCard(item) {
          const card = document.createElement("article");
          card.className = "group relative h-[214px] w-full overflow-hidden rounded-[8px] border border-[#e2e2e2] bg-white transition-colors hover:border-verde focus-within:border-verde";
          card.tabIndex = 0;
          card.setAttribute("role", "button");
          card.setAttribute("aria-label", `Abrir ${getRenderTitle(item)}`);
          const image = document.createElement("img");
          image.src = item.renderedImageUrl;
          image.alt = getRenderTitle(item);
          image.className = "absolute left-2.5 top-2.5 h-[142px] w-[calc(100%-20px)] rounded-[6px] object-cover";
          card.appendChild(image);
          const favoriteButton = document.createElement("button");
          favoriteButton.type = "button";
          favoriteButton.className = [
            "absolute right-[17px] top-[17px] flex size-[22px] items-center justify-center transition-opacity",
            item.isFavorite ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
          ].join(" ");
          favoriteButton.setAttribute("aria-label", item.isFavorite ? "Remover dos favoritos" : "Favoritar render");
          favoriteButton.addEventListener("click", (event) => {
            event.stopPropagation();
            void setFavorite(item.id, !item.isFavorite);
          });
          const favoriteIcon = document.createElement("img");
          favoriteIcon.src = item.isFavorite ? "/img/icons/star_yellow.svg" : "/img/icons/star.svg";
          favoriteIcon.alt = "";
          favoriteIcon.className = "size-[22px]";
          favoriteButton.appendChild(favoriteIcon);
          card.appendChild(favoriteButton);
          const titleElement = document.createElement("h3");
          titleElement.className = "absolute left-3 top-[166px] w-[158px] truncate text-sm font-semibold leading-5 text-preto";
          titleElement.textContent = getRenderTitle(item);
          card.appendChild(titleElement);
          const dateElement = document.createElement("p");
          dateElement.className = "absolute left-3 top-[188px] text-xs font-normal leading-4 text-preto/50";
          dateElement.textContent = formatRelativeDate(item.generatedAt);
          card.appendChild(dateElement);
          card.addEventListener("click", () => openModal(item.id));
          card.addEventListener("keydown", (event) => {
            if (event.key !== "Enter" && event.key !== " ") {
              return;
            }
            event.preventDefault();
            openModal(item.id);
          });
          return card;
        }
        function renderLoading() {
          elements.loader.classList.toggle("hidden", !state.loading);
          elements.loader.classList.toggle("flex", state.loading);
        }
        function openModal(id) {
          state.selectedId = id;
          state.compareActive = false;
          state.comparePosition = 50;
          clearModalError();
          renderModal();
        }
        function closeModal() {
          state.selectedId = null;
          state.compareActive = false;
          state.comparePosition = 50;
          closeConfirm();
          elements.modal?.classList.add("hidden");
          elements.modal?.classList.remove("flex");
          elements.modal?.setAttribute("aria-hidden", "true");
          syncBodyOverflow();
        }
        function renderModal() {
          const item = getSelectedItem();
          const showModal = Boolean(item);
          elements.modal?.classList.toggle("hidden", !showModal);
          elements.modal?.classList.toggle("flex", showModal);
          elements.modal?.setAttribute("aria-hidden", String(!showModal));
          if (!item) {
            syncBodyOverflow();
            return;
          }
          const title2 = getRenderTitle(item);
          elements.modalTitle.textContent = title2;
          elements.modalType.textContent = title2;
          elements.modalDate.textContent = formatDateTime(item.generatedAt);
          elements.modalWeather.textContent = getWeatherLabel(item.selectedWeather);
          elements.modalQuality.textContent = getQualityLabel(item.selectedQuality);
          elements.modalFavoriteIcon.src = item.isFavorite ? "/img/icons/star_yellow.svg" : "/img/icons/star.svg";
          elements.modalFavorite?.setAttribute("aria-label", item.isFavorite ? "Remover dos favoritos" : "Favoritar render");
          if (elements.modalBase) {
            elements.modalBase.src = state.compareActive ? item.originalImageUrl : item.renderedImageUrl;
            elements.modalBase.alt = state.compareActive ? "Imagem original" : title2;
          }
          if (elements.modalRendered) {
            elements.modalRendered.src = item.renderedImageUrl;
          }
          if (elements.compareIcon) {
            elements.compareIcon.src = state.compareActive ? "/img/icons/image.svg" : "/img/icons/move-horizontal.svg";
          }
          elements.renderedLayer?.classList.toggle("hidden", !state.compareActive);
          elements.compareHandle?.classList.toggle("hidden", !state.compareActive);
          elements.compareRange?.classList.toggle("hidden", !state.compareActive);
          elements.beforeLabel?.classList.toggle("hidden", !state.compareActive);
          elements.afterLabel?.classList.toggle("hidden", !state.compareActive);
          elements.compareToggle?.setAttribute("aria-pressed", String(state.compareActive));
          renderComparison();
          syncBodyOverflow();
        }
        function renderComparison() {
          const position = Math.max(0, Math.min(100, state.comparePosition));
          elements.renderedLayer?.style.setProperty("clip-path", `inset(0 0 0 ${position}%)`);
          elements.compareHandle?.style.setProperty("left", `${position}%`);
          if (elements.compareRange) {
            elements.compareRange.value = String(position);
          }
        }
        function renderFullscreen() {
          const item = getSelectedItem();
          const showFullscreen = Boolean(state.fullscreenOpen && item);
          elements.fullscreen?.classList.toggle("hidden", !showFullscreen);
          elements.fullscreen?.classList.toggle("flex", showFullscreen);
          elements.fullscreen?.setAttribute("aria-hidden", String(!showFullscreen));
          if (showFullscreen && item && elements.fullscreenImage) {
            elements.fullscreenImage.src = item.renderedImageUrl;
          }
          syncBodyOverflow();
        }
        function renderConfirm() {
          const showConfirm = Boolean(state.confirmId);
          elements.confirm?.classList.toggle("hidden", !showConfirm);
          elements.confirm?.classList.toggle("flex", showConfirm);
          elements.confirm?.setAttribute("aria-hidden", String(!showConfirm));
          clearConfirmError();
          syncBodyOverflow();
        }
        function closeConfirm() {
          state.confirmId = null;
          elements.confirm?.classList.add("hidden");
          elements.confirm?.classList.remove("flex");
          elements.confirm?.setAttribute("aria-hidden", "true");
          clearConfirmError();
          syncBodyOverflow();
        }
        function applyFavoriteState(id, isFavorite) {
          const item = state.items.get(id);
          if (!item) {
            return;
          }
          item.isFavorite = isFavorite;
          if (state.tab === "favorites" && !isFavorite) {
            state.order = state.order.filter((itemId) => itemId !== id);
          }
          renderGrid();
          renderModal();
        }
        function getSelectedItem() {
          if (!state.selectedId) {
            return null;
          }
          return state.items.get(state.selectedId) ?? null;
        }
        function getRenderTitle(item) {
          return item.selectedEnvironment === "interior" ? "Render interno" : "Render externo";
        }
        function getWeatherLabel(value) {
          const labels = /* @__PURE__ */ new Map([
            ["dia", "Dia"],
            ["noite", "Noite"],
            ["chuvoso", "Chuvoso"],
            ["por-do-sol", "Por do sol"]
          ]);
          return labels.get(value ?? "") ?? "--";
        }
        function getQualityLabel(value) {
          if (value === "1K") {
            return "HD \xB7 1K";
          }
          if (value === "2K") {
            return "Full HD \xB7 2K";
          }
          if (value === "4K") {
            return "4K";
          }
          return "--";
        }
        function formatRelativeDate(value) {
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) {
            return "";
          }
          const now = /* @__PURE__ */ new Date();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
          const days = Math.max(0, Math.floor((today - target) / 864e5));
          if (days === 0) {
            return "Hoje";
          }
          if (days === 1) {
            return "Ontem";
          }
          if (days < 7) {
            return `${days}d atr\xE1s`;
          }
          if (days < 30) {
            const weeks = Math.max(1, Math.floor(days / 7));
            return weeks === 1 ? "1 sem atr\xE1s" : `${weeks} sem atr\xE1s`;
          }
          if (days < 365) {
            const months = Math.max(1, Math.floor(days / 30));
            return months === 1 ? "1 m\xEAs atr\xE1s" : `${months} meses atr\xE1s`;
          }
          const years = Math.max(1, Math.floor(days / 365));
          return years === 1 ? "1 ano atr\xE1s" : `${years} anos atr\xE1s`;
        }
        function formatDateTime(value) {
          const date = new Date(value);
          if (Number.isNaN(date.getTime())) {
            return "--";
          }
          return `${date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
          })} - ${date.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
          })}`;
        }
        function showError(message) {
          if (!elements.error) {
            return;
          }
          elements.error.textContent = message;
          elements.error.classList.remove("hidden");
        }
        function clearError() {
          if (!elements.error) {
            return;
          }
          elements.error.textContent = "";
          elements.error.classList.add("hidden");
        }
        function showModalError(message) {
          if (!elements.modalError) {
            return;
          }
          elements.modalError.textContent = message;
          elements.modalError.classList.remove("hidden");
        }
        function clearModalError() {
          if (!elements.modalError) {
            return;
          }
          elements.modalError.textContent = "";
          elements.modalError.classList.add("hidden");
        }
        function showConfirmError(message) {
          if (!elements.confirmError) {
            return;
          }
          elements.confirmError.textContent = message;
          elements.confirmError.classList.remove("hidden");
        }
        function clearConfirmError() {
          if (!elements.confirmError) {
            return;
          }
          elements.confirmError.textContent = "";
          elements.confirmError.classList.add("hidden");
        }
        function showContextError(message) {
          if (state.selectedId) {
            showModalError(message);
            return;
          }
          showError(message);
        }
        function setDeleteLoading(value) {
          if (!elements.deleteConfirm) {
            return;
          }
          elements.deleteConfirm.disabled = value;
          elements.deleteConfirm.classList.toggle("opacity-70", value);
          elements.deleteConfirm.classList.toggle("cursor-not-allowed", value);
          elements.deleteConfirm.textContent = value ? "Excluindo..." : "Confirmar";
        }
        function getErrorMessage(error) {
          if (error instanceof Error && error.message) {
            return error.message;
          }
          return "Nao foi possivel concluir a acao.";
        }
        function syncBodyOverflow() {
          document.body.classList.toggle("overflow-hidden", Boolean(state.selectedId || state.confirmId || state.fullscreenOpen));
        }
      });
    }
  });
  require_gallery();
})();

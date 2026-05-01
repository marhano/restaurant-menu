/**
 * RestaurantMenu.js
 * ─────────────────────────────────────────────────────────────────
 * Public API — the only object the user ever touches.
 *
 *   var menu = RestaurantMenu.create({
 *       containerId: 'menuRoot',
 *       table: { id: 'T1', name: 'Table 1', seats: 4, guests: 2, server: 'Alex' },
 *       categories: [...],
 *       items: [...],
 *       basketSections: [
 *         { id: 'kitchen', label: 'Kitchen', icon: 'fa-solid fa-utensils' },
 *         { id: 'bar',     label: 'Bar',     icon: 'fa-solid fa-martini-glass' }
 *       ],
 *       onSendOrder: function (order, done) { ...; done(); }
 *   });
 */
var RestaurantMenu = (function () {

  function create(userConfig) {
    if (typeof jQuery === "undefined") {
      throw new Error("[RestaurantMenu] jQuery is required but not loaded.");
    }

    var cfg = MenuConfig.merge(userConfig);
    var $container = jQuery("#" + cfg.containerId);
    if (!$container.length) {
      throw new Error("[RestaurantMenu] Container #" + cfg.containerId + " not found in DOM.");
    }

    // Boot
    MenuEvents.reset();
    MenuCore.init(cfg);

    var camelToKebab = function (s) {
      return s.replace(/([A-Z])/g, function (m) { return "-" + m.toLowerCase(); });
    };

    // ── Root element: either the container (default) or a modal box ───────
    var $root;
    var $contentRoot;        // where $shell attaches — inner scroll wrapper in modal mode
    var $modalTopbar = null; // non-scrolling topbar row (modal only)
    var $menuOverlay = null;
    var _menuModalOpen = false;

    if (cfg.modal) {
      $menuOverlay = jQuery("<div>").addClass("rm-menu-overlay");
      $root = jQuery("<div>").addClass("rm-root rm-root--modal");
      $modalTopbar = jQuery("<div>").addClass("rm-modal-topbar");
      $modalTopbar.append(
        jQuery("<button type='button'>").addClass("rm-menu-modal-close")
          .attr("aria-label", "Close")
          .append(jQuery("<i>").addClass("fa-solid fa-xmark"))
          .on("click", function () { closeMenuModal(); })
      );
      $root.append($modalTopbar);
      var $modalContent = jQuery("<div>").addClass("rm-modal-content");
      $root.append($modalContent);
      $contentRoot = $modalContent;
      $menuOverlay.append($root);
      jQuery("body").append($menuOverlay);
      $container.empty();
    } else {
      $container.empty().addClass("rm-root");
      $root = $container;
      $contentRoot = $root;
    }

    $root.toggleClass("rm-root--fancy", !!cfg.complexAnimations);
    jQuery.each(cfg.theme, function (key, val) {
      var prop = "--rm-" + camelToKebab(key);
      $root[0].style.setProperty(prop, val);
      document.documentElement.style.setProperty(prop, val);
    });

    // Build DOM
    var $shell = MenuRender.buildShell();
    $contentRoot.append($shell);
    MenuBrowse.build($shell);
    MenuBasket.build($shell);

    // In modal mode, lift the table slot out of the scroll container into the
    // non-scrolling topbar so it's always visible regardless of scroll position.
    var $slot = $shell.find("." + MenuRender.ns("table-slot"));
    if (cfg.modal && $modalTopbar) {
      $modalTopbar.prepend($slot);
      // MenuBrowse._renderTableInfo searches inside $shell and won't find the moved
      // slot, so we wire up the update here.
      MenuEvents.on("table:changed", function () {
        $slot.empty().append(MenuRender.buildTableInfo(MenuCore.getTable(), cfg.labels));
      });
    }

    // Floating basket toggle (tablet / small screens only — CSS-hidden on desktop)
    var $fab = MenuRender.buildBasketFab(cfg.labels);
    $shell.append($fab);

    // ── Drawer toggle ─────────────────────────────────────────────────────
    var _escHandler = null;
    function openBasket() {
      if ($shell.hasClass("rm-wrapper--basket-open")) return;
      $shell.addClass("rm-wrapper--basket-open");
      if (!_menuModalOpen) jQuery("body").css("overflow", "hidden");
      _escHandler = function (e) { if (e.key === "Escape") closeBasket(); };
      jQuery(document).on("keydown.rmdrawer", _escHandler);
    }
    function closeBasket() {
      if (!$shell.hasClass("rm-wrapper--basket-open")) return;
      $shell.removeClass("rm-wrapper--basket-open");
      if (!_menuModalOpen) jQuery("body").css("overflow", "");
      jQuery(document).off("keydown.rmdrawer");
      _escHandler = null;
    }
    function toggleBasket() {
      if ($shell.hasClass("rm-wrapper--basket-open")) closeBasket(); else openBasket();
    }

    $fab.on("click", openBasket);
    $shell.on("click", "." + MenuRender.ns("backdrop"), closeBasket);
    $shell.on("click", "." + MenuRender.ns("basket-close"), closeBasket);

    // Keep FAB count badge in sync with basket
    function _syncFab() {
      var count = MenuCore.getBasket().reduce(function (s, l) { return s + l.qty; }, 0);
      var $badge = $fab.find("." + MenuRender.ns("basket-fab-count"));
      var prev = parseInt($badge.text(), 10) || 0;
      $badge.text(count);
      $fab.toggleClass(MenuRender.ns("basket-fab--has-count"), count > 0);
      if (count > prev) {
        var popCls = MenuRender.ns("basket-fab--pop");
        $fab.removeClass(popCls);
        void $fab[0].offsetWidth;
        $fab.addClass(popCls);
        setTimeout(function () { $fab.removeClass(popCls); }, 420);
      }
    }
    _syncFab();
    MenuEvents.on("basket:changed", _syncFab);

    // ── Modal open / close ────────────────────────────────────────────────
    function openMenuModal() {
      if (!cfg.modal || _menuModalOpen) return;
      MenuCore.clearBasket();
      MenuCore.clearExistingOrder();
      _menuModalOpen = true;
      $menuOverlay.addClass("rm-menu-overlay--open");
      jQuery("html").addClass("modal-shown");
      jQuery("body").css("overflow", "hidden");
      jQuery(document).on("keydown.rmmenumodal", function (e) {
        if (e.key === "Escape") closeMenuModal();
      });
    }
    function closeMenuModal() {
      if (!cfg.modal || !_menuModalOpen) return;
      _menuModalOpen = false;
      $menuOverlay.removeClass("rm-menu-overlay--open");
      jQuery("html").removeClass("modal-shown");
      jQuery("body").css("overflow", "");
      jQuery(document).off("keydown.rmmenumodal");
    }
    if (cfg.modal) {
      $menuOverlay.on("click", function (e) {
        if (e.target === $menuOverlay[0]) closeMenuModal();
      });
    }

    // ── Keep layout CSS vars in sync ─────────────────────────────────────────
    function _syncSlotHeight() {
      var h = $slot.outerHeight() || 0;
      $root[0].style.setProperty("--rm-table-slot-h", (h + 16) + "px");
      if (cfg.modal && $modalTopbar) {
        $root[0].style.setProperty("--rm-modal-topbar-h", ($modalTopbar.outerHeight() || 0) + "px");
      }
    }
    _syncSlotHeight();
    var _slotRO = null;
    if (typeof ResizeObserver !== "undefined" && $slot[0]) {
      _slotRO = new ResizeObserver(_syncSlotHeight);
      _slotRO.observe($slot[0]);
    }
    jQuery(window).on("resize.rmslot", _syncSlotHeight);
    MenuEvents.on("table:changed", function () { setTimeout(_syncSlotHeight, 0); });

    // Wire internal → user callbacks
    MenuEvents.on("basket:changed", function (evt) {
      var basket = MenuCore.getBasket();
      if (evt) {
        if (evt.reason === "add"    && typeof cfg.onItemAdd    === "function") cfg.onItemAdd(evt.line, evt.line && evt.line.sectionId, basket);
        if (evt.reason === "remove" && typeof cfg.onItemRemove === "function") cfg.onItemRemove(evt.line, basket);
        if (evt.reason === "qty"    && typeof cfg.onQtyChange  === "function") cfg.onQtyChange(evt.line, basket);
        if (evt.reason === "note"   && typeof cfg.onNoteChange === "function") cfg.onNoteChange(evt.line, basket);
      }
      if (typeof cfg.onBasketChange === "function") cfg.onBasketChange(basket);
    });

    MenuEvents.on("section:changed", function (id) {
      if (typeof cfg.onSectionChange === "function") cfg.onSectionChange(id);
    });

    MenuEvents.on("table:changed", function (t) {
      if (typeof cfg.onTableChange === "function") cfg.onTableChange(t);
    });

    // Public instance API
    return {
      // Data
      getConfig:        function () { return MenuCore.getConfig(); },
      getBasket:        function () { return MenuCore.getBasket(); },
      getBasketBySection: function (id) { return MenuCore.getBasketBySection(id); },
      getBasketTotal:   function () { return MenuCore.getBasketTotal(); },
      getSectionTotal:  function (id) { return MenuCore.getSectionTotal(id); },

      // Menu / filters
      getCategories:    function () { return MenuCore.getCategories(); },
      setCategory:      function (id) { MenuCore.setCategory(id); },
      setSubcategory:   function (id) { MenuCore.setSubcategory(id); },
      setSearch:        function (q) { MenuCore.setSearch(q); },
      getFilters:       function () { return MenuCore.getFilters(); },
      setFilters:       function (f) { MenuCore.setFilters(f); },
      clearFilters:     function () { MenuCore.clearFilters(); },

      // Animation toggle at runtime
      setComplexAnimations: function (on) {
        cfg.complexAnimations = !!on;
        $root.toggleClass("rm-root--fancy", !!on);
      },

      // Menu modal (only when modal: true)
      openModal:    openMenuModal,
      closeModal:   closeMenuModal,
      toggleModal:  function () { if (_menuModalOpen) closeMenuModal(); else openMenuModal(); },
      isModalOpen:  function () { return _menuModalOpen; },

      // Basket drawer (tablet / mobile)
      openBasket:   openBasket,
      closeBasket:  closeBasket,
      toggleBasket: toggleBasket,
      isBasketOpen: function () { return $shell.hasClass("rm-wrapper--basket-open"); },

      // Live data updates (no re-create)
      updateItems:           function (items)    { MenuCore.setItems(items); },
      updateCategories:      function (cats)     { MenuCore.setCategories(cats); },
      updateBasketSections:  function (sections) { MenuCore.setBasketSections(sections); },

      /**
       * Swap table, clear basket and reset serving — suitable for starting a
       * fresh order after the server confirms newOrder(table).
       */
      startNewOrder:    function (table) { MenuCore.startNewOrder(table); },

      // Basket ops
      loadBasket:       function (lines) { MenuCore.setBasket(lines); },
      getExistingOrder: function () { return MenuCore.getExistingOrder(); },
      addItem:          function (itemId, sectionId) { return MenuCore.addItem(itemId, sectionId); },
      incQty:           function (lineId) { MenuCore.incQty(lineId); },
      decQty:           function (lineId) { MenuCore.decQty(lineId); },
      removeLine:       function (lineId) { MenuCore.removeLine(lineId); },
      setLineNote:      function (lineId, note) { MenuCore.setLineNote(lineId, note); },
      moveLineToSection:function (lineId, sectionId) { MenuCore.moveLineToSection(lineId, sectionId); },
      clearBasket:      function () { MenuCore.clearBasket(); },

      // Sections
      getSections:      function () { return MenuCore.getBasketSections(); },
      setActiveSection: function (id) { MenuCore.setActiveSection(id); },
      getActiveSection: function () { return MenuCore.getActiveSectionId(); },

      // Table & serving
      getTable:         function () { return MenuCore.getTable(); },
      setTable:         function (t) { MenuCore.setTable(t); },
      getServing:       function () { return MenuCore.getServing(); },
      setServing:       function (n) { MenuCore.setServing(n); },
      nextServing:      function () { return MenuCore.nextServing(); },

      // Lifecycle
      destroy: function () {
        MenuBrowse.unbind();
        MenuBasket.unbind();
        if (_slotRO) { try { _slotRO.disconnect(); } catch (e) {} }
        jQuery(window).off("resize.rmslot");
        jQuery(document).off("keydown.rmdrawer");
        jQuery(document).off("keydown.rmmenumodal");
        jQuery("body").css("overflow", "");
        jQuery("html").removeClass("modal-shown");
        jQuery.each(cfg.theme, function (key) {
          document.documentElement.style.removeProperty("--rm-" + camelToKebab(key));
        });
        if ($menuOverlay) {
          $menuOverlay.remove();
          $menuOverlay = null;
        }
        jQuery("#" + cfg.containerId).empty().removeClass("rm-root");
        MenuEvents.reset();
        MenuCore.reset();
      }
    };
  }

  return { create: create };
})();

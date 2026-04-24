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

    // Apply theme CSS variables
    $container.empty().addClass("rm-root");
    $container.toggleClass("rm-root--fancy", !!cfg.complexAnimations);
    var camelToKebab = function (s) {
      return s.replace(/([A-Z])/g, function (m) { return "-" + m.toLowerCase(); });
    };
    jQuery.each(cfg.theme, function (key, val) {
      $container[0].style.setProperty("--rm-" + camelToKebab(key), val);
    });

    // Build DOM
    var $shell = MenuRender.buildShell();
    $container.append($shell);
    MenuBrowse.build($shell);
    MenuBasket.build($shell);

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
        jQuery("#" + cfg.containerId).toggleClass("rm-root--fancy", !!on);
      },

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
        jQuery("#" + cfg.containerId).empty().removeClass("rm-root");
        MenuEvents.reset();
        MenuCore.reset();
      }
    };
  }

  return { create: create };
})();

/*!
 * restaurant-menu.js v0.0.1
 * Restaurant Menu & Basket Library
 * Built: 2026-04-28T02:47:24.517Z
 * Requires: jQuery 3+
 * License: MIT
 */

/* src/core/MenuConfig.js */
/**
 * MenuConfig.js
 * Default configuration — deep-merged with user config at create() time.
 */
var MenuConfig = (function () {
  var _defaults = {
    containerId: "restaurantMenu",

    // Table info shown in header
    table: null, // { id, name, seats, guests, server }

    // Menu data
    // categories: [{ id, label, icon, subcategories: [{ id, label, basketSection? }], basketSection? }]
    categories: [],
    // items: [{ id, name, description, price, image, categoryId, subcategoryId, basketSection? }]
    items: [],

    // Basket sections — ordered tabs displayed in the basket panel
    // [{ id, label, icon }]
    basketSections: [
      { id: "kitchen", label: "Kitchen", icon: "fa-solid fa-utensils" },
      { id: "bar", label: "Bar", icon: "fa-solid fa-martini-glass" },
    ],
    defaultBasketSection: "kitchen",

    // Currency formatter
    currency: {
      symbol: "$",
      position: "prefix", // prefix | suffix
      decimals: 2,
    },

    // When true the menu renders inside a fullscreen modal overlay that starts
    // hidden. Call menu.openModal() / menu.closeModal() to control it.
    modal: false,

    // When true: subcategories become the top-level tab navigation and items
    // are filtered by subcategoryId only (categoryId is ignored). Useful when
    // all items share a single categoryId (e.g. "SERVICES").
    subcategoryNav: false,

    // UI toggles
    showSearch: true,
    showFilter: true,
    showImages: true,
    showDescriptions: true,
    showEllipsis: true, // per-item "…" menu to choose basket section
    showSendOrderButton: true,
    showNextServingButton: true,

    // Animation level
    //   false -> baseline transitions only
    //   true  -> card fade-up, basket slide-in, hover scale, pop-in popovers,
    //            modal scale-in, overlay fade (honors prefers-reduced-motion)
    complexAnimations: false,

    // Default filter state (price range, sort order)
    //   sort: 'default' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc'
    filters: {
      minPrice: null,
      maxPrice: null,
      sort: "default",
    },

    // Labels (i18n-friendly)
    labels: {
      searchPlaceholder: "Search menu…",
      basketEmpty: "Basket is empty",
      table: "Table",
      guests: "Guests",
      server: "Server",
      orderNumber: "Order #",
      orderedAt: "Opened",
      addNote: "Add note",
      note: "Note",
      remove: "Remove",
      edit: "Edit",
      sendTo: "Send to",
      nextServing: "Next serving",
      sendOrder: "Send order",
      all: "All",
      save: "Save",
      cancel: "Cancel",
      filter: "Filter",
      filters: "Filters",
      priceRange: "Price range",
      minPrice: "Min",
      maxPrice: "Max",
      sortBy: "Sort by",
      sortDefault: "Default",
      sortPriceAsc: "Price (low → high)",
      sortPriceDesc: "Price (high → low)",
      sortNameAsc: "Name (A → Z)",
      sortNameDesc: "Name (Z → A)",
      clear: "Clear",
      apply: "Apply",
      noTable: "No table selected",
    },

    // Theme tokens (overridden via CSS vars)
    theme: {
      primary:       "#f05327",
      primaryDark:   "#d63d14",
      primarySoft:   "#fef2ed",
      surface:       "#ffffff",
      surfaceBright: "#fafafa",
      surfaceDim:    "#f4f4f4",
      surfaceAlt:    "#0a0a0a",
      surfaceMuted:  "#737373",
      surfaceSubtle: "#a3a3a3",
      border:        "#ededed",
      borderStrong:  "#d4d4d4",
      danger:        "#ef4444",
    },

    // Callbacks
    onItemAdd: null, // (item, basketSection, basket)
    onItemRemove: null, // (line, basket)
    onQtyChange: null, // (line, basket)
    onNoteChange: null, // (line, basket)
    onBasketChange: null, // (basket)
    onSectionChange: null, // (sectionId)
    onNextServing: null, // (basket)  -> should return new serving number or promise
    onSendOrder: null, // (order, done) order={ table, basket, serving }
    onTableChange: null, // (table)
  };

  // Accept either PascalCase (C# serialized) or camelCase for the same property.
  function _v(pascal, camel) {
    return pascal !== undefined ? pascal : camel;
  }

  function normalizeCategory(c) {
    var subs = _v(c.SubCategories, c.subcategories);
    return {
      id:            _v(c.Id,            c.id)            || "",
      label:         _v(c.Label,         c.label)         || "",
      icon:          _v(c.Icon,          c.icon)          || "",
      basketSection: _v(c.BasketSection, c.basketSection) || "",
      subcategories: Array.isArray(subs) ? subs.map(normalizeSubcategory) : []
    };
  }

  function normalizeSubcategory(s) {
    return {
      id:            _v(s.Id,            s.id)            || "",
      label:         _v(s.Label,         s.label)         || "",
      basketSection: _v(s.BasketSection, s.basketSection) || ""
    };
  }

  function normalizeItem(it) {
    var price = _v(it.Price, it.price);
    return {
      id:            _v(it.Id,            it.id)            || "",
      name:          _v(it.Name,          it.name)          || "",
      description:   _v(it.Description,   it.description)   || "",
      price:         price != null ? price : 0,
      image:         _v(it.Image,         it.image)         || "",
      categoryId:    _v(it.CategoryId,    it.categoryId)    || "",
      subcategoryId: _v(it.SubCategoryId, it.subcategoryId) || "",
      basketSection: _v(it.BasketSection, it.basketSection) || ""
    };
  }

  function merge(userCfg) {
    var out = jQuery.extend(true, {}, _defaults, userCfg || {});
    // Normalize categories and items to camelCase regardless of input casing
    if (Array.isArray(out.categories)) {
      out.categories = out.categories.map(normalizeCategory);
    }
    if (Array.isArray(out.items)) {
      out.items = out.items.map(normalizeItem);
    }
    // Normalize callable sections
    if (!Array.isArray(out.basketSections) || !out.basketSections.length) {
      out.basketSections = _defaults.basketSections.slice();
    }
    if (!out.defaultBasketSection) {
      out.defaultBasketSection = out.basketSections[0].id;
    }
    return out;
  }

  return {
    merge: merge,
    normalizeCategory: normalizeCategory,
    normalizeItem: normalizeItem
  };
})();


/* src/core/MenuEvents.js */
/**
 * MenuEvents.js
 * Tiny pub/sub used by internal modules to stay decoupled.
 */
var MenuEvents = (function () {
  var _map = {};

  function on(evt, fn) {
    (_map[evt] = _map[evt] || []).push(fn);
  }

  function off(evt, fn) {
    if (!_map[evt]) return;
    if (!fn) { delete _map[evt]; return; }
    _map[evt] = _map[evt].filter(function (f) { return f !== fn; });
  }

  function emit(evt, payload) {
    (_map[evt] || []).slice().forEach(function (fn) {
      try { fn(payload); } catch (e) { if (window.console) console.error(e); }
    });
  }

  function reset() { _map = {}; }

  return { on: on, off: off, emit: emit, reset: reset };
})();


/* src/core/MenuCore.js */
/**
 * MenuCore.js
 * Pure state + logic — zero DOM, zero jQuery rendering.
 * Owns: config, menu data, basket lines, active filters, table, serving.
 */
var MenuCore = (function () {
  var _cfg = null;
  var _activeCategoryId = null;
  var _activeSubcategoryId = null; // null = "all" within category
  var _activeSectionId = null;     // active basket section tab
  var _search = "";
  var _filters = { minPrice: null, maxPrice: null, sort: "default" };
  var _table = null;
  var _serving = 1;

  // Basket lines: { lineId, item, qty, note, sectionId }
  var _basket = [];
  var _lineSeq = 1;

  // ── Setup ─────────────────────────────────────────

  function init(cfg) {
    _cfg = cfg;
    _table = cfg.table ? jQuery.extend(true, {}, cfg.table) : null;
    _basket = [];
    _lineSeq = 1;
    _serving = 1;
    _search = "";
    _filters = jQuery.extend(true, { minPrice: null, maxPrice: null, sort: "default" }, cfg.filters || {});
    _activeCategoryId = (cfg.categories && cfg.categories[0]) ? cfg.categories[0].id : null;
    _activeSubcategoryId = null;
    _activeSectionId = cfg.defaultBasketSection;
  }

  function reset() {
    _cfg = null;
    _basket = [];
    _lineSeq = 1;
    _serving = 1;
    _search = "";
    _filters = { minPrice: null, maxPrice: null, sort: "default" };
    _activeCategoryId = null;
    _activeSubcategoryId = null;
    _activeSectionId = null;
    _table = null;
  }

  function getConfig() { return _cfg; }

  // ── Live config updates (no full re-create) ───────

  function setItems(items) {
    if (!_cfg) return;
    _cfg.items = Array.isArray(items) ? items.map(MenuConfig.normalizeItem) : [];
    MenuEvents.emit("menu:changed", { reason: "items" });
  }

  function setCategories(cats) {
    if (!_cfg) return;
    _cfg.categories = Array.isArray(cats) ? cats.map(MenuConfig.normalizeCategory) : [];
    // Reconcile active selection
    var list = _cfg.categories;
    var exists = list.some(function (c) { return c.id === _activeCategoryId; });
    _activeCategoryId = exists ? _activeCategoryId : (list[0] ? list[0].id : null);
    var subs = getSubcategories(_activeCategoryId);
    if (_activeSubcategoryId && !subs.some(function (s) { return s.id === _activeSubcategoryId; })) {
      _activeSubcategoryId = null;
    }
    MenuEvents.emit("menu:changed", { reason: "categories" });
  }

  function setBasketSections(sections) {
    if (!_cfg) return;
    _cfg.basketSections = Array.isArray(sections) && sections.length
      ? sections.slice() : _cfg.basketSections;
    // Reconcile active section
    var ok = _cfg.basketSections.some(function (s) { return s.id === _activeSectionId; });
    if (!ok) _activeSectionId = _cfg.basketSections[0].id;
    // Move any basket lines in removed sections to the default
    var valid = {};
    _cfg.basketSections.forEach(function (s) { valid[s.id] = true; });
    _basket.forEach(function (l) {
      if (!valid[l.sectionId]) l.sectionId = _cfg.basketSections[0].id;
    });
    MenuEvents.emit("sections:changed");
    MenuEvents.emit("basket:changed", { reason: "section" });
  }

  /**
   * Start a new order for the given table:
   *   - swap table
   *   - clear basket
   *   - reset serving to 1
   */
  function startNewOrder(table) {
    _table = table ? jQuery.extend(true, {}, table) : null;
    _basket = [];
    _lineSeq = 1;
    _serving = 1;
    MenuEvents.emit("table:changed", _table);
    MenuEvents.emit("basket:changed", { reason: "clear" });
    MenuEvents.emit("serving:changed", _serving);
  }

  // ── Menu queries ──────────────────────────────────

  function getCategories() { return _cfg ? _cfg.categories || [] : []; }

  function getCategory(id) {
    return getCategories().find(function (c) { return c.id === id; }) || null;
  }

  function getSubcategories(categoryId) {
    var c = getCategory(categoryId);
    return (c && c.subcategories) ? c.subcategories : [];
  }

  function getAllSubcategories() {
    var out = [];
    getCategories().forEach(function (c) {
      if (Array.isArray(c.subcategories)) {
        c.subcategories.forEach(function (s) { out.push(s); });
      }
    });
    return out;
  }

  function getItems() { return _cfg ? _cfg.items || [] : []; }

  function getItemById(id) {
    return getItems().find(function (i) { return i.id === id; }) || null;
  }

  function getFilteredItems() {
    var items = getItems().slice();
    var q = (_search || "").toLowerCase().trim();
    var hasSearch = q.length > 0;
    var min = (_filters.minPrice != null && _filters.minPrice !== "") ? Number(_filters.minPrice) : null;
    var max = (_filters.maxPrice != null && _filters.maxPrice !== "") ? Number(_filters.maxPrice) : null;

    var out = items.filter(function (it) {
      // When searching, scan the whole menu (ignore category/subcategory).
      if (!hasSearch) {
        if (_activeCategoryId && !_cfg.subcategoryNav) {
          var _cat = getCategory(_activeCategoryId);
          var _subIds = (_cat && Array.isArray(_cat.subcategories))
            ? _cat.subcategories.map(function (s) { return s.id; })
            : [];
          // Match by categoryId directly OR by the item's subcategoryId belonging
          // to this category — supports items that carry no categoryId.
          var _byCat = it.categoryId === _activeCategoryId;
          var _bySub = _subIds.length > 0 && _subIds.indexOf(it.subcategoryId) !== -1;
          if (!_byCat && !_bySub) return false;
        }
        if (_activeSubcategoryId && it.subcategoryId !== _activeSubcategoryId) return false;
      }
      if (hasSearch) {
        var hay = ((it.name || "") + " " + (it.description || "")).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      var price = Number(it.price) || 0;
      if (min != null && !isNaN(min) && price < min) return false;
      if (max != null && !isNaN(max) && price > max) return false;
      return true;
    });

    switch (_filters.sort) {
      case "price-asc":  out.sort(function (a, b) { return (Number(a.price) || 0) - (Number(b.price) || 0); }); break;
      case "price-desc": out.sort(function (a, b) { return (Number(b.price) || 0) - (Number(a.price) || 0); }); break;
      case "name-asc":   out.sort(function (a, b) { return (a.name || "").localeCompare(b.name || ""); }); break;
      case "name-desc":  out.sort(function (a, b) { return (b.name || "").localeCompare(a.name || ""); }); break;
    }
    return out;
  }

  function isSearching() { return (_search || "").trim().length > 0; }

  // ── Active filters ────────────────────────────────

  function getActiveCategoryId() { return _activeCategoryId; }
  function getActiveSubcategoryId() { return _activeSubcategoryId; }
  function getSearch() { return _search; }

  function setCategory(id) {
    _activeCategoryId = id;
    _activeSubcategoryId = null;
    MenuEvents.emit("filter:changed");
  }

  function setSubcategory(id) {
    _activeSubcategoryId = id || null;
    MenuEvents.emit("filter:changed");
  }

  function setSearch(q) {
    _search = q || "";
    MenuEvents.emit("filter:changed");
  }

  function getFilters() { return jQuery.extend(true, {}, _filters); }

  function setFilters(next) {
    next = next || {};
    _filters = {
      minPrice: (next.minPrice === "" || next.minPrice == null) ? null : next.minPrice,
      maxPrice: (next.maxPrice === "" || next.maxPrice == null) ? null : next.maxPrice,
      sort: next.sort || "default"
    };
    MenuEvents.emit("filter:changed");
  }

  function clearFilters() {
    _filters = { minPrice: null, maxPrice: null, sort: "default" };
    MenuEvents.emit("filter:changed");
  }

  function hasActiveFilters() {
    return (_filters.minPrice != null && _filters.minPrice !== "") ||
           (_filters.maxPrice != null && _filters.maxPrice !== "") ||
           (_filters.sort && _filters.sort !== "default");
  }

  // ── Basket section routing ────────────────────────

  function getBasketSections() { return _cfg ? _cfg.basketSections || [] : []; }

  function getActiveSectionId() { return _activeSectionId; }

  function setActiveSection(id) {
    _activeSectionId = id;
    MenuEvents.emit("section:changed", id);
  }

  /**
   * Resolve target basket section for an item.
   * Precedence: explicit override > item.basketSection > subcategory.basketSection
   *             > category.basketSection > cfg.defaultBasketSection
   */
  function resolveSection(item, overrideSectionId) {
    if (overrideSectionId) return overrideSectionId;
    if (item && item.basketSection) return item.basketSection;
    var cat = getCategory(item && item.categoryId);
    if (cat) {
      if (item && item.subcategoryId && Array.isArray(cat.subcategories)) {
        var sub = cat.subcategories.find(function (s) { return s.id === item.subcategoryId; });
        if (sub && sub.basketSection) return sub.basketSection;
      }
      if (cat.basketSection) return cat.basketSection;
    }
    return _cfg.defaultBasketSection;
  }

  // ── Basket ops ────────────────────────────────────

  function getBasket() { return _basket.slice(); }

  function getBasketBySection(sectionId) {
    return _basket.filter(function (l) { return l.sectionId === sectionId; });
  }

  function getBasketTotal() {
    return _basket.reduce(function (sum, l) {
      return sum + (Number(l.item.price) || 0) * l.qty;
    }, 0);
  }

  function getSectionTotal(sectionId) {
    return _basket.reduce(function (sum, l) {
      if (l.sectionId !== sectionId) return sum;
      return sum + (Number(l.item.price) || 0) * l.qty;
    }, 0);
  }

  function _findLine(itemId, sectionId) {
    return _basket.find(function (l) {
      return l.item.id === itemId && l.sectionId === sectionId && !l.note;
    }) || null;
  }

  function addItem(itemId, overrideSectionId) {
    var item = getItemById(itemId);
    if (!item) return null;
    var sectionId = resolveSection(item, overrideSectionId);

    // Stack if an un-noted line for same item+section exists
    var existing = _findLine(itemId, sectionId);
    if (existing) {
      existing.qty += 1;
      MenuEvents.emit("basket:changed", { line: existing, reason: "qty" });
      return existing;
    }

    var line = {
      lineId: "L" + (_lineSeq++),
      item: jQuery.extend(true, {}, item),
      qty: 1,
      note: "",
      sectionId: sectionId
    };
    _basket.push(line);
    MenuEvents.emit("basket:changed", { line: line, reason: "add" });
    return line;
  }

  function incQty(lineId) {
    var l = _basket.find(function (x) { return x.lineId === lineId; });
    if (!l) return;
    l.qty += 1;
    MenuEvents.emit("basket:changed", { line: l, reason: "qty" });
  }

  function decQty(lineId) {
    var idx = _basket.findIndex(function (x) { return x.lineId === lineId; });
    if (idx === -1) return;
    var l = _basket[idx];
    l.qty -= 1;
    if (l.qty <= 0) {
      _basket.splice(idx, 1);
      MenuEvents.emit("basket:changed", { line: l, reason: "remove" });
    } else {
      MenuEvents.emit("basket:changed", { line: l, reason: "qty" });
    }
  }

  function removeLine(lineId) {
    var idx = _basket.findIndex(function (x) { return x.lineId === lineId; });
    if (idx === -1) return;
    var removed = _basket.splice(idx, 1)[0];
    MenuEvents.emit("basket:changed", { line: removed, reason: "remove" });
  }

  function setLineNote(lineId, note) {
    var l = _basket.find(function (x) { return x.lineId === lineId; });
    if (!l) return;
    l.note = note || "";
    MenuEvents.emit("basket:changed", { line: l, reason: "note" });
  }

  function moveLineToSection(lineId, sectionId) {
    var l = _basket.find(function (x) { return x.lineId === lineId; });
    if (!l) return;
    l.sectionId = sectionId;
    MenuEvents.emit("basket:changed", { line: l, reason: "section" });
  }

  function clearBasket() {
    _basket = [];
    _lineSeq = 1;
    MenuEvents.emit("basket:changed", { reason: "clear" });
  }

  // ── Table & serving ───────────────────────────────

  function getTable() { return _table ? jQuery.extend(true, {}, _table) : null; }

  function setTable(t) {
    _table = t ? jQuery.extend(true, {}, t) : null;
    MenuEvents.emit("table:changed", _table);
  }

  function getServing() { return _serving; }
  function setServing(n) {
    _serving = Math.max(1, parseInt(n, 10) || 1);
    MenuEvents.emit("serving:changed", _serving);
  }
  function nextServing() {
    _serving += 1;
    MenuEvents.emit("serving:changed", _serving);
    return _serving;
  }

  // ── Formatting helper ─────────────────────────────

  function formatPrice(value) {
    var c = (_cfg && _cfg.currency) || { symbol: "$", position: "prefix", decimals: 2 };
    var n = (Number(value) || 0).toFixed(c.decimals);
    return c.position === "suffix" ? (n + c.symbol) : (c.symbol + n);
  }

  return {
    init: init,
    reset: reset,
    getConfig: getConfig,

    // Live updates
    setItems: setItems,
    setCategories: setCategories,
    setBasketSections: setBasketSections,
    startNewOrder: startNewOrder,

    // Menu
    getCategories: getCategories,
    getCategory: getCategory,
    getSubcategories: getSubcategories,
    getAllSubcategories: getAllSubcategories,
    getItems: getItems,
    getItemById: getItemById,
    getFilteredItems: getFilteredItems,

    // Filters
    getActiveCategoryId: getActiveCategoryId,
    getActiveSubcategoryId: getActiveSubcategoryId,
    getSearch: getSearch,
    isSearching: isSearching,
    setCategory: setCategory,
    setSubcategory: setSubcategory,
    setSearch: setSearch,
    getFilters: getFilters,
    setFilters: setFilters,
    clearFilters: clearFilters,
    hasActiveFilters: hasActiveFilters,

    // Sections
    getBasketSections: getBasketSections,
    getActiveSectionId: getActiveSectionId,
    setActiveSection: setActiveSection,
    resolveSection: resolveSection,

    // Basket
    getBasket: getBasket,
    getBasketBySection: getBasketBySection,
    getBasketTotal: getBasketTotal,
    getSectionTotal: getSectionTotal,
    addItem: addItem,
    incQty: incQty,
    decQty: decQty,
    removeLine: removeLine,
    setLineNote: setLineNote,
    moveLineToSection: moveLineToSection,
    clearBasket: clearBasket,

    // Table & serving
    getTable: getTable,
    setTable: setTable,
    getServing: getServing,
    setServing: setServing,
    nextServing: nextServing,

    formatPrice: formatPrice
  };
})();


/* src/modules/MenuRender.js */
/**
 * MenuRender.js
 * Pure DOM builders — input → jQuery element. No state held here.
 */
var MenuRender = (function () {
  var _ns = "rm-";
  function ns(cls) { return _ns + cls; }

  // ── Shell ─────────────────────────────────────────
  function buildShell() {
    return jQuery("<div>").addClass(ns("wrapper")).append(
      jQuery("<div>").addClass(ns("table-slot")),
      jQuery("<div>").addClass(ns("body")).append(
        jQuery("<div>").addClass(ns("left")),
        jQuery("<div>").addClass(ns("right")),
        jQuery("<div>").addClass(ns("backdrop"))
      )
    );
  }

  function buildBasketFab(labels) {
    return jQuery("<button type='button'>").addClass(ns("basket-fab"))
      .attr("aria-label", (labels && labels.basket) || "Basket")
      .append(jQuery("<i>").addClass("fa-solid fa-basket-shopping"))
      .append(jQuery("<span>").addClass(ns("basket-fab-count")));
  }

  // ── Table info header ─────────────────────────────
  function buildTableInfo(table, labels) {
    var $wrap = jQuery("<div>").addClass(ns("table-info"));
    if (!table) {
      $wrap.append(jQuery("<span>").addClass(ns("table-none")).text("No table selected"));
      return $wrap;
    }
    var rows = [
      { label: labels.table,  value: table.name || ("#" + (table.id || "")) },
      { label: labels.guests, value: table.guests != null ? table.guests : (table.seats || "") },
      { label: labels.server, value: table.server || "" },
      { label: labels.orderNumber, value: table.orderNumber || "" },
      { label: labels.orderedAt, value: table.orderedAt ? new Date(table.orderedAt).toLocaleTimeString(labels.locale, { hour: "2-digit", minute: "2-digit" }) : "" }
    ];
    rows.forEach(function (r) {
      if (r.value === "" || r.value == null) return;
      $wrap.append(
        jQuery("<div>").addClass(ns("table-cell")).append(
          jQuery("<span>").addClass(ns("table-label")).text(r.label),
          jQuery("<span>").addClass(ns("table-value")).text(r.value)
        )
      );
    });
    return $wrap;
  }

  // ── Search + filter row ──────────────────
  function buildSearchRow(cfg) {
    var labels = cfg.labels;
    var $row = jQuery("<div>").addClass(ns("search-row"));

    var $search = jQuery("<div>").addClass(ns("search"));
    $search.append(jQuery("<i>").addClass("fa-solid fa-magnifying-glass " + ns("search-icon")));
    $search.append(
      jQuery("<input type='text'>")
        .addClass(ns("search-input"))
        .attr("placeholder", labels.searchPlaceholder)
    );
    $search.append(
      jQuery("<button type='button'>").addClass(ns("search-clear"))
        .attr("title", labels.clear)
        .append(jQuery("<i>").addClass("fa-solid fa-xmark"))
    );
    $row.append($search);

    if (cfg.showFilter) {
      var $btn = jQuery("<button type='button'>").addClass(ns("filter-btn"))
        .attr("title", labels.filter || "Filter")
        .append(jQuery("<i>").addClass("fa-solid fa-sliders"))
        .append(jQuery("<span>").text(labels.filter || "Filter"));
      $row.append($btn);
    }
    return $row;
  }

  function buildFilterPopover(cfg, filters) {
    var labels = cfg.labels;
    var f = filters || { minPrice: null, maxPrice: null, sort: "default" };
    var $pop = jQuery("<div>").addClass(ns("filter-pop"));

    $pop.append(jQuery("<div>").addClass(ns("filter-pop-title")).text(labels.filters || "Filters"));

    var $priceRow = jQuery("<div>").addClass(ns("filter-row"));
    $priceRow.append(jQuery("<label>").text(labels.priceRange));
    var $price = jQuery("<div>").addClass(ns("filter-price"));
    $price.append(
      jQuery("<input type='number' min='0' step='0.01'>")
        .attr("placeholder", labels.minPrice)
        .attr("data-filter-key", "minPrice")
        .val(f.minPrice != null ? f.minPrice : "")
    );
    $price.append(jQuery("<span>").text("–"));
    $price.append(
      jQuery("<input type='number' min='0' step='0.01'>")
        .attr("placeholder", labels.maxPrice)
        .attr("data-filter-key", "maxPrice")
        .val(f.maxPrice != null ? f.maxPrice : "")
    );
    $priceRow.append($price);
    $pop.append($priceRow);

    var $sortRow = jQuery("<div>").addClass(ns("filter-row"));
    $sortRow.append(jQuery("<label>").text(labels.sortBy));
    var $sort = jQuery("<select>").addClass(ns("filter-sort")).attr("data-filter-key", "sort");
    [
      { v: "default",    t: labels.sortDefault },
      { v: "price-asc",  t: labels.sortPriceAsc },
      { v: "price-desc", t: labels.sortPriceDesc },
      { v: "name-asc",   t: labels.sortNameAsc },
      { v: "name-desc",  t: labels.sortNameDesc }
    ].forEach(function (o) {
      $sort.append(jQuery("<option>").val(o.v).text(o.t).prop("selected", o.v === f.sort));
    });
    $sortRow.append($sort);
    $pop.append($sortRow);

    var $actions = jQuery("<div>").addClass(ns("filter-actions"));
    $actions.append(
      jQuery("<button type='button'>").addClass(ns("btn") + " " + ns("btn-cancel") + " " + ns("filter-clear"))
        .text(labels.clear)
    );
    $actions.append(
      jQuery("<button type='button'>").addClass(ns("btn") + " " + ns("btn-primary") + " " + ns("filter-apply"))
        .text(labels.apply)
    );
    $pop.append($actions);
    return $pop;
  }

  // ── Category tabs ─────────────────────────────────
  function buildCategoryTabs(categories, activeId) {
    var $wrap = jQuery("<div>").addClass(ns("cat-tabs"));
    categories.forEach(function (c) {
      var $tab = jQuery("<button>")
        .addClass(ns("cat-tab"))
        .attr("data-cat-id", c.id)
        .toggleClass(ns("cat-tab--active"), c.id === activeId);
      if (c.icon) $tab.append(jQuery("<i>").addClass(c.icon + " " + ns("cat-tab-icon")));
      $tab.append(jQuery("<span>").text(c.label || c.id));
      $wrap.append($tab);
    });
    return $wrap;
  }

  // ── Subcategory-as-category tabs (subcategoryNav mode) ───────────────────
  function buildSubcategoryNavTabs(subcategories, activeSubId, allLabel) {
    var $wrap = jQuery("<div>").addClass(ns("cat-tabs"));
    $wrap.append(
      jQuery("<button>")
        .addClass(ns("cat-tab"))
        .toggleClass(ns("cat-tab--active"), !activeSubId)
        .attr("data-sub-id", "")
        .append(jQuery("<span>").text(allLabel || "All"))
    );
    subcategories.forEach(function (s) {
      var $tab = jQuery("<button>")
        .addClass(ns("cat-tab"))
        .attr("data-sub-id", s.id)
        .toggleClass(ns("cat-tab--active"), s.id === activeSubId);
      if (s.icon) $tab.append(jQuery("<i>").addClass(s.icon + " " + ns("cat-tab-icon")));
      $tab.append(jQuery("<span>").text(s.label || s.id));
      $wrap.append($tab);
    });
    return $wrap;
  }

  // ── Sub-category pills ────────────────────────────
  function buildSubTabs(subs, activeId, allLabel) {
    var $wrap = jQuery("<div>").addClass(ns("sub-tabs"));
    if (!subs || !subs.length) return $wrap;
    $wrap.append(
      jQuery("<button>").addClass(ns("sub-tab"))
        .toggleClass(ns("sub-tab--active"), !activeId)
        .attr("data-sub-id", "")
        .text(allLabel)
    );
    subs.forEach(function (s) {
      $wrap.append(
        jQuery("<button>").addClass(ns("sub-tab"))
          .toggleClass(ns("sub-tab--active"), s.id === activeId)
          .attr("data-sub-id", s.id)
          .text(s.label || s.id)
      );
    });
    return $wrap;
  }

  // ── Item grid ─────────────────────────────────────
  function buildItemGrid() {
    return jQuery("<div>").addClass(ns("item-grid"));
  }

  function buildItemCard(item, cfg, priceText) {
    var $card = jQuery("<div>").addClass(ns("item-card")).attr("data-item-id", item.id);

    if (cfg.showImages) {
      var $imgBox = jQuery("<div>").addClass(ns("item-img"));
      if (item.image) {
        $imgBox.append(jQuery("<img>").attr("src", item.image).attr("alt", item.name || ""));
      } else {
        $imgBox.append(jQuery("<i>").addClass("fa-solid fa-utensils " + ns("item-img-placeholder")));
      }
      $card.append($imgBox);
    }

    var $body = jQuery("<div>").addClass(ns("item-body"));
    $body.append(jQuery("<div>").addClass(ns("item-name")).text(item.name || ""));
    if (cfg.showDescriptions && item.description) {
      $body.append(jQuery("<div>").addClass(ns("item-desc")).text(item.description));
    }
    $body.append(jQuery("<div>").addClass(ns("item-price")).text(priceText));
    $card.append($body);

    if (cfg.showEllipsis) {
      $card.append(
        jQuery("<button>").addClass(ns("item-ellipsis"))
          .attr("title", "More")
          .append(jQuery("<i>").addClass("fa-solid fa-ellipsis-vertical"))
      );
    }
    return $card;
  }

  // ── Basket ────────────────────────────────────────
  function buildBasketPanel() {
    return jQuery("<div>").addClass(ns("basket")).append(
      jQuery("<div>").addClass(ns("basket-header")),
      jQuery("<div>").addClass(ns("basket-tabs")),
      jQuery("<div>").addClass(ns("basket-list")),
      jQuery("<div>").addClass(ns("basket-footer"))
    );
  }

  function buildBasketSectionTab(section, activeId, count) {
    var $tab = jQuery("<button>")
      .addClass(ns("basket-tab"))
      .attr("data-section-id", section.id)
      .toggleClass(ns("basket-tab--active"), section.id === activeId);
    if (section.icon) $tab.append(jQuery("<i>").addClass(section.icon + " " + ns("basket-tab-icon")));
    $tab.append(jQuery("<span>").text(section.label || section.id));
    if (count) $tab.append(jQuery("<span>").addClass(ns("basket-tab-count")).text(count));
    return $tab;
  }

  function buildBasketLine(line, priceText, lineTotalText, labels) {
    var $row = jQuery("<div>").addClass(ns("basket-line")).attr("data-line-id", line.lineId);

    var $main = jQuery("<div>").addClass(ns("basket-line-main"));
    $main.append(jQuery("<div>").addClass(ns("basket-line-name")).text(line.item.name || ""));
    $main.append(jQuery("<div>").addClass(ns("basket-line-price")).text(priceText));
    if (line.note) {
      $main.append(
        jQuery("<div>").addClass(ns("basket-line-note"))
          .append(jQuery("<i>").addClass("fa-solid fa-pen-to-square"))
          .append(jQuery("<span>").text(line.note))
      );
    }
    $row.append($main);

    var $qty = jQuery("<div>").addClass(ns("qty-ctrl"));
    $qty.append(jQuery("<button>").addClass(ns("qty-dec")).append(jQuery("<i>").addClass("fa-solid fa-minus")));
    $qty.append(jQuery("<span>").addClass(ns("qty-val")).text(line.qty));
    $qty.append(jQuery("<button>").addClass(ns("qty-inc")).append(jQuery("<i>").addClass("fa-solid fa-plus")));
    $row.append($qty);

    $row.append(jQuery("<div>").addClass(ns("basket-line-total")).text(lineTotalText));

    var $actions = jQuery("<div>").addClass(ns("basket-line-actions"));
    $actions.append(
      jQuery("<button>").addClass(ns("line-edit")).attr("title", labels.edit)
        .append(jQuery("<i>").addClass("fa-solid fa-pen"))
    );
    $actions.append(
      jQuery("<button>").addClass(ns("line-remove")).attr("title", labels.remove)
        .append(jQuery("<i>").addClass("fa-solid fa-trash-can"))
    );
    $row.append($actions);

    return $row;
  }

  function buildEmptyBasket(text) {
    return jQuery("<div>").addClass(ns("basket-empty")).append(
      jQuery("<i>").addClass("fa-solid fa-basket-shopping"),
      jQuery("<span>").text(text)
    );
  }

  function buildBasketFooter(cfg, servingLabel, totalText) {
    var $f = jQuery("<div>").addClass(ns("basket-footer-inner"));
    $f.append(
      jQuery("<div>").addClass(ns("basket-serving")).text(servingLabel)
    );
    $f.append(
      jQuery("<div>").addClass(ns("basket-total"))
        .append(jQuery("<span>").addClass(ns("basket-total-label")).text("Total"))
        .append(jQuery("<span>").addClass(ns("basket-total-value")).text(totalText))
    );
    var $btns = jQuery("<div>").addClass(ns("basket-btns"));
    if (cfg.showNextServingButton) {
      $btns.append(
        jQuery("<button>").addClass(ns("btn") + " " + ns("btn-secondary") + " " + ns("btn-next-serving"))
          .append(jQuery("<i>").addClass("fa-solid fa-forward"))
          .append(jQuery("<span>").text(cfg.labels.nextServing))
      );
    }
    if (cfg.showSendOrderButton) {
      $btns.append(
        jQuery("<button>").addClass(ns("btn") + " " + ns("btn-primary") + " " + ns("btn-send-order"))
          .append(jQuery("<i>").addClass("fa-solid fa-paper-plane"))
          .append(jQuery("<span>").text(cfg.labels.sendOrder))
      );
    }
    $f.append($btns);
    return $f;
  }

  return {
    ns: ns,
    buildShell: buildShell,
    buildBasketFab: buildBasketFab,
    buildTableInfo: buildTableInfo,
    buildSearchRow: buildSearchRow,
    buildFilterPopover: buildFilterPopover,
    buildCategoryTabs: buildCategoryTabs,
    buildSubTabs: buildSubTabs,
    buildItemGrid: buildItemGrid,
    buildItemCard: buildItemCard,
    buildBasketPanel: buildBasketPanel,
    buildBasketSectionTab: buildBasketSectionTab,
    buildBasketLine: buildBasketLine,
    buildEmptyBasket: buildEmptyBasket,
    buildBasketFooter: buildBasketFooter
  };
})();


/* src/modules/MenuBrowse.js */
/**
 * MenuBrowse.js
 * Owns the left column: table info, search, category/subcategory tabs,
 * item grid, and per-item ellipsis popover for choosing a basket section.
 */
var MenuBrowse = (function () {
  var _$root = null;

  function build($root) {
    _$root = $root;
    var cfg = MenuCore.getConfig();
    var $left = $root.find("." + MenuRender.ns("left"));
    var $slot = $root.find("." + MenuRender.ns("table-slot"));

    $slot.empty().append(MenuRender.buildTableInfo(MenuCore.getTable(), cfg.labels));
    $left.empty();
    if (cfg.showSearch) $left.append(MenuRender.buildSearchRow(cfg));
    if (cfg.subcategoryNav) {
      $left.append(
        MenuRender.buildSubcategoryNavTabs(
          MenuCore.getAllSubcategories(),
          MenuCore.getActiveSubcategoryId(),
          cfg.labels.all
        )
      );
    } else {
      $left.append(
        MenuRender.buildCategoryTabs(MenuCore.getCategories(), MenuCore.getActiveCategoryId())
      );
      $left.append(
        MenuRender.buildSubTabs(
          MenuCore.getSubcategories(MenuCore.getActiveCategoryId()),
          MenuCore.getActiveSubcategoryId(),
          cfg.labels.all
        )
      );
    }
    $left.append(MenuRender.buildItemGrid());

    _applySearchState();
    _applyFilterState();
    _renderItems();
    _bind();

    MenuEvents.on("filter:changed", function () {
      _renderSubTabs();
      _applySearchState();
      _applyFilterState();
      _renderItems();
    });
    MenuEvents.on("table:changed", function () { _renderTableInfo(); });
    MenuEvents.on("menu:changed", function () { _refreshMenu(); });
  }

  function _applySearchState() {
    var searching = MenuCore.isSearching();
    var ns = MenuRender.ns;
    _$root.find("." + ns("cat-tabs")).toggleClass(ns("cat-tabs--hidden"), searching);
    _$root.find("." + ns("sub-tabs")).toggleClass(ns("sub-tabs--hidden"), searching);
    var $search = _$root.find("." + ns("search"));
    $search.toggleClass(ns("search--filled"), searching);
    var q = MenuCore.getSearch();
    var $input = $search.find("." + ns("search-input"));
    if ($input.val() !== q) $input.val(q);
  }

  function _applyFilterState() {
    var ns = MenuRender.ns;
    _$root.find("." + ns("filter-btn"))
      .toggleClass(ns("filter-btn--active"), MenuCore.hasActiveFilters())
      .find("." + ns("filter-btn-dot")).remove();
    if (MenuCore.hasActiveFilters()) {
      _$root.find("." + ns("filter-btn"))
        .append(jQuery("<span>").addClass(ns("filter-btn-dot")));
    }
  }

  function _refreshMenu() {
    var cfg = MenuCore.getConfig();
    if (cfg.subcategoryNav) {
      _$root.find("." + MenuRender.ns("cat-tabs"))
        .replaceWith(MenuRender.buildSubcategoryNavTabs(
          MenuCore.getAllSubcategories(),
          MenuCore.getActiveSubcategoryId(),
          cfg.labels.all
        ));
    } else {
      _$root.find("." + MenuRender.ns("cat-tabs"))
        .replaceWith(MenuRender.buildCategoryTabs(MenuCore.getCategories(), MenuCore.getActiveCategoryId()));
      _$root.find("." + MenuRender.ns("sub-tabs"))
        .replaceWith(MenuRender.buildSubTabs(
          MenuCore.getSubcategories(MenuCore.getActiveCategoryId()),
          MenuCore.getActiveSubcategoryId(),
          cfg.labels.all
        ));
    }
    _renderItems();
  }

  function _renderTableInfo() {
    var cfg = MenuCore.getConfig();
    _$root.find("." + MenuRender.ns("table-slot")).empty()
      .append(MenuRender.buildTableInfo(MenuCore.getTable(), cfg.labels));
  }

  function _renderSubTabs() {
    var cfg = MenuCore.getConfig();
    if (cfg.subcategoryNav) {
      _$root.find("." + MenuRender.ns("cat-tabs"))
        .replaceWith(MenuRender.buildSubcategoryNavTabs(
          MenuCore.getAllSubcategories(),
          MenuCore.getActiveSubcategoryId(),
          cfg.labels.all
        ));
      return;
    }
    _$root.find("." + MenuRender.ns("sub-tabs"))
      .replaceWith(MenuRender.buildSubTabs(
        MenuCore.getSubcategories(MenuCore.getActiveCategoryId()),
        MenuCore.getActiveSubcategoryId(),
        cfg.labels.all
      ));
    _$root.find("." + MenuRender.ns("cat-tab")).removeClass(MenuRender.ns("cat-tab--active"));
    _$root.find("." + MenuRender.ns("cat-tab") + "[data-cat-id='" + MenuCore.getActiveCategoryId() + "']")
      .addClass(MenuRender.ns("cat-tab--active"));
  }

  function _renderItems() {
    var cfg = MenuCore.getConfig();
    var $grid = _$root.find("." + MenuRender.ns("item-grid")).empty();
    var items = MenuCore.getFilteredItems();
    if (!items.length) {
      $grid.append(jQuery("<div>").addClass(MenuRender.ns("item-empty")).text("No items"));
      return;
    }
    items.forEach(function (it) {
      $grid.append(MenuRender.buildItemCard(it, cfg, MenuCore.formatPrice(it.price)));
    });
  }

  function _bind() {
    var ns = MenuRender.ns;

    _$root.on("input", "." + ns("search-input"), function () {
      MenuCore.setSearch(jQuery(this).val());
    });

    _$root.on("click", "." + ns("search-clear"), function () {
      MenuCore.setSearch("");
    });

    _$root.on("click", "." + ns("cat-tab"), function () {
      var cfg = MenuCore.getConfig();
      if (cfg.subcategoryNav) {
        MenuCore.setSubcategory(jQuery(this).attr("data-sub-id"));
      } else {
        MenuCore.setCategory(jQuery(this).attr("data-cat-id"));
      }
    });

    _$root.on("click", "." + ns("sub-tab"), function () {
      MenuCore.setSubcategory(jQuery(this).attr("data-sub-id"));
    });

    _$root.on("click", "." + ns("filter-btn"), function (e) {
      e.stopPropagation();
      _showFilterPopover(jQuery(this));
    });

    // Click card (but not ellipsis) → add with resolved section
    _$root.on("click", "." + ns("item-card"), function (e) {
      if (jQuery(e.target).closest("." + ns("item-ellipsis")).length) return;
      var id = jQuery(this).attr("data-item-id");
      var line = MenuCore.addItem(id);
      if (line) _pulseCard(jQuery(this));
    });

    // Ellipsis → popover to pick basket section
    _$root.on("click", "." + ns("item-ellipsis"), function (e) {
      e.stopPropagation();
      var $btn = jQuery(this);
      var itemId = $btn.closest("." + ns("item-card")).attr("data-item-id");
      _showSectionPopover($btn, itemId);
    });
  }

  function _showFilterPopover($anchor) {
    _closePopover();
    _closeFilterPopover();
    var cfg = MenuCore.getConfig();
    var $pop = MenuRender.buildFilterPopover(cfg, MenuCore.getFilters());

    $pop.on("click", function (e) { e.stopPropagation(); });

    $pop.on("click", "." + MenuRender.ns("filter-apply"), function () {
      var next = {
        minPrice: $pop.find("[data-filter-key='minPrice']").val(),
        maxPrice: $pop.find("[data-filter-key='maxPrice']").val(),
        sort:     $pop.find("[data-filter-key='sort']").val()
      };
      MenuCore.setFilters(next);
      _closeFilterPopover();
    });

    $pop.on("click", "." + MenuRender.ns("filter-clear"), function () {
      MenuCore.clearFilters();
      _closeFilterPopover();
    });

    jQuery("body").append($pop);
    _positionAnchored($pop, $anchor);

    setTimeout(function () {
      jQuery(document).on("click.rmfilter", _closeFilterPopover);
    }, 0);
  }

  function _closeFilterPopover() {
    jQuery("." + MenuRender.ns("filter-pop")).remove();
    jQuery(document).off("click.rmfilter");
  }

  function _pulseCard($card) {
    var cls = MenuRender.ns("item-card--pulse");
    $card.addClass(cls);
    setTimeout(function () { $card.removeClass(cls); }, 280);
  }

  function _showSectionPopover($anchor, itemId) {
    _closePopover();
    var cfg = MenuCore.getConfig();
    var sections = MenuCore.getBasketSections();

    var $pop = jQuery("<div>").addClass(MenuRender.ns("popover"));
    $pop.append(jQuery("<div>").addClass(MenuRender.ns("popover-title")).text(cfg.labels.sendTo));
    sections.forEach(function (s) {
      var $opt = jQuery("<button>").addClass(MenuRender.ns("popover-opt")).attr("data-section-id", s.id);
      if (s.icon) $opt.append(jQuery("<i>").addClass(s.icon));
      $opt.append(jQuery("<span>").text(s.label || s.id));
      $pop.append($opt);
    });

    $pop.on("click", "." + MenuRender.ns("popover-opt"), function (e) {
      e.stopPropagation();
      var sid = jQuery(this).attr("data-section-id");
      MenuCore.addItem(itemId, sid);
      MenuCore.setActiveSection(sid);
      _closePopover();
    });

    jQuery("body").append($pop);
    _position($pop, $anchor);

    setTimeout(function () {
      jQuery(document).one("click.rmpop", _closePopover);
    }, 0);
  }

  function _position($pop, $anchor) {
    var off = $anchor.offset();
    var h = $anchor.outerHeight();
    $pop.css({ top: off.top + h + 4, left: off.left - $pop.outerWidth() + $anchor.outerWidth() });
  }

  function _positionAnchored($pop, $anchor) {
    var off = $anchor.offset();
    var h = $anchor.outerHeight();
    var winW = jQuery(window).width();
    var popW = $pop.outerWidth();
    var right = off.left - popW + $anchor.outerWidth();
    // keep inside viewport
    if (right < 8) right = 8;
    if (right + popW > winW - 8) right = winW - popW - 8;
    $pop.css({ top: off.top + h + 6, left: right });
  }

  function _closePopover() {
    jQuery("." + MenuRender.ns("popover")).remove();
    jQuery(document).off("click.rmpop");
  }

  function unbind() {
    if (_$root) _$root.off();
    _closePopover();
    _closeFilterPopover();
    _$root = null;
  }

  return { build: build, unbind: unbind };
})();


/* src/modules/MenuEditLine.js */
/**
 * MenuEditLine.js
 * Modal for editing a basket line — add/edit note and move to another section.
 */
var MenuEditLine = (function () {

  function open(line) {
    var cfg = MenuCore.getConfig();
    var ns = MenuRender.ns;

    var $overlay = jQuery("<div>").addClass(ns("overlay"));
    var $modal = jQuery("<div>").addClass(ns("modal"));

    $modal.append(
      jQuery("<h2>").append(
        jQuery("<i>").addClass("fa-solid fa-pen-to-square"),
        jQuery("<span>").text(" " + line.item.name)
      )
    );

    // Note field
    var $note = jQuery("<textarea>").addClass(ns("field-input"))
      .attr("rows", 3)
      .attr("placeholder", cfg.labels.addNote)
      .val(line.note || "");

    $modal.append(
      jQuery("<div>").addClass(ns("field")).append(
        jQuery("<label>").text(cfg.labels.note),
        $note
      )
    );

    // Section selector
    var $sel = jQuery("<select>").addClass(ns("field-input"));
    MenuCore.getBasketSections().forEach(function (s) {
      $sel.append(jQuery("<option>").attr("value", s.id).text(s.label || s.id));
    });
    $sel.val(line.sectionId);

    $modal.append(
      jQuery("<div>").addClass(ns("field")).append(
        jQuery("<label>").text(cfg.labels.sendTo),
        $sel
      )
    );

    var $cancel = jQuery("<button>").addClass(ns("btn") + " " + ns("btn-cancel")).text(cfg.labels.cancel);
    var $save   = jQuery("<button>").addClass(ns("btn") + " " + ns("btn-primary")).text(cfg.labels.save);

    $modal.append(jQuery("<div>").addClass(ns("modal-actions")).append($cancel, $save));
    $overlay.append($modal);
    jQuery("body").append($overlay);

    setTimeout(function () { $note.trigger("focus"); }, 30);

    function close() { $overlay.remove(); }

    $cancel.on("click", close);
    $overlay.on("click", function (e) { if (jQuery(e.target).is($overlay)) close(); });

    $save.on("click", function () {
      var newNote = jQuery.trim($note.val());
      var newSection = $sel.val();
      if (newNote !== (line.note || "")) MenuCore.setLineNote(line.lineId, newNote);
      if (newSection !== line.sectionId) MenuCore.moveLineToSection(line.lineId, newSection);
      close();
    });
  }

  return { open: open };
})();


/* src/modules/MenuBasket.js */
/**
 * MenuBasket.js
 * Owns the right column: basket section tabs, line list, quantity controls,
 * edit-note modal, and the "next serving" / "send order" action buttons.
 */
var MenuBasket = (function () {
  var _$root = null;

  function build($root) {
    _$root = $root;
    var $right = $root.find("." + MenuRender.ns("right"));
    $right.empty().append(MenuRender.buildBasketPanel());
    _renderAll();
    _bind();

    MenuEvents.on("basket:changed", function (evt) {
      _renderHeader();
      _renderTabs();
      _renderFooter();
      _patchList(evt);
    });
    MenuEvents.on("section:changed", _renderAll);
    MenuEvents.on("sections:changed", _renderAll);
    MenuEvents.on("serving:changed", _renderFooter);
  }

  function _renderAll() {
    _renderHeader();
    _renderTabs();
    _renderList();
    _renderFooter();
  }

  function _renderHeader() {
    var cfg = MenuCore.getConfig();
    var ns = MenuRender.ns;
    var $h = _$root.find("." + ns("basket-header")).empty();
    $h.append(jQuery("<i>").addClass("fa-solid fa-basket-shopping"));
    $h.append(jQuery("<span>").addClass(ns("basket-title")).text("Order"));
    var count = MenuCore.getBasket().reduce(function (s, l) { return s + l.qty; }, 0);
    if (count) $h.append(jQuery("<span>").addClass(ns("basket-count")).text(count));

    // Close button (CSS hides on desktop, shows on tablet drawer)
    $h.append(
      jQuery("<button type='button'>").addClass(ns("basket-close"))
        .attr("aria-label", (cfg.labels && cfg.labels.cancel) || "Close")
        .append(jQuery("<i>").addClass("fa-solid fa-xmark"))
    );
  }

  function _renderTabs() {
    var $t = _$root.find("." + MenuRender.ns("basket-tabs")).empty();
    var active = MenuCore.getActiveSectionId();
    MenuCore.getBasketSections().forEach(function (s) {
      var lines = MenuCore.getBasketBySection(s.id);
      var count = lines.reduce(function (n, l) { return n + l.qty; }, 0);
      $t.append(MenuRender.buildBasketSectionTab(s, active, count));
    });
  }

  function _renderList() {
    var cfg = MenuCore.getConfig();
    var $list = _$root.find("." + MenuRender.ns("basket-list")).empty();
    var active = MenuCore.getActiveSectionId();
    var lines = MenuCore.getBasketBySection(active);

    if (!lines.length) {
      $list.append(MenuRender.buildEmptyBasket(cfg.labels.basketEmpty));
      return;
    }
    lines.forEach(function (l) {
      var price = MenuCore.formatPrice(l.item.price);
      var total = MenuCore.formatPrice((Number(l.item.price) || 0) * l.qty);
      $list.append(MenuRender.buildBasketLine(l, price, total, cfg.labels));
    });
  }

  /**
   * Targeted DOM update for basket:changed — only the affected line animates.
   *   add    → slide in
   *   remove → slide out (collapse)
   *   qty    → in-place qty/total update + soft flash
   *   note   → in-place note update + soft flash
   * Anything else falls back to a full re-render.
   */
  function _patchList(evt) {
    var ns = MenuRender.ns;
    var cfg = MenuCore.getConfig();
    var $list = _$root.find("." + ns("basket-list"));

    if (!evt || !evt.line || evt.reason === "clear") {
      _renderList();
      return;
    }

    var line = evt.line;
    var active = MenuCore.getActiveSectionId();

    // Section moves: simplest correct behavior is a full re-render of the list.
    if (evt.reason === "section") {
      _renderList();
      return;
    }

    // Line belongs to a different section than the one currently shown
    if (line.sectionId !== active) return;

    var $existing = $list.find("." + ns("basket-line") +
      "[data-line-id='" + line.lineId + "']");

    if (evt.reason === "add") {
      $list.find("." + ns("basket-empty")).remove();
      var price = MenuCore.formatPrice(line.item.price);
      var total = MenuCore.formatPrice((Number(line.item.price) || 0) * line.qty);
      var $new = MenuRender.buildBasketLine(line, price, total, cfg.labels)
        .addClass(ns("basket-line--enter"));
      $list.append($new);
      setTimeout(function () { $new.removeClass(ns("basket-line--enter")); }, 360);
      return;
    }

    if (evt.reason === "remove") {
      if (!$existing.length) { _renderList(); return; }
      $existing.addClass(ns("basket-line--leave"));
      setTimeout(function () {
        $existing.remove();
        if (!$list.find("." + ns("basket-line")).length) _renderList();
      }, 280);
      return;
    }

    if (evt.reason === "qty" || evt.reason === "note") {
      // Line might not be in DOM yet (e.g. qty event right after add on a freshly
      // created section tab). Render it as an "enter" instead.
      if (!$existing.length) {
        $list.find("." + ns("basket-empty")).remove();
        var p2 = MenuCore.formatPrice(line.item.price);
        var t2 = MenuCore.formatPrice((Number(line.item.price) || 0) * line.qty);
        var $fresh = MenuRender.buildBasketLine(line, p2, t2, cfg.labels)
          .addClass(ns("basket-line--enter"));
        $list.append($fresh);
        setTimeout(function () { $fresh.removeClass(ns("basket-line--enter")); }, 360);
        return;
      }

      // Update qty + total text in place
      var newTotal = MenuCore.formatPrice((Number(line.item.price) || 0) * line.qty);
      $existing.find("." + ns("qty-val")).text(line.qty);
      $existing.find("." + ns("basket-line-total")).text(newTotal);

      // Sync note presence
      var $main = $existing.find("." + ns("basket-line-main"));
      var $note = $main.find("." + ns("basket-line-note"));
      if (line.note) {
        if ($note.length) {
          $note.find("span").text(line.note);
        } else {
          $main.append(
            jQuery("<div>").addClass(ns("basket-line-note"))
              .append(jQuery("<i>").addClass("fa-solid fa-pen-to-square"))
              .append(jQuery("<span>").text(line.note))
          );
        }
      } else if ($note.length) {
        $note.remove();
      }

      // Soft flash — retrigger by toggling the class off and back on
      var flashCls = ns("basket-line--flash");
      $existing.removeClass(flashCls);
      // Force reflow so the animation restarts on re-add
      void $existing[0].offsetWidth;
      $existing.addClass(flashCls);
      setTimeout(function () { $existing.removeClass(flashCls); }, 340);
      return;
    }

    // Unknown reason → safe fallback
    _renderList();
  }

  function _renderFooter() {
    var cfg = MenuCore.getConfig();
    var $f = _$root.find("." + MenuRender.ns("basket-footer")).empty();
    var servingLabel = "Serving #" + MenuCore.getServing();
    $f.append(MenuRender.buildBasketFooter(cfg, servingLabel, MenuCore.formatPrice(MenuCore.getBasketTotal())));
  }

  function _bind() {
    var ns = MenuRender.ns;
    var cfg = MenuCore.getConfig();

    _$root.on("click", "." + ns("basket-tab"), function () {
      MenuCore.setActiveSection(jQuery(this).attr("data-section-id"));
    });

    _$root.on("click", "." + ns("qty-inc"), function () {
      var id = jQuery(this).closest("." + ns("basket-line")).attr("data-line-id");
      MenuCore.incQty(id);
    });
    _$root.on("click", "." + ns("qty-dec"), function () {
      var id = jQuery(this).closest("." + ns("basket-line")).attr("data-line-id");
      MenuCore.decQty(id);
    });
    _$root.on("click", "." + ns("line-remove"), function () {
      var id = jQuery(this).closest("." + ns("basket-line")).attr("data-line-id");
      MenuCore.removeLine(id);
    });

    _$root.on("click", "." + ns("line-edit"), function () {
      var id = jQuery(this).closest("." + ns("basket-line")).attr("data-line-id");
      var line = MenuCore.getBasket().find(function (x) { return x.lineId === id; });
      if (line) MenuEditLine.open(line);
    });

    _$root.on("click", "." + ns("btn-next-serving"), function () {
      var basket = MenuCore.getBasket();
      if (typeof cfg.onNextServing === "function") cfg.onNextServing(basket);
      MenuCore.nextServing();
    });

    _$root.on("click", "." + ns("btn-send-order"), function () {
      var order = {
        table: MenuCore.getTable(),
        serving: MenuCore.getServing(),
        basket: MenuCore.getBasket(),
        total: MenuCore.getBasketTotal()
      };
      if (typeof cfg.onSendOrder === "function") {
        cfg.onSendOrder(order, function () { MenuCore.clearBasket(); });
      } else {
        MenuCore.clearBasket();
      }
    });
  }

  function unbind() {
    if (_$root) _$root.off();
    _$root = null;
  }

  return { build: build, unbind: unbind };
})();


/* src/RestaurantMenu.js */
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
    var $menuOverlay = null;
    var _menuModalOpen = false;

    if (cfg.modal) {
      $menuOverlay = jQuery("<div>").addClass("rm-menu-overlay");
      $root = jQuery("<div>").addClass("rm-root rm-root--modal");
      $root.append(
        jQuery("<button type='button'>").addClass("rm-menu-modal-close")
          .attr("aria-label", "Close")
          .append(jQuery("<i>").addClass("fa-solid fa-xmark"))
          .on("click", function () { closeMenuModal(); })
      );
      $menuOverlay.append($root);
      jQuery("body").append($menuOverlay);
      $container.empty();
    } else {
      $container.empty().addClass("rm-root");
      $root = $container;
    }

    $root.toggleClass("rm-root--fancy", !!cfg.complexAnimations);
    jQuery.each(cfg.theme, function (key, val) {
      $root[0].style.setProperty("--rm-" + camelToKebab(key), val);
    });

    // Build DOM
    var $shell = MenuRender.buildShell();
    $root.append($shell);
    MenuBrowse.build($shell);
    MenuBasket.build($shell);

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
      $fab.find("." + MenuRender.ns("basket-fab-count")).text(count);
      $fab.toggleClass(MenuRender.ns("basket-fab--has-count"), count > 0);
    }
    _syncFab();
    MenuEvents.on("basket:changed", _syncFab);

    // ── Modal open / close ────────────────────────────────────────────────
    function openMenuModal() {
      if (!cfg.modal || _menuModalOpen) return;
      _menuModalOpen = true;
      $menuOverlay.addClass("rm-menu-overlay--open");
      jQuery("body").css("overflow", "hidden");
      jQuery(document).on("keydown.rmmenumodal", function (e) {
        if (e.key === "Escape") closeMenuModal();
      });
    }
    function closeMenuModal() {
      if (!cfg.modal || !_menuModalOpen) return;
      _menuModalOpen = false;
      $menuOverlay.removeClass("rm-menu-overlay--open");
      jQuery("body").css("overflow", "");
      jQuery(document).off("keydown.rmmenumodal");
    }
    if (cfg.modal) {
      $menuOverlay.on("click", function (e) {
        if (e.target === $menuOverlay[0]) closeMenuModal();
      });
    }

    // ── Keep --rm-table-slot-h in sync so .rm-right top/max-height stay correct
    var $slot = $shell.find("." + MenuRender.ns("table-slot"));
    function _syncSlotHeight() {
      var h = $slot.outerHeight() || 0;
      // Include the 16px gap between slot and body.
      $root[0].style.setProperty("--rm-table-slot-h", (h + 16) + "px");
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

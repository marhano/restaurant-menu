/*!
 * restaurant-menu.js v0.0.1
 * Restaurant Menu & Basket Library
 * Built: 2026-05-02T04:22:34.607Z
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
    showImageUpdate: false, // per-item button to replace the card image
    showSendOrderButton: true,
    showNextServingButton: true,
    showTotals: true,

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
    onImageUpdate: null, // (itemId, setImage) — user calls setImage(src) to apply the new image
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
  // Per-section serving counters: { sectionId: currentServingNumber }
  var _sectionServings = {};

  // Basket lines: { lineId, item, qty, note, sectionId, serving }
  var _basket = [];
  var _existingOrder = [];
  var _lineSeq = 1;

  // ── Setup ─────────────────────────────────────────

  function _initSectionServings(sections) {
    var next = {};
    (sections || []).forEach(function (s) {
      next[s.id] = _sectionServings[s.id] || 1;
    });
    _sectionServings = next;
  }

  function init(cfg) {
    _cfg = cfg;
    _table = cfg.table ? jQuery.extend(true, {}, cfg.table) : null;
    _basket = [];
    _existingOrder = [];
    _lineSeq = 1;
    _sectionServings = {};
    (cfg.basketSections || []).forEach(function (s) { _sectionServings[s.id] = 1; });
    _search = "";
    _filters = jQuery.extend(true, { minPrice: null, maxPrice: null, sort: "default" }, cfg.filters || {});
    _activeCategoryId = (cfg.categories && cfg.categories[0]) ? cfg.categories[0].id : null;
    _activeSubcategoryId = null;
    _activeSectionId = cfg.defaultBasketSection;
  }

  function reset() {
    _cfg = null;
    _basket = [];
    _existingOrder = [];
    _lineSeq = 1;
    _sectionServings = {};
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

  function updateItemImage(itemId, src) {
    if (!_cfg) return;
    var item = getItemById(itemId);
    if (!item) return;
    item.image = src || "";
    _basket.forEach(function (l) { if (l.item.id === itemId) l.item.image = src || ""; });
    MenuEvents.emit("item:imageUpdated", { itemId: itemId, src: src });
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
    // Preserve serving counters for existing sections, add new ones at 1
    _initSectionServings(_cfg.basketSections);
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
   *   - reset all section servings to 1
   */
  function startNewOrder(table) {
    _table = table ? jQuery.extend(true, {}, table) : null;
    _basket = [];
    _existingOrder = [];
    _lineSeq = 1;
    Object.keys(_sectionServings).forEach(function (k) { _sectionServings[k] = 1; });
    MenuEvents.emit("table:changed", _table);
    MenuEvents.emit("basket:changed", { reason: "clear" });
    MenuEvents.emit("existingOrder:changed");
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

    // Scan all categories to find the subcategory and its parent.
    // Subcategory basketSection wins; if absent, use the parent category's.
    if (item && item.subcategoryId) {
      var cats = getCategories();
      for (var i = 0; i < cats.length; i++) {
        var subs = cats[i].subcategories || [];
        var sub = subs.find(function (s) { return s.id === item.subcategoryId; });
        if (sub) {
          if (sub.basketSection) return sub.basketSection;
          if (cats[i].basketSection) return cats[i].basketSection;
          break;
        }
      }
    }

    var cat = getCategory(item && item.categoryId);
    if (cat && cat.basketSection) return cat.basketSection;
    return _cfg.defaultBasketSection;
  }

  // ── Basket ops ────────────────────────────────────

  function getBasket() { return _basket.slice(); }

  function getBasketBySection(sectionId) {
    var cur = _sectionServings[sectionId] || 1;
    return _basket.filter(function (l) { return l.sectionId === sectionId && l.serving === cur; });
  }

  function getCurrentBasket() {
    return _basket.filter(function (l) {
      var cur = _sectionServings[l.sectionId] || 1;
      return l.serving === cur;
    });
  }

  /**
   * Returns past (completed) servings for a section, sorted ascending.
   * sectionId defaults to the active section when omitted.
   */
  function getServings(sectionId) {
    var sid = sectionId || _activeSectionId;
    var cur = _sectionServings[sid] || 1;
    var groups = {};
    _basket.forEach(function (l) {
      if (l.sectionId === sid && l.serving < cur) {
        if (!groups[l.serving]) groups[l.serving] = [];
        groups[l.serving].push(l);
      }
    });
    return Object.keys(groups).map(Number).sort(function (a, b) { return a - b; }).map(function (n) {
      return { serving: n, lines: groups[n] };
    });
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

  // Returns true if a past serving was emptied and renumbering occurred.
  function _cleanupServingIfEmpty(sectionId, servingNum) {
    var cur = _sectionServings[sectionId] || 1;
    if (servingNum >= cur) return false; // current serving — nothing to renumber
    var hasLines = false;
    for (var i = 0; i < _basket.length; i++) {
      if (_basket[i].sectionId === sectionId && _basket[i].serving === servingNum) {
        hasLines = true; break;
      }
    }
    if (hasLines) return false;
    // Shift all higher serving numbers down by 1 for this section
    _basket.forEach(function (l) {
      if (l.sectionId === sectionId && l.serving > servingNum) l.serving -= 1;
    });
    _sectionServings[sectionId] = cur - 1;
    return true;
  }

  function _findLine(itemId, sectionId) {
    var cur = _sectionServings[sectionId] || 1;
    return _basket.find(function (l) {
      return l.item.id === itemId && l.sectionId === sectionId && l.serving === cur && !l.note;
    }) || null;
  }

  function addItem(itemId, overrideSectionId) {
    var item = getItemById(itemId);
    if (!item) return null;
    var sectionId = resolveSection(item, overrideSectionId);

    // Stack if an un-noted line for same item+section+serving exists
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
      sectionId: sectionId,
      serving: _sectionServings[sectionId] || 1
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
      var renumbered = _cleanupServingIfEmpty(l.sectionId, l.serving);
      MenuEvents.emit("basket:changed", { line: l, reason: renumbered ? "clear" : "remove" });
    } else {
      MenuEvents.emit("basket:changed", { line: l, reason: "qty" });
    }
  }

  function removeLine(lineId) {
    var idx = _basket.findIndex(function (x) { return x.lineId === lineId; });
    if (idx === -1) return;
    var removed = _basket.splice(idx, 1)[0];
    var renumbered = _cleanupServingIfEmpty(removed.sectionId, removed.serving);
    MenuEvents.emit("basket:changed", { line: removed, reason: renumbered ? "clear" : "remove" });
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

  function clearSection(sectionId) {
    var cur = _sectionServings[sectionId] || 1;
    var before = _basket.length;
    _basket = _basket.filter(function (l) {
      return !(l.sectionId === sectionId && l.serving === cur);
    });
    if (_basket.length !== before) {
      MenuEvents.emit("basket:changed", { reason: "clear" });
    }
  }

  /**
   * Remove a completed serving for a section and renumber remaining ones.
   * If serving 1 of 3 is removed: [1,2,3] → [1,2] (former 2→1, former 3→2).
   */
  function removeServing(n, sectionId) {
    var sid = sectionId || _activeSectionId;
    _basket = _basket.filter(function (l) { return !(l.sectionId === sid && l.serving === n); });
    // Shift higher serving numbers down by 1 for this section
    _basket.forEach(function (l) {
      if (l.sectionId === sid && l.serving > n) l.serving -= 1;
    });
    // Adjust the current serving counter
    if ((_sectionServings[sid] || 1) > n) {
      _sectionServings[sid] = (_sectionServings[sid] || 1) - 1;
    }
    MenuEvents.emit("basket:changed", { reason: "clear" });
  }

  // ── Drag-and-drop basket ops ──────────────────────

  function mergeLines(fromLineId, toLineId) {
    var fromIdx = -1, toLine = null;
    for (var i = 0; i < _basket.length; i++) {
      if (_basket[i].lineId === fromLineId) fromIdx = i;
      if (_basket[i].lineId === toLineId) toLine = _basket[i];
    }
    if (fromIdx === -1 || !toLine) return;
    toLine.qty += _basket[fromIdx].qty;
    var removed = _basket.splice(fromIdx, 1)[0];
    _cleanupServingIfEmpty(removed.sectionId, removed.serving);
    MenuEvents.emit("basket:changed", { reason: "clear" });
  }

  function moveLine(fromLineId, toLineId) {
    var fromIdx = -1, toIdx = -1;
    for (var i = 0; i < _basket.length; i++) {
      if (_basket[i].lineId === fromLineId) fromIdx = i;
      if (_basket[i].lineId === toLineId) toIdx = i;
    }
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    var fromLine = _basket[fromIdx];
    var toLine = _basket[toIdx];
    var oldServing = fromLine.serving;
    var oldSectionId = fromLine.sectionId;
    fromLine.serving = toLine.serving;
    fromLine.sectionId = toLine.sectionId;
    _basket.splice(fromIdx, 1);
    var newToIdx = -1;
    for (var j = 0; j < _basket.length; j++) {
      if (_basket[j].lineId === toLineId) { newToIdx = j; break; }
    }
    if (newToIdx !== -1) _basket.splice(newToIdx, 0, fromLine);
    else _basket.push(fromLine);
    _cleanupServingIfEmpty(oldSectionId, oldServing);
    MenuEvents.emit("basket:changed", { reason: "clear" });
  }

  function moveLineToServing(fromLineId, targetServing, targetSectionId) {
    var fromIdx = -1;
    for (var i = 0; i < _basket.length; i++) {
      if (_basket[i].lineId === fromLineId) { fromIdx = i; break; }
    }
    if (fromIdx === -1) return;
    var fromLine = _basket[fromIdx];
    var sid = targetSectionId || fromLine.sectionId;
    if (fromLine.serving === targetServing && fromLine.sectionId === sid) return;
    var oldServing = fromLine.serving;
    var oldSectionId = fromLine.sectionId;
    var existing = null;
    for (var k = 0; k < _basket.length; k++) {
      var l = _basket[k];
      if (l.lineId !== fromLineId && l.sectionId === sid && l.serving === targetServing && l.item.id === fromLine.item.id) {
        existing = l; break;
      }
    }
    if (existing) {
      existing.qty += fromLine.qty;
      _basket.splice(fromIdx, 1);
    } else {
      fromLine.serving = targetServing;
      fromLine.sectionId = sid;
    }
    _cleanupServingIfEmpty(oldSectionId, oldServing);
    MenuEvents.emit("basket:changed", { reason: "clear" });
  }

  function reorderServings(fromN, toN, sectionId) {
    var sid = sectionId || _activeSectionId;
    var cur = _sectionServings[sid] || 1;
    fromN = Math.max(1, Math.min(fromN, cur - 1));
    toN   = Math.max(1, Math.min(toN,   cur - 1));
    if (fromN === toN) return;
    var TEMP = -1;
    _basket.forEach(function (l) {
      if (l.sectionId === sid && l.serving === fromN) l.serving = TEMP;
    });
    if (fromN > toN) {
      _basket.forEach(function (l) {
        if (l.sectionId === sid && l.serving >= toN && l.serving < fromN) l.serving += 1;
      });
    } else {
      _basket.forEach(function (l) {
        if (l.sectionId === sid && l.serving > fromN && l.serving <= toN) l.serving -= 1;
      });
    }
    _basket.forEach(function (l) {
      if (l.sectionId === sid && l.serving === TEMP) l.serving = toN;
    });
    MenuEvents.emit("basket:changed", { reason: "clear" });
  }

  function clearBasket() {
    _basket = [];
    _lineSeq = 1;
    Object.keys(_sectionServings).forEach(function (k) { _sectionServings[k] = 1; });
    MenuEvents.emit("basket:changed", { reason: "clear" });
  }

  /**
   * Bulk-load lines into the existing-order slot.
   * Each entry: { ProductId, Quantity, Note }
   * Unknown ProductIds are silently skipped.
   */
  function setBasket(lines) {
    _existingOrder = [];
    if (!Array.isArray(lines)) {
      MenuEvents.emit("existingOrder:changed");
      return;
    }
    lines.forEach(function (entry) {
      var item = getItemById(entry.ProductId);
      if (!item) {
        console.warn("[RestaurantMenu] loadBasket: no item found for ProductId=", entry.ProductId);
        return;
      }
      var qty = Math.max(1, parseInt(entry.Quantity, 10) || 1);
      var existing = _existingOrder.find(function (l) { return l.item.id === item.id; });
      if (existing) {
        existing.qty += qty;
        return;
      }
      _existingOrder.push({
        lineId: "EL" + (_lineSeq++),
        item: jQuery.extend(true, {}, item),
        qty: qty,
        note: entry.Note || "",
        sectionId: resolveSection(item, null)
      });
    });
    MenuEvents.emit("existingOrder:changed");
  }

  function getExistingOrder() { return _existingOrder.slice(); }

  function clearExistingOrder() {
    _existingOrder = [];
    MenuEvents.emit("existingOrder:changed");
  }

  // ── Table & serving ───────────────────────────────

  function getTable() { return _table ? jQuery.extend(true, {}, _table) : null; }

  function setTable(t) {
    _table = t ? jQuery.extend(true, {}, t) : null;
    MenuEvents.emit("table:changed", _table);
  }

  /** Returns the current serving number for a section (defaults to active section). */
  function getServing(sectionId) {
    var sid = sectionId || _activeSectionId;
    return _sectionServings[sid] || 1;
  }

  function setServing(n, sectionId) {
    var sid = sectionId || _activeSectionId;
    _sectionServings[sid] = Math.max(1, parseInt(n, 10) || 1);
    MenuEvents.emit("serving:changed", _sectionServings[sid]);
  }

  /**
   * Seals the current serving for a section and starts the next one.
   * sectionId defaults to the active section.
   * No-ops if the current serving for that section is empty.
   */
  function nextServing(sectionId) {
    var sid = sectionId || _activeSectionId;
    if (!getBasketBySection(sid).length) return _sectionServings[sid] || 1;
    _sectionServings[sid] = (_sectionServings[sid] || 1) + 1;
    MenuEvents.emit("basket:changed", { reason: "clear" });
    MenuEvents.emit("serving:changed", _sectionServings[sid]);
    return _sectionServings[sid];
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
    updateItemImage: updateItemImage,
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
    getExistingOrder: getExistingOrder,
    clearExistingOrder: clearExistingOrder,
    getBasket: getBasket,
    getCurrentBasket: getCurrentBasket,
    getBasketBySection: getBasketBySection,
    getBasketTotal: getBasketTotal,
    getSectionTotal: getSectionTotal,
    getServings: getServings,
    addItem: addItem,
    setBasket: setBasket,
    incQty: incQty,
    decQty: decQty,
    removeLine: removeLine,
    setLineNote: setLineNote,
    moveLineToSection: moveLineToSection,
    mergeLines: mergeLines,
    moveLine: moveLine,
    moveLineToServing: moveLineToServing,
    reorderServings: reorderServings,
    clearSection: clearSection,
    removeServing: removeServing,
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
      $wrap.addClass(ns("table-info--empty"));
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
      if (cfg.showImageUpdate) {
        $imgBox.append(
          jQuery("<button type='button'>").addClass(ns("item-img-update"))
            .attr("title", "Update image")
            .append(jQuery("<i>").addClass("fa-solid fa-download"))
        );
        $imgBox.append(
          jQuery("<div>").addClass(ns("item-img-overlay")).append(
            jQuery("<div>").addClass(ns("item-img-spinner"))
              .html('<svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">'
                + '<circle class="' + ns("spinner-track") + '" cx="18" cy="18" r="14" fill="none" stroke-width="3"/>'
                + '<circle class="' + ns("spinner-arc") + '" cx="18" cy="18" r="14" fill="none" stroke-width="3"/>'
                + '</svg>')
          )
        );
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
      jQuery("<div>").addClass(ns("existing-order")),
      jQuery("<div>").addClass(ns("servings-list")),
      jQuery("<div>").addClass(ns("basket-list")),
      jQuery("<div>").addClass(ns("basket-footer"))
    );
  }

  function buildExistingOrderLine(line, priceText, totalText) {
    var $row = jQuery("<div>").addClass(ns("existing-order-line"));
    var $main = jQuery("<div>").addClass(ns("existing-order-line-main"));
    $main.append(jQuery("<div>").addClass(ns("existing-order-line-name")).text(line.item.name || ""));
    $main.append(jQuery("<div>").addClass(ns("existing-order-line-price")).text(priceText));
    if (line.note) {
      $main.append(
        jQuery("<div>").addClass(ns("basket-line-note"))
          .append(jQuery("<i>").addClass("fa-solid fa-pen-to-square"))
          .append(jQuery("<span>").text(line.note))
      );
    }
    $row.append($main);
    $row.append(jQuery("<div>").addClass(ns("existing-order-line-qty")).text("\xD7" + line.qty));
    $row.append(jQuery("<div>").addClass(ns("existing-order-line-total")).text(totalText));
    return $row;
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

  function buildBasketFooter(cfg, servingLabel, totalText, hideNextServing) {
    var $f = jQuery("<div>").addClass(ns("basket-footer-inner"));
    $f.append(
      jQuery("<div>").addClass(ns("basket-serving")).text(servingLabel)
    );
    if (cfg.showTotals !== false) {
      $f.append(
        jQuery("<div>").addClass(ns("basket-total"))
          .append(jQuery("<span>").addClass(ns("basket-total-label")).text("Total"))
          .append(jQuery("<span>").addClass(ns("basket-total-value")).text(totalText))
      );
    }
    var $btns = jQuery("<div>").addClass(ns("basket-btns"));
    if (cfg.showNextServingButton && !hideNextServing) {
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
    buildSubcategoryNavTabs: buildSubcategoryNavTabs,
    buildSubTabs: buildSubTabs,
    buildItemGrid: buildItemGrid,
    buildItemCard: buildItemCard,
    buildBasketPanel: buildBasketPanel,
    buildBasketSectionTab: buildBasketSectionTab,
    buildBasketLine: buildBasketLine,
    buildEmptyBasket: buildEmptyBasket,
    buildBasketFooter: buildBasketFooter,
    buildExistingOrderLine: buildExistingOrderLine
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
  var _toastTimer = null;

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
      if (line) _pulseCard(jQuery(this), line.item);
    });

    // Image update button → trigger onImageUpdate callback
    _$root.on("click", "." + ns("item-img-update"), function (e) {
      e.stopPropagation();
      var cfg = MenuCore.getConfig();
      if (typeof cfg.onImageUpdate !== "function") return;
      var $btn = jQuery(this);
      var $card = $btn.closest("." + ns("item-card"));
      var itemId = $card.attr("data-item-id");
      var $imgBox = $card.find("." + ns("item-img"));
      if ($imgBox.hasClass(ns("item-img--loading"))) return;

      $imgBox.addClass(ns("item-img--loading"));
      cfg.onImageUpdate(itemId, function (src) {
        if (!src) {
          $imgBox.removeClass(ns("item-img--loading"));
          return;
        }
        var img = new Image();
        img.onload = function () {
          var $existing = $imgBox.find("img");
          if ($existing.length) {
            $existing.attr("src", src);
          } else {
            $imgBox.find("." + ns("item-img-placeholder")).replaceWith(
              jQuery("<img>").attr({ src: src, alt: "" })
            );
          }
          $imgBox.removeClass(ns("item-img--loading"));
          MenuCore.updateItemImage(itemId, src);
        };
        img.onerror = function () {
          $imgBox.removeClass(ns("item-img--loading"));
        };
        img.src = src;
      });
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

  function _pulseCard($card, item) {
    var cls = MenuRender.ns("item-card--pulse");
    $card.removeClass(cls);
    void $card[0].offsetWidth; // force reflow so re-adding the class restarts the animation
    $card.addClass(cls);
    setTimeout(function () { $card.removeClass(cls); }, 480);
    _showAddToast(item);
  }

  function _showAddToast(item) {
    var ns = MenuRender.ns;
    if (_toastTimer) { clearTimeout(_toastTimer); _toastTimer = null; }
    jQuery("." + ns("add-toast")).remove();
    var $toast = jQuery("<div>").addClass(ns("add-toast"))
      .append(jQuery("<i>").addClass("fa-solid fa-check"))
      .append(jQuery("<span>").text(item && item.name ? item.name : "Item added"));
    jQuery("body").append($toast);
    setTimeout(function () { $toast.addClass(ns("add-toast--show")); }, 10);
    _toastTimer = setTimeout(function () {
      $toast.removeClass(ns("add-toast--show"));
      setTimeout(function () { $toast.remove(); }, 260);
    }, 2000);
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
      var line = MenuCore.addItem(itemId, sid);
      if (line) _showAddToast(line.item);
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
    _initDragDrop();

    MenuEvents.on("basket:changed", function (evt) {
      _renderHeader();
      _renderTabs();
      _renderFooter();
      _renderServings();
      _patchList(evt);
    });
    MenuEvents.on("section:changed", _renderAll);
    MenuEvents.on("sections:changed", _renderAll);
    MenuEvents.on("serving:changed", _renderFooter);
    MenuEvents.on("existingOrder:changed", function () {
      _renderExistingOrder();
      _renderFooter(); // next-serving button visibility depends on existingOrder
    });
  }

  function _renderAll() {
    _renderHeader();
    _renderTabs();
    _renderExistingOrder();
    _renderServings();
    _renderList();
    _renderFooter();
  }

  function _renderExistingOrder() {
    var ns = MenuRender.ns;
    var lines = MenuCore.getExistingOrder();
    var $slot = _$root.find("." + ns("existing-order")).empty();

    if (!lines.length) return;

    var count = lines.reduce(function (s, l) { return s + l.qty; }, 0);
    var $toggle = jQuery("<button type='button'>").addClass(ns("existing-order-toggle"))
      .append(jQuery("<i>").addClass("fa-solid fa-clock-rotate-left"))
      .append(jQuery("<span>").text("Previous Order"))
      .append(jQuery("<span>").addClass(ns("existing-order-count")).text(count + " item" + (count !== 1 ? "s" : "")))
      .append(jQuery("<i>").addClass("fa-solid fa-chevron-down " + ns("existing-order-chevron")));
    $slot.append($toggle);

    var $body = jQuery("<div>").addClass(ns("existing-order-body"));
    lines.forEach(function (l) {
      var price = MenuCore.formatPrice(l.item.price);
      var total = MenuCore.formatPrice((Number(l.item.price) || 0) * l.qty);
      $body.append(MenuRender.buildExistingOrderLine(l, price, total));
    });

    if (MenuCore.getConfig().showTotals !== false) {
      var grandTotal = lines.reduce(function (s, l) { return s + (Number(l.item.price) || 0) * l.qty; }, 0);
      $body.append(
        jQuery("<div>").addClass(ns("existing-order-total"))
          .append(jQuery("<span>").text("Previous total"))
          .append(jQuery("<span>").text(MenuCore.formatPrice(grandTotal)))
      );
    }
    $slot.append($body);
  }

  function _renderHeader() {
    var cfg = MenuCore.getConfig();
    var ns = MenuRender.ns;
    var $h = _$root.find("." + ns("basket-header")).empty();
    $h.append(jQuery("<i>").addClass("fa-solid fa-basket-shopping"));
    $h.append(jQuery("<span>").addClass(ns("basket-title")).text("Order"));
    var count = MenuCore.getCurrentBasket().reduce(function (s, l) { return s + l.qty; }, 0);
    if (count) $h.append(jQuery("<span>").addClass(ns("basket-count")).text(count));

    var sectionCount = MenuCore.getBasketBySection(MenuCore.getActiveSectionId()).reduce(function (s, l) { return s + l.qty; }, 0);
    if (sectionCount) {
      $h.append(
        jQuery("<button type='button'>").addClass(ns("basket-clear-section"))
          .attr("title", "Remove all from this section")
          .append(jQuery("<i>").addClass("fa-solid fa-trash-can"))
          .append(jQuery("<span>").text("Remove all"))
      );
    }

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

  function _renderServings() {
    var ns = MenuRender.ns;
    var cfg = MenuCore.getConfig();
    var activeSectionId = MenuCore.getActiveSectionId();
    var servings = MenuCore.getServings(activeSectionId);
    var $slot = _$root.find("." + ns("servings-list"));

    // Preserve which accordions are open before re-rendering
    var openSet = {};
    $slot.find("." + ns("serving-acc--open")).each(function () {
      openSet[jQuery(this).attr("data-serving")] = true;
    });

    $slot.empty();
    if (!servings.length) return;

    servings.forEach(function (sg) {
      var count = sg.lines.reduce(function (s, l) { return s + l.qty; }, 0);
      var rawTotal = sg.lines.reduce(function (s, l) { return s + (Number(l.item.price) || 0) * l.qty; }, 0);

      var $acc = jQuery("<div>").addClass(ns("serving-acc")).attr("data-serving", sg.serving);
      if (openSet[String(sg.serving)]) $acc.addClass(ns("serving-acc--open"));

      // Toggle button
      var $toggle = jQuery("<button type='button'>").addClass(ns("serving-acc-toggle"));
      $toggle.append(jQuery("<span>").addClass(ns("serving-acc-num")).text(sg.serving));
      $toggle.append(jQuery("<span>").addClass(ns("serving-acc-label")).text("Serving " + sg.serving));
      $toggle.append(jQuery("<span>").addClass(ns("serving-acc-count")).text(count + " item" + (count !== 1 ? "s" : "")));
      if (cfg.showTotals !== false) {
        $toggle.append(jQuery("<span>").addClass(ns("serving-acc-total")).text(MenuCore.formatPrice(rawTotal)));
      }
      $toggle.append(jQuery("<i>").addClass("fa-solid fa-chevron-down " + ns("serving-acc-chevron")));

      // Remove serving button — data-section-id lets the handler know which section
      var $removeBtn = jQuery("<button type='button'>").addClass(ns("serving-remove"))
        .attr("title", "Remove serving")
        .attr("data-serving", sg.serving)
        .attr("data-section-id", activeSectionId)
        .append(jQuery("<i>").addClass("fa-solid fa-trash-can"));

      var $handle = jQuery("<button type='button'>").addClass(ns("serving-acc-handle"))
        .attr("aria-label", "Drag to reorder").attr("title", "Drag to reorder")
        .append(jQuery("<i>").addClass("fa-solid fa-grip-vertical"));

      $acc.append(jQuery("<div>").addClass(ns("serving-acc-header")).append($handle, $toggle, $removeBtn));

      // Body — ALL servings are fully editable
      var $body = jQuery("<div>").addClass(ns("serving-acc-body"));
      sg.lines.forEach(function (l) {
        var price = MenuCore.formatPrice(l.item.price);
        var lineTotal = MenuCore.formatPrice((Number(l.item.price) || 0) * l.qty);
        var $row = jQuery("<div>").addClass(ns("serving-line")).attr("data-line-id", l.lineId);

        var $main = jQuery("<div>").addClass(ns("serving-line-main"));
        $main.append(jQuery("<div>").addClass(ns("serving-line-name")).text(l.item.name || ""));
        $main.append(jQuery("<div>").addClass(ns("serving-line-price")).text(price));
        if (l.note) {
          $main.append(
            jQuery("<div>").addClass(ns("basket-line-note"))
              .append(jQuery("<i>").addClass("fa-solid fa-pen-to-square"))
              .append(jQuery("<span>").text(l.note))
          );
        }
        $row.append($main);

        var $qty = jQuery("<div>").addClass(ns("qty-ctrl"));
        $qty.append(jQuery("<button>").addClass(ns("serving-qty-dec")).append(jQuery("<i>").addClass("fa-solid fa-minus")));
        $qty.append(jQuery("<span>").addClass(ns("qty-val")).text(l.qty));
        $qty.append(jQuery("<button>").addClass(ns("serving-qty-inc")).append(jQuery("<i>").addClass("fa-solid fa-plus")));
        $row.append($qty);

        $row.append(jQuery("<div>").addClass(ns("serving-line-total")).text(lineTotal));

        var $actions = jQuery("<div>").addClass(ns("serving-line-actions"));
        $actions.append(
          jQuery("<button>").addClass(ns("serving-line-edit")).attr("title", cfg.labels.edit || "Edit")
            .append(jQuery("<i>").addClass("fa-solid fa-pen"))
        );
        $actions.append(
          jQuery("<button>").addClass(ns("serving-line-remove")).attr("title", cfg.labels.remove || "Remove")
            .append(jQuery("<i>").addClass("fa-solid fa-trash-can"))
        );
        $row.append($actions);

        $body.append($row);
      });

      $acc.append($body);
      $slot.append($acc);
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

    // Line belongs to a past serving for its section — _renderServings() already handled it.
    if (line.serving !== undefined && line.serving !== MenuCore.getServing(line.sectionId)) return;

    // Line belongs to a different section than the one currently shown
    if (line.sectionId !== active) return;

    var $existing = $list.find("." + ns("basket-line") +
      "[data-line-id='" + line.lineId + "']");

    if (evt.reason === "add") {
      $list.find("." + ns("basket-empty")).remove();
      var listEl = $list[0];
      listEl.scrollTop = listEl.scrollHeight;
      var price = MenuCore.formatPrice(line.item.price);
      var total = MenuCore.formatPrice((Number(line.item.price) || 0) * line.qty);
      var $new = MenuRender.buildBasketLine(line, price, total, cfg.labels)
        .addClass(ns("basket-line--enter"));
      $list.append($new);
      listEl.scrollTop = listEl.scrollHeight;
      setTimeout(function () { $new.removeClass(ns("basket-line--enter")); }, 360);
      return;
    }

    if (evt.reason === "remove") {
      if (!$existing.length) { _renderList(); return; }
      var el = $existing[0];
      var h = el.offsetHeight;
      el.style.height = h + "px";
      el.style.overflow = "hidden";
      el.style.transition = "height 0.26s cubic-bezier(0.55,0,0.68,0.2), opacity 0.22s ease, transform 0.26s cubic-bezier(0.55,0,0.68,0.2)";
      // Force reflow so transition picks up the pinned height
      void el.offsetHeight;
      el.style.height = "0px";
      el.style.opacity = "0";
      el.style.transform = "translateX(28px)";
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
    var hasExistingOrder = MenuCore.getExistingOrder().length > 0;
    var $f = _$root.find("." + MenuRender.ns("basket-footer")).empty();
    var activeSectionId = MenuCore.getActiveSectionId();
    var servingLabel = "Serving #" + MenuCore.getServing(activeSectionId);
    var sectionTotal = MenuCore.getSectionTotal(activeSectionId);
    $f.append(MenuRender.buildBasketFooter(cfg, servingLabel, MenuCore.formatPrice(sectionTotal), hasExistingOrder));
  }

  function _bind() {
    var ns = MenuRender.ns;
    var cfg = MenuCore.getConfig();

    _$root.on("click", "." + ns("basket-tab"), function () {
      MenuCore.setActiveSection(jQuery(this).attr("data-section-id"));
    });

    _$root.on("click", "." + ns("basket-clear-section"), function () {
      MenuCore.clearSection(MenuCore.getActiveSectionId());
    });

    _$root.on("click", "." + ns("existing-order-toggle"), function () {
      _$root.find("." + ns("existing-order")).toggleClass(ns("existing-order--open"));
    });

    // Serving accordion toggle
    _$root.on("click", "." + ns("serving-acc-toggle"), function () {
      jQuery(this).closest("." + ns("serving-acc")).toggleClass(ns("serving-acc--open"));
    });

    // Remove entire serving (section id is stored on the button)
    _$root.on("click", "." + ns("serving-remove"), function (e) {
      e.stopPropagation();
      var n = parseInt(jQuery(this).attr("data-serving"), 10);
      var sid = jQuery(this).attr("data-section-id") || MenuCore.getActiveSectionId();
      MenuCore.removeServing(n, sid);
    });

    // Serving line qty / edit / remove (last serving only, controls only rendered there)
    _$root.on("click", "." + ns("serving-qty-inc"), function () {
      var id = jQuery(this).closest("." + ns("serving-line")).attr("data-line-id");
      MenuCore.incQty(id);
    });
    _$root.on("click", "." + ns("serving-qty-dec"), function () {
      var id = jQuery(this).closest("." + ns("serving-line")).attr("data-line-id");
      MenuCore.decQty(id);
    });
    _$root.on("click", "." + ns("serving-line-remove"), function () {
      var id = jQuery(this).closest("." + ns("serving-line")).attr("data-line-id");
      MenuCore.removeLine(id);
    });
    _$root.on("click", "." + ns("serving-line-edit"), function () {
      var id = jQuery(this).closest("." + ns("serving-line")).attr("data-line-id");
      var line = MenuCore.getBasket().find(function (x) { return x.lineId === id; });
      if (line) MenuEditLine.open(line);
    });

    // Current serving basket controls
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
      var sid = MenuCore.getActiveSectionId();
      var basket = MenuCore.getBasketBySection(sid);
      if (typeof cfg.onNextServing === "function") cfg.onNextServing(basket);
      MenuCore.nextServing(sid);
    });

    _$root.on("click", "." + ns("btn-send-order"), function () {
      var servingsBySection = {};
      MenuCore.getBasketSections().forEach(function (s) {
        var all = MenuCore.getServings(s.id).slice();   // completed servings
        var current = MenuCore.getBasketBySection(s.id); // active serving items
        if (current.length) all.push({ serving: MenuCore.getServing(s.id), lines: current });
        if (all.length) servingsBySection[s.id] = all;
      });
      var rawBasket = MenuCore.getBasket();
      var basketMap = {};
      var basketOrder = [];
      rawBasket.forEach(function (l) {
        var key = l.item.id;
        if (basketMap[key]) {
          basketMap[key].qty += l.qty;
        } else {
          basketMap[key] = jQuery.extend(true, {}, l);
          basketOrder.push(key);
        }
      });
      var mergedBasket = basketOrder.map(function (k) { return basketMap[k]; });

      var order = {
        table: MenuCore.getTable(),
        basket: mergedBasket,
        servings: servingsBySection,
        existingOrder: MenuCore.getExistingOrder(),
        total: MenuCore.getBasketTotal()
      };
      if (typeof cfg.onSendOrder === "function") {
        cfg.onSendOrder(order, function () { MenuCore.clearBasket(); });
      } else {
        MenuCore.clearBasket();
      }
    });
  }

  function _initDragDrop() {
    var ns = MenuRender.ns;
    var LINE_SEL = "." + ns("basket-line") + ", ." + ns("serving-line");
    var dragState = null;

    // ── Shared helpers ────────────────────────────────

    function startDrag($el, lineId, clientX, clientY) {
      var rect = $el[0].getBoundingClientRect();
      var $ghost = $el.clone().css({
        position: "fixed",
        left: rect.left, top: rect.top, width: rect.width,
        zIndex: 9999, opacity: 0.88, pointerEvents: "none",
        boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
        borderRadius: "8px", margin: 0, transition: "none",
        background: "var(--rm-surface)", border: "1px solid var(--rm-border)"
      }).addClass(ns("drag-ghost"));
      jQuery("body").append($ghost);
      $el.addClass(ns("dragging"));
      dragState = {
        lineId: lineId, $ghost: $ghost,
        offsetX: clientX - rect.left, offsetY: clientY - rect.top
      };
    }

    function elAt(x, y) {
      if (!dragState || !dragState.$ghost) return document.elementFromPoint(x, y);
      var ghost = dragState.$ghost[0];
      ghost.style.visibility = "hidden";
      var el = document.elementFromPoint(x, y);
      ghost.style.visibility = "";
      return el;
    }

    function highlight(x, y) {
      _$root.find("." + ns("drag-over")).removeClass(ns("drag-over"));
      var el = elAt(x, y);
      if (!el || !dragState) return;
      var $line = jQuery(el).closest(LINE_SEL);
      if ($line.length && $line.attr("data-line-id") !== dragState.lineId) {
        $line.addClass(ns("drag-over")); return;
      }
      var $acc = jQuery(el).closest("." + ns("serving-acc"));
      if ($acc.length) { $acc.addClass(ns("drag-over")); return; }
      var $bl = jQuery(el).closest("." + ns("basket-list"));
      if ($bl.length) $bl.addClass(ns("drag-over"));
    }

    function cancelDrag() {
      if (!dragState) return;
      dragState.$ghost.remove();
      _$root.find("." + ns("drag-over")).removeClass(ns("drag-over"));
      _$root.find("." + ns("dragging")).removeClass(ns("dragging"));
      dragState = null;
    }

    function commitDrop(x, y) {
      if (!dragState) return;
      var savedLineId = dragState.lineId;
      cancelDrag();
      var el = document.elementFromPoint(x, y);
      if (!el) return;

      var $line = jQuery(el).closest(LINE_SEL);
      if ($line.length) {
        var toLineId = $line.attr("data-line-id");
        if (toLineId && toLineId !== savedLineId) {
          var basket = MenuCore.getBasket();
          var fromLine = null, toLine = null;
          for (var i = 0; i < basket.length; i++) {
            if (basket[i].lineId === savedLineId) fromLine = basket[i];
            if (basket[i].lineId === toLineId) toLine = basket[i];
          }
          if (fromLine && toLine) {
            if (fromLine.item.id === toLine.item.id) MenuCore.mergeLines(savedLineId, toLineId);
            else MenuCore.moveLine(savedLineId, toLineId);
          }
        }
        return;
      }

      var $acc = jQuery(el).closest("." + ns("serving-acc"));
      if ($acc.length) {
        var n = parseInt($acc.attr("data-serving"), 10);
        if (!isNaN(n)) {
          var accSid = MenuCore.getActiveSectionId();
          var accDup = _findDupInServing(savedLineId, accSid, n);
          if (accDup) MenuCore.mergeLines(savedLineId, accDup.lineId);
          else MenuCore.moveLineToServing(savedLineId, n, accSid);
        }
        return;
      }

      var $bl = jQuery(el).closest("." + ns("basket-list"));
      if ($bl.length) {
        var blSid = MenuCore.getActiveSectionId();
        var blServing = MenuCore.getServing(blSid);
        var blDup = _findDupInServing(savedLineId, blSid, blServing);
        if (blDup) MenuCore.mergeLines(savedLineId, blDup.lineId);
        else MenuCore.moveLineToServing(savedLineId, blServing, blSid);
      }
    }

    function _findDupInServing(lineId, sectionId, serving) {
      var basket = MenuCore.getBasket();
      var fromLine = null;
      for (var i = 0; i < basket.length; i++) {
        if (basket[i].lineId === lineId) { fromLine = basket[i]; break; }
      }
      if (!fromLine) return null;
      for (var i = 0; i < basket.length; i++) {
        var l = basket[i];
        if (l.lineId !== lineId && l.sectionId === sectionId && l.serving === serving && l.item.id === fromLine.item.id) {
          return l;
        }
      }
      return null;
    }

    // ── Mouse / pen (Pointer Events, excludes touch) ──

    _$root.on("pointerdown", LINE_SEL, function (e) {
      var ne = e.originalEvent;
      if (ne.pointerType === "touch") return; // touch handled below
      if (ne.button !== 0) return;
      if (jQuery(ne.target).closest("button, input, select").length) return;
      if (dragState) return;

      var $el = jQuery(this);
      var lineId = $el.attr("data-line-id");
      if (!lineId) return;

      var sx = ne.clientX, sy = ne.clientY;
      var timer = setTimeout(function () { startDrag($el, lineId, sx, sy); }, 220);

      jQuery(document)
        .on("pointermove.rmdnd", function (e2) {
          var r = e2.originalEvent; var x = r.clientX, y = r.clientY;
          if (!dragState) {
            if (Math.abs(x - sx) > 8 || Math.abs(y - sy) > 8) {
              clearTimeout(timer); jQuery(document).off(".rmdnd");
            }
            return;
          }
          dragState.$ghost.css({ left: x - dragState.offsetX, top: y - dragState.offsetY });
          highlight(x, y);
        })
        .on("pointerup.rmdnd", function (e2) {
          clearTimeout(timer); jQuery(document).off(".rmdnd");
          if (!dragState) return;
          var r = e2.originalEvent; commitDrop(r.clientX, r.clientY);
        })
        .on("pointercancel.rmdnd", function () {
          clearTimeout(timer); jQuery(document).off(".rmdnd"); cancelDrag();
        });
    });

    // ── Touch (mobile) ────────────────────────────────
    // Uses native listeners so touchmove can be registered non-passive,
    // allowing preventDefault() to block scroll once drag activates.

    _$root.on("touchstart", LINE_SEL, function (e) {
      var ne = e.originalEvent;
      if (jQuery(ne.target).closest("button, input, select").length) return;
      if (dragState) return;

      var $el = jQuery(this);
      var lineId = $el.attr("data-line-id");
      if (!lineId) return;

      var t0 = ne.touches[0];
      var sx = t0.clientX, sy = t0.clientY;
      var timer = null, fired = false;

      timer = setTimeout(function () {
        fired = true;
        startDrag($el, lineId, sx, sy);
      }, 220);

      function onTouchMove(e2) {
        var t = e2.changedTouches[0];
        if (!fired) {
          if (Math.abs(t.clientX - sx) > 8 || Math.abs(t.clientY - sy) > 8) {
            clearTimeout(timer); cleanup();
          }
          return;
        }
        if (!dragState) return;
        e2.preventDefault(); // prevents scroll while dragging
        dragState.$ghost.css({ left: t.clientX - dragState.offsetX, top: t.clientY - dragState.offsetY });
        highlight(t.clientX, t.clientY);
      }

      function onTouchEnd(e2) {
        clearTimeout(timer); cleanup();
        if (!dragState) return;
        var t = e2.changedTouches[0];
        commitDrop(t.clientX, t.clientY);
      }

      function onTouchCancel() {
        clearTimeout(timer); cleanup(); cancelDrag();
      }

      function cleanup() {
        document.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("touchend", onTouchEnd);
        document.removeEventListener("touchcancel", onTouchCancel);
      }

      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", onTouchEnd);
      document.addEventListener("touchcancel", onTouchCancel);
    });

    // ── Accordion reorder ─────────────────────────────
    var HANDLE_SEL = "." + ns("serving-acc-handle");

    function getAccInsertInfo(y) {
      var $accs = _$root.find("." + ns("servings-list") + " ." + ns("serving-acc"));
      if (!$accs.length) return null;
      var result = { serving: parseInt($accs.last().attr("data-serving"), 10), pos: "after" };
      for (var ai = 0; ai < $accs.length; ai++) {
        var rect = $accs[ai].getBoundingClientRect();
        if (y <= rect.top + rect.height / 2) {
          result = { serving: parseInt(jQuery($accs[ai]).attr("data-serving"), 10), pos: "before" };
          break;
        }
      }
      return result;
    }

    function highlightAccInsert(y) {
      _$root.find("." + ns("acc-insert-before") + ", ." + ns("acc-insert-after"))
            .removeClass(ns("acc-insert-before") + " " + ns("acc-insert-after"));
      var info = getAccInsertInfo(y);
      if (!info) return;
      _$root.find("." + ns("serving-acc") + "[data-serving='" + info.serving + "']")
            .addClass(ns("acc-insert-" + info.pos));
    }

    function commitAccDrop(y, fromN, sid) {
      _$root.find("." + ns("acc-insert-before") + ", ." + ns("acc-insert-after"))
            .removeClass(ns("acc-insert-before") + " " + ns("acc-insert-after"));
      _$root.find("." + ns("dragging")).removeClass(ns("dragging"));
      var info = getAccInsertInfo(y);
      if (!info) return;
      var cur = MenuCore.getServing(sid);
      var insertBefore = info.pos === "before" ? info.serving : null;
      var toN;
      if (insertBefore === null) {
        toN = cur - 1;
      } else if (fromN < insertBefore) {
        toN = insertBefore - 1;
      } else if (fromN > insertBefore) {
        toN = insertBefore;
      } else {
        return;
      }
      if (toN !== fromN && toN >= 1 && toN < cur) {
        MenuCore.reorderServings(fromN, toN, sid);
      }
    }

    function makeAccGhost($acc) {
      var rect = $acc[0].getBoundingClientRect();
      return $acc.find("." + ns("serving-acc-header")).clone().css({
        position: "fixed", left: rect.left, width: rect.width,
        zIndex: 9999, opacity: 0.88, pointerEvents: "none",
        boxShadow: "0 8px 28px rgba(0,0,0,0.22)", borderRadius: "8px",
        margin: 0, transition: "none",
        background: "var(--rm-surface)", border: "1px solid var(--rm-border)"
      }).addClass(ns("drag-ghost"));
    }

    // Accordion drag — mouse/pen
    _$root.on("pointerdown", HANDLE_SEL, function (e) {
      var ne = e.originalEvent;
      if (ne.pointerType === "touch") return;
      if (ne.button !== 0) return;
      if (dragState) return;
      e.stopPropagation();

      var $acc = jQuery(this).closest("." + ns("serving-acc"));
      var fromN = parseInt($acc.attr("data-serving"), 10);
      if (isNaN(fromN)) return;
      var sid = MenuCore.getActiveSectionId();

      var $ghost = makeAccGhost($acc).css("top", ne.clientY - 20);
      jQuery("body").append($ghost);
      $acc.addClass(ns("dragging"));
      dragState = { type: "acc", $ghost: $ghost };

      jQuery(document)
        .on("pointermove.rmdndacc", function (e2) {
          var r = e2.originalEvent;
          $ghost.css("top", r.clientY - 20);
          highlightAccInsert(r.clientY);
        })
        .on("pointerup.rmdndacc", function (e2) {
          jQuery(document).off(".rmdndacc");
          $ghost.remove();
          dragState = null;
          commitAccDrop(e2.originalEvent.clientY, fromN, sid);
        })
        .on("pointercancel.rmdndacc", function () {
          jQuery(document).off(".rmdndacc");
          $ghost.remove();
          _$root.find("." + ns("acc-insert-before") + ", ." + ns("acc-insert-after"))
                .removeClass(ns("acc-insert-before") + " " + ns("acc-insert-after"));
          _$root.find("." + ns("dragging")).removeClass(ns("dragging"));
          dragState = null;
        });
    });

    // Accordion drag — touch
    _$root.on("touchstart", HANDLE_SEL, function (e) {
      if (dragState) return;
      e.stopPropagation();

      var $acc = jQuery(this).closest("." + ns("serving-acc"));
      var fromN = parseInt($acc.attr("data-serving"), 10);
      if (isNaN(fromN)) return;
      var sid = MenuCore.getActiveSectionId();
      var t0 = e.originalEvent.touches[0];

      var $ghost = makeAccGhost($acc).css("top", t0.clientY - 20);
      jQuery("body").append($ghost);
      $acc.addClass(ns("dragging"));
      dragState = { type: "acc", $ghost: $ghost };

      function onTouchMoveAcc(e2) {
        e2.preventDefault();
        var t = e2.changedTouches[0];
        $ghost.css("top", t.clientY - 20);
        highlightAccInsert(t.clientY);
      }
      function onTouchEndAcc(e2) {
        cleanupAcc();
        var t = e2.changedTouches[0];
        dragState = null;
        commitAccDrop(t.clientY, fromN, sid);
      }
      function onTouchCancelAcc() {
        cleanupAcc();
        _$root.find("." + ns("acc-insert-before") + ", ." + ns("acc-insert-after"))
              .removeClass(ns("acc-insert-before") + " " + ns("acc-insert-after"));
        _$root.find("." + ns("dragging")).removeClass(ns("dragging"));
        dragState = null;
      }
      function cleanupAcc() {
        $ghost.remove();
        document.removeEventListener("touchmove", onTouchMoveAcc);
        document.removeEventListener("touchend", onTouchEndAcc);
        document.removeEventListener("touchcancel", onTouchCancelAcc);
      }
      document.addEventListener("touchmove", onTouchMoveAcc, { passive: false });
      document.addEventListener("touchend", onTouchEndAcc);
      document.addEventListener("touchcancel", onTouchCancelAcc);
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

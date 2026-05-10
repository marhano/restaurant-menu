/**
 * MenuCore.js
 * Pure state + logic — zero DOM, zero jQuery rendering.
 * Owns: config, menu data, basket lines, active filters, table, serving.
 */
var MenuCore = (function () {
  var _cfg = null;
  var _menuRoutes = [];
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
      next[s.code] = _sectionServings[s.code] || 1;
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
    (cfg.basketSections || []).forEach(function (s) { _sectionServings[s.code] = 1; });
    _search = "";
    _filters = jQuery.extend(true, { minPrice: null, maxPrice: null, sort: "default" }, cfg.filters || {});
    var _firstActiveCat = (cfg.categories || []).filter(function (c) { return c.status !== "inactive"; })[0];
    _activeCategoryId = _firstActiveCat ? _firstActiveCat.code : null;
    _activeSubcategoryId = null;
    var _activeSecs = (cfg.basketSections || []).filter(function (s) { return s.status !== "inactive"; });
    var _defIsActive = _activeSecs.some(function (s) { return s.code === cfg.defaultBasketSection; });
    _activeSectionId = _defIsActive ? cfg.defaultBasketSection : (_activeSecs[0] ? _activeSecs[0].code : cfg.defaultBasketSection);
    _menuRoutes = Array.isArray(cfg.menuRoutes) ? cfg.menuRoutes.map(MenuConfig.normalizeRoute) : [];
  }

  function reset() {
    _cfg = null;
    _menuRoutes = [];
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
    // Reconcile active selection against active categories only
    var list = getCategories();
    var exists = list.some(function (c) { return c.code === _activeCategoryId; });
    _activeCategoryId = exists ? _activeCategoryId : (list[0] ? list[0].code : null);
    var subs = getSubcategories(_activeCategoryId);
    if (_activeSubcategoryId && !subs.some(function (s) { return s.code === _activeSubcategoryId; })) {
      _activeSubcategoryId = null;
    }
    MenuEvents.emit("menu:changed", { reason: "categories" });
  }

  function setBasketSections(sections) {
    if (!_cfg) return;
    _cfg.basketSections = Array.isArray(sections) && sections.length
      ? sections.map(MenuConfig.normalizeBasketSection) : _cfg.basketSections;
    // Reconcile active section and default against active-only sections
    var activeSecs = getBasketSections();
    var firstActiveSec = activeSecs[0];
    var ok = activeSecs.some(function (s) { return s.code === _activeSectionId; });
    if (!ok && firstActiveSec) _activeSectionId = firstActiveSec.code;
    var defaultOk = activeSecs.some(function (s) { return s.code === _cfg.defaultBasketSection; });
    if (!defaultOk && firstActiveSec) _cfg.defaultBasketSection = firstActiveSec.code;
    // Preserve serving counters for all sections (including inactive)
    _initSectionServings(_cfg.basketSections);
    // Move basket lines from removed or inactive sections to the first active section
    var validActive = {};
    activeSecs.forEach(function (s) { validActive[s.code] = true; });
    _basket.forEach(function (l) {
      if (!validActive[l.sectionId] && firstActiveSec) l.sectionId = firstActiveSec.code;
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

  function getCategories() {
    return _cfg ? (_cfg.categories || []).filter(function (c) { return c.status !== "inactive"; }) : [];
  }

  function getCategory(id) {
    return getCategories().find(function (c) { return c.code === id; }) || null;
  }

  function getSubcategories(categoryId) {
    var c = getCategory(categoryId);
    return (c && c.subcategories)
      ? c.subcategories.filter(function (s) { return s.status !== "inactive"; })
      : [];
  }

  function getAllSubcategories() {
    var out = [];
    getCategories().forEach(function (c) {
      if (Array.isArray(c.subcategories)) {
        c.subcategories.forEach(function (s) {
          if (s.status !== "inactive") out.push(s);
        });
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
      // Status filter: always applied regardless of search state.
      // Items belonging to an inactive category or inactive subcategory are hidden.
      if (it.categoryId) {
        var _allCats = _cfg ? _cfg.categories || [] : [];
        for (var _ci = 0; _ci < _allCats.length; _ci++) {
          if (_allCats[_ci].code === it.categoryId) {
            if (_allCats[_ci].status === "inactive") return false;
            break;
          }
        }
      }
      if (it.subcategoryId) {
        var _subParent = _parentCategoryOf(it.subcategoryId);
        if (_subParent) {
          if (_subParent.status === "inactive") return false;
          var _allSubs = _subParent.subcategories || [];
          for (var _si = 0; _si < _allSubs.length; _si++) {
            if (_allSubs[_si].code === it.subcategoryId) {
              if (_allSubs[_si].status === "inactive") return false;
              break;
            }
          }
        }
      }
      // When searching, scan the whole menu (ignore category/subcategory).
      if (!hasSearch) {
        if (_activeCategoryId && !_cfg.subcategoryNav) {
          var _cat = getCategory(_activeCategoryId);
          var _subIds = (_cat && Array.isArray(_cat.subcategories))
            ? _cat.subcategories.map(function (s) { return s.code; })
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

  function getBasketSections() {
    return _cfg ? (_cfg.basketSections || []).filter(function (s) { return s.status !== "inactive"; }) : [];
  }

  function getActiveSectionId() { return _activeSectionId; }

  function setActiveSection(id) {
    _activeSectionId = id;
    MenuEvents.emit("section:changed", id);
  }

  function setMenuRoutes(routes) {
    _menuRoutes = Array.isArray(routes) ? routes.map(MenuConfig.normalizeRoute) : [];
  }

  function getMenuRoutes() { return _menuRoutes.slice(); }

  function _routeFor(key) {
    for (var i = 0; i < _menuRoutes.length; i++) {
      if (_menuRoutes[i].categoryId === key && _menuRoutes[i].basketId) {
        return _menuRoutes[i].basketId;
      }
    }
    return null;
  }

  function _parentCategoryOf(subcategoryId) {
    var cats = _cfg ? _cfg.categories || [] : [];
    for (var i = 0; i < cats.length; i++) {
      var subs = cats[i].subcategories || [];
      for (var j = 0; j < subs.length; j++) {
        if (subs[j].code === subcategoryId) return cats[i];
      }
    }
    return null;
  }

  /**
   * Resolve target basket section for an item.
   * Precedence:
   *   1. Explicit override (e.g. ellipsis popover pick)
   *   2. Subcategory-level route  — route.categoryId === item.subcategoryId
   *   3. Parent category route    — route.categoryId === parentCategory.code
   *   4. defaultBasketSection
   *
   * item.categoryId is intentionally ignored — backends often send a generic
   * value (e.g. "SERVICES") for all items, making it useless for routing.
   */
  function resolveSection(item, overrideSectionId) {
    var code;
    if (overrideSectionId) {
      code = overrideSectionId;
    } else if (item && item.subcategoryId) {
      var subRoute = _routeFor(item.subcategoryId);
      if (subRoute) { code = subRoute; }
      else {
        var parent = _parentCategoryOf(item.subcategoryId);
        if (parent) {
          var catRoute = _routeFor(parent.code);
          if (catRoute) { code = catRoute; }
        }
      }
    }
    if (!code) code = _cfg.defaultBasketSection;
    // If the resolved section is inactive, fall back to the first active section
    var activeSecs = getBasketSections();
    var isActive = activeSecs.some(function (s) { return s.code === code; });
    if (!isActive && activeSecs[0]) code = activeSecs[0].code;
    return code;
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

  function clearSectionAll(sectionId) {
    var before = _basket.length;
    _basket = _basket.filter(function (l) { return l.sectionId !== sectionId; });
    _sectionServings[sectionId] = 1;
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
    setMenuRoutes: setMenuRoutes,
    getMenuRoutes: getMenuRoutes,
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
    clearSectionAll: clearSectionAll,
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

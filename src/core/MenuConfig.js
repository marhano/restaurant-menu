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
    // categories: [{ id, label, icon, status?, subcategories: [{ id, label, status? }] }]
    // status: "active" (default) | "inactive" — inactive categories hide all their subcategories.
    // A subcategory status of "inactive" hides it regardless of parent; parent "inactive" overrides child.
    categories: [],
    // items: [{ id, name, description, price, image, categoryId, subcategoryId, basketSection? }]
    items: [],

    // Basket sections — ordered tabs displayed in the basket panel
    // [{ id, code, label, icon? }]  id = backend int, code = string identifier
    basketSections: [
      { id: null, code: "kitchen", label: "Kitchen", icon: "fa-solid fa-utensils" },
      { id: null, code: "bar",     label: "Bar",     icon: "fa-solid fa-martini-glass" },
    ],
    defaultBasketSection: "kitchen",

    // Menu routes — maps categoryId → basketId (from external API)
    // [{ id, categoryId, basketId }]  also accepts PascalCase { Id, CategoryId, BasketId }
    menuRoutes: [],

    // Currency formatter
    currency: {
      symbol: "₱",
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
    var subs = _v(c.SubCategories, c.subCategories || c.subcategories);
    var rawId   = String(_v(c.Id,   c.id)   || "");
    var rawCode = String(_v(c.Code, c.code) || "");
    // Backwards compat: old format had no code, used id as the functional identifier
    if (!rawCode && rawId) { rawCode = rawId; rawId = ""; }
    return {
      id:            rawId,
      code:          rawCode,
      label:         _v(c.Label, c.label)   || "",
      icon:          _v(c.Icon,  c.icon)    || "",
      status:        (_v(c.Status, c.status) || "active").toLowerCase(),
      subcategories: Array.isArray(subs) ? subs.map(normalizeSubcategory) : []
    };
  }

  function normalizeSubcategory(s) {
    var rawId   = String(_v(s.Id,   s.id)   || "");
    var rawCode = String(_v(s.Code, s.code) || "");
    // Backwards compat: if no code supplied, use id as the functional identifier
    if (!rawCode && rawId) { rawCode = rawId; rawId = ""; }
    return {
      id:     rawId,
      code:   rawCode,
      label:  _v(s.Label, s.label) || "",
      status: (_v(s.Status, s.status) || "active").toLowerCase()
    };
  }

  function normalizeBasketSection(s) {
    var rawId   = s.Id   !== undefined ? s.Id   : s.id;
    var rawCode = s.Code !== undefined ? s.Code : s.code;
    var rawLabel = _v(s.Label, s.label) || "";
    var rawIcon  = _v(s.Icon,  s.icon)  || "";
    // Backwards compat: old format used a string id with no code field
    if ((rawCode == null || rawCode === "") && typeof rawId === "string") {
      rawCode = rawId;
      rawId   = null;
    }
    return {
      id:     (rawId != null && rawId !== "" && !isNaN(parseInt(rawId, 10))) ? parseInt(rawId, 10) : null,
      code:   String(rawCode  || ""),
      label:  String(rawLabel || ""),
      icon:   String(rawIcon  || ""),
      status: (_v(s.Status, s.status) || "active").toLowerCase()
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
      categoryId:    String(_v(it.CategoryId,    it.categoryId)    || ""),
      subcategoryId: String(_v(it.SubCategoryId, it.subcategoryId) || "")
    };
  }

  function normalizeRoute(r) {
    return {
      id:         _v(r.Id,         r.id)         || 0,
      categoryId: _v(r.CategoryId, r.categoryId) || "",
      basketId:   _v(r.BasketId,   r.basketId)   || ""
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
    // Normalize basket sections
    if (!Array.isArray(out.basketSections) || !out.basketSections.length) {
      out.basketSections = _defaults.basketSections.slice();
    } else {
      out.basketSections = out.basketSections.map(normalizeBasketSection);
    }
    if (!out.defaultBasketSection) {
      out.defaultBasketSection = out.basketSections[0].code;
    }
    return out;
  }

  return {
    merge: merge,
    normalizeCategory: normalizeCategory,
    normalizeItem: normalizeItem,
    normalizeRoute: normalizeRoute,
    normalizeBasketSection: normalizeBasketSection
  };
})();

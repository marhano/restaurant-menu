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

  function merge(userCfg) {
    var out = jQuery.extend(true, {}, _defaults, userCfg || {});
    // Normalize callable sections
    if (!Array.isArray(out.basketSections) || !out.basketSections.length) {
      out.basketSections = _defaults.basketSections.slice();
    }
    if (!out.defaultBasketSection) {
      out.defaultBasketSection = out.basketSections[0].id;
    }
    return out;
  }

  return { merge: merge };
})();

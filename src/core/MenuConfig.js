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

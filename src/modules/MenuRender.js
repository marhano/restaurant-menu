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

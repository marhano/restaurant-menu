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

      $acc.append(jQuery("<div>").addClass(ns("serving-acc-header")).append($toggle, $removeBtn));

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

  function unbind() {
    if (_$root) _$root.off();
    _$root = null;
  }

  return { build: build, unbind: unbind };
})();

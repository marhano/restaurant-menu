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
    var $h = _$root.find("." + MenuRender.ns("basket-header")).empty();
    $h.append(jQuery("<i>").addClass("fa-solid fa-basket-shopping"));
    $h.append(jQuery("<span>").addClass(MenuRender.ns("basket-title")).text("Order"));
    var count = MenuCore.getBasket().reduce(function (s, l) { return s + l.qty; }, 0);
    if (count) $h.append(jQuery("<span>").addClass(MenuRender.ns("basket-count")).text(count));
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

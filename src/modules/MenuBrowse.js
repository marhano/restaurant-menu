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

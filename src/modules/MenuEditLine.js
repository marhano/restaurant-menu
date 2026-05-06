/**
 * MenuEditLine.js
 * Modal for editing a basket line — add/edit note and move to another section.
 */
var MenuEditLine = (function () {

  var MAX_LINE_LEN = 50;

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

    // ── Note field — dynamic input lines ──────────────
    var existingLines = (line.note || "").split("\n").filter(function (l) { return l.trim() !== ""; });
    if (!existingLines.length) existingLines = [""];

    var $noteInputs = jQuery("<div>").addClass(ns("note-inputs"));

    var $addLine = jQuery("<button type='button'>")
      .addClass(ns("note-add-line"))
      .append(jQuery("<i>").addClass("fa-solid fa-plus"))
      .append(jQuery("<span>").text("Add line"));

    function syncControls() {
      var $rows = $noteInputs.find("." + ns("note-input-row"));
      var multi = $rows.length > 1;
      $rows.find("." + ns("note-remove-line")).toggle(multi);
      var lastVal = $rows.last().find("input").val().trim();
      $addLine.prop("disabled", !lastVal);
    }

    function addInputRow(val) {
      var $row = jQuery("<div>").addClass(ns("note-input-row"));
      var $input = jQuery("<input type='text'>")
        .addClass(ns("field-input"))
        .attr("maxlength", MAX_LINE_LEN)
        .attr("placeholder", cfg.labels.addNote || "Add note…")
        .val(val || "");
      var $remove = jQuery("<button type='button'>")
        .addClass(ns("note-remove-line"))
        .attr("title", "Remove line")
        .append(jQuery("<i>").addClass("fa-solid fa-xmark"));

      $row.append($input, $remove);
      $noteInputs.append($row);

      $input.on("input", syncControls);
      $remove.on("click", function () {
        $row.remove();
        syncControls();
      });
      syncControls();
    }

    existingLines.forEach(function (l) { addInputRow(l); });

    $addLine.on("click", function () {
      var $last = $noteInputs.find("." + ns("note-input-row")).last();
      if (!$last.find("input").val().trim()) return;
      addInputRow("");
      $noteInputs.find("input").last().trigger("focus");
      syncControls();
    });

    $modal.append(
      jQuery("<div>").addClass(ns("field")).append(
        jQuery("<label>").text(cfg.labels.note),
        $noteInputs,
        $addLine
      )
    );

    // ── Section selector ───────────────────────────────
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

    setTimeout(function () { $noteInputs.find("input").first().trigger("focus"); }, 30);

    function close() { $overlay.remove(); }

    $cancel.on("click", close);
    $overlay.on("click", function (e) { if (jQuery(e.target).is($overlay)) close(); });

    $save.on("click", function () {
      var newNote = $noteInputs.find("input")
        .map(function () { return jQuery.trim(jQuery(this).val()); })
        .get()
        .filter(function (v) { return v !== ""; })
        .join("\n");
      var newSection = $sel.val();
      if (newNote !== (line.note || "")) MenuCore.setLineNote(line.lineId, newNote);
      if (newSection !== line.sectionId) MenuCore.moveLineToSection(line.lineId, newSection);
      close();
    });
  }

  return { open: open };
})();

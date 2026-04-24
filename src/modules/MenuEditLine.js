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

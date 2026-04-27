var fs = require("fs");
var path = require("path");

var files = [
  "src/core/MenuConfig.js",
  "src/core/MenuEvents.js",
  "src/core/MenuCore.js",
  "src/modules/MenuRender.js",
  "src/modules/MenuBrowse.js",
  "src/modules/MenuEditLine.js",
  "src/modules/MenuBasket.js",
  "src/RestaurantMenu.js"
];

var pkg = require("./package.json");
var banner = [
  "/*!",
  " * restaurant-menu.js v" + pkg.version,
  " * Restaurant Menu & Basket Library",
  " * Built: " + new Date().toISOString(),
  " * Requires: jQuery 3+",
  " * License: MIT",
  " */",
  ""
].join("\n");

var bundle = files.map(function (f) {
  var content = fs.readFileSync(path.join(__dirname, f), "utf8");
  return "/* " + f + " */\n" + content;
}).join("\n\n");

fs.mkdirSync("./dist", { recursive: true });

fs.writeFileSync("./dist/restaurant-menu.js", banner + "\n" + bundle, "utf8");
console.log("JS  -> dist/restaurant-menu.js (" + (bundle.length / 1024).toFixed(1) + " KB)");

var css = fs.readFileSync("./restaurant-menu.css", "utf8");
fs.writeFileSync("./dist/restaurant-menu.css", css, "utf8");
console.log("CSS -> dist/restaurant-menu.css");

// --- Copy to MVC project static assets ---
var mvcDir = "C:/Users/marjan.carullo/source/repos/OmniBusiness/OmniBusiness/wwwroot/libs/restaurant-menu/";
try {
  fs.mkdirSync(mvcDir, { recursive: true });
  fs.copyFileSync("./dist/restaurant-menu.js", path.join(mvcDir, "restaurant-menu.js"));
  fs.copyFileSync("./dist/restaurant-menu.css", path.join(mvcDir, "restaurant-menu.css"));
  console.log("\u2705 Copied to MVC: " + mvcDir);
} catch (e) {
  console.error("\u26A0\uFE0F Failed to copy to MVC project:", e.message);
}
console.log("✅ CSS → dist/restaurant-menu.css");


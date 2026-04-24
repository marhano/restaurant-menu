# restaurant-menu

> Restaurant menu & basket library — category / sub-category browsing, multi-section basket (Kitchen, Bar, …), quantity controls, notes, and send-order workflow.
> Requires jQuery 3+.

## Installation

### npm
```bash
npm install restaurant-menu
```

### CDN (coming soon)
```html
<link rel="stylesheet" href="dist/restaurant-menu.css" />
<script src="dist/restaurant-menu.js"></script>
```

### .NET MVC
```html
<link rel="stylesheet" href="~/Content/restaurant-menu.css" />
<script src="~/Scripts/restaurant-menu.js"></script>
```

## Quick Start

```html
<div id="menuRoot"></div>

<script src="jquery.min.js"></script>
<script src="restaurant-menu.js"></script>
<script>
    var menu = RestaurantMenu.create({
        containerId: 'menuRoot',
        table: { id: 'T1', name: 'Table 1', seats: 4, guests: 2, server: 'Alex' },

        basketSections: [
            { id: 'kitchen', label: 'Kitchen', icon: 'fa-solid fa-utensils' },
            { id: 'bar',     label: 'Bar',     icon: 'fa-solid fa-martini-glass' }
        ],
        defaultBasketSection: 'kitchen',

        categories: [
            {
                id: 'food', label: 'Food', icon: 'fa-solid fa-burger',
                basketSection: 'kitchen',
                subcategories: [
                    { id: 'appetizers', label: 'Appetizers' },
                    { id: 'mains',      label: 'Mains' },
                    { id: 'desserts',   label: 'Desserts' }
                ]
            },
            {
                id: 'drinks', label: 'Drinks', icon: 'fa-solid fa-wine-glass',
                basketSection: 'bar',
                subcategories: [
                    { id: 'soft', label: 'Soft' },
                    { id: 'bar',  label: 'Bar' }
                ]
            }
        ],

        items: [
            { id: 'i1', name: 'Bruschetta', description: 'Toasted bread, tomato, basil',
              price: 7.5, image: '/img/bruschetta.jpg',
              categoryId: 'food', subcategoryId: 'appetizers' },
            { id: 'i2', name: 'Ribeye Steak', description: '250g aged, grilled',
              price: 24.0, image: '/img/ribeye.jpg',
              categoryId: 'food', subcategoryId: 'mains' },
            { id: 'd1', name: 'House Red', description: '150ml glass',
              price: 6.0, image: '/img/wine.jpg',
              categoryId: 'drinks', subcategoryId: 'bar' }
        ],

        onSendOrder: function (order, done) {
            console.log('Sending order:', order);
            // ... POST to server, then:
            done();
        }
    });
</script>
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `containerId` | string | `'restaurantMenu'` | ID of the target div |
| `table` | object | `null` | Current table `{ id, name, seats, guests, server }` |
| `categories` | array | `[]` | Menu categories with nested `subcategories` |
| `items` | array | `[]` | Menu items |
| `basketSections` | array | `[{kitchen}, {bar}]` | Ordered basket section tabs |
| `defaultBasketSection` | string | `'kitchen'` | Fallback section when nothing matches |
| `currency` | object | `{symbol:'$', position:'prefix', decimals:2}` | Price formatter |
| `showSearch` | boolean | `true` | Show search input |
| `showImages` | boolean | `true` | Show item images |
| `showDescriptions` | boolean | `true` | Show item descriptions |
| `showEllipsis` | boolean | `true` | Show per-item "…" menu for section override |
| `showSendOrderButton` | boolean | `true` | Show "Send order" button |
| `showNextServingButton` | boolean | `true` | Show "Next serving" button |
| `labels` | object | see source | i18n labels |
| `theme` | object | see source | CSS theme tokens |

### Basket section routing

When an item is added, its target basket section is resolved in this order:

1. Explicit `sectionId` passed to `addItem(id, sectionId)` or picked from the item's "…" menu
2. `item.basketSection`
3. `subcategory.basketSection`
4. `category.basketSection`
5. `cfg.defaultBasketSection`

## API

```javascript
var menu = RestaurantMenu.create({ ... });

// Data
menu.getConfig();
menu.getBasket();
menu.getBasketBySection('kitchen');
menu.getBasketTotal();
menu.getSectionTotal('bar');

// Menu / filters
menu.getCategories();
menu.setCategory('food');
menu.setSubcategory('mains');
menu.setSearch('steak');

// Live updates (create once, mutate later — preserves UI state)
menu.updateItems(newItems);
menu.updateCategories(newCategories);
menu.updateBasketSections([
    { id: 'kitchen', label: 'Kitchen', icon: 'fa-solid fa-utensils' },
    { id: 'bar',     label: 'Bar',     icon: 'fa-solid fa-martini-glass' },
    { id: 'coffee',  label: 'Coffee',  icon: 'fa-solid fa-mug-hot' }
]);

// Start a new order for a table (swap table + clear basket + reset serving)
menu.startNewOrder({ id: 'T2', name: 'Table 2', guests: 3, server: 'Sam' });

// Basket ops
menu.addItem('i1');               // auto-routes to a section
menu.addItem('i1', 'bar');        // force section
menu.incQty(lineId);
menu.decQty(lineId);
menu.removeLine(lineId);
menu.setLineNote(lineId, 'No onions');
menu.moveLineToSection(lineId, 'bar');
menu.clearBasket();

// Sections
menu.getSections();
menu.setActiveSection('bar');
menu.getActiveSection();

// Table & serving
menu.getTable();
menu.setTable({ id: 'T2', name: 'Table 2', guests: 3 });
menu.getServing();
menu.nextServing();

// Lifecycle
menu.destroy();
```

## Callbacks

```javascript
RestaurantMenu.create({
    onItemAdd:       function (line, sectionId, basket) { },
    onItemRemove:    function (line, basket) { },
    onQtyChange:     function (line, basket) { },
    onNoteChange:    function (line, basket) { },
    onBasketChange:  function (basket) { },
    onSectionChange: function (sectionId) { },
    onNextServing:   function (basket) { },
    onSendOrder:     function (order, done) { /* call done() to clear basket */ },
    onTableChange:   function (table) { }
});
```

## License

MIT

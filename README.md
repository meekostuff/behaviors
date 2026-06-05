# Behaviors

Lightweight behavior system for HTML elements using event delegation and transient instances.

## How it works

Behaviors are registered against elements via a unique attribute (`mk-is`). A single window capture listener per event type intercepts events, walks the composed path, and attaches transient `{ once: true }` listeners on matching elements. No persistent listeners live on elements — state belongs to the DOM itself.

Each time a listener fires, a fresh instance is created with `this.element` pointing to the matched element. The instance is discarded after the callback completes.

## Usage

Include the bundled script:

```html
<script src="behaviors.js"></script>
```

### Inline declaration with `<script for>`

```html
<button id="save">Save</button>
<script for>({
    onclick() {
        this.element.textContent = 'Saved!';
    }
})</script>
```

The `<script for>` (empty `for` attribute) targets the preceding non-script/style sibling element.

### Programmatic registration

```js
behaviors.define(element, {
    greet() { return 'Hello from ' + this.element.id; }
}, [
    { type: 'click', action() { console.log(this.greet()); } }
]);
```

### Accessing the instance

```js
element.$.greet(); // calls method on a transient instance
```

## Listener format

```js
{
    type: 'keydown',       // event type (required)
    phase: 'target',       // 'capture', 'bubble', or 'target' (optional)
    key: 'Enter, Space',   // filter by event.key (optional, comma-separated)
    code: 'KeyA',          // filter by event.code (optional, comma-separated)
    clickCount: 2,         // filter by event.detail (optional)
    action() { ... }       // callback, `this` is the transient instance
}
```

## `on*` shorthand

Properties starting with `on` on the proto are automatically converted to listeners:

```html
<div id="hover-target"></div>
<script for>({
    onmouseenter() { this.element.classList.add('active'); },
    onmouseleave() { this.element.classList.remove('active'); }
})</script>
```

## API

### `behaviors.define(element, proto, listeners)`

Register a behavior on an element. Generates a unique key, sets the identifying attribute, and registers event listeners. If `element` is null, autodetects from `document.currentScript`.

### `behaviors.register(key, proto, listeners)`

Register a behavior by key directly (for pre-assigned keys, e.g. from template preprocessing).

### `element.$`

Returns a transient instance with the registered proto (or a default) and `this.element` pointing to the element.

### `BehaviorRegistry.getTarget(script)`

Finds the preceding non-script/style sibling of a script element.

## Development

```bash
npm run build     # bundle src → behaviors.js
npm run test      # run tests (all browsers)
npm run demo      # serve demo page
```

## License

MPL-2.0 — see [LICENSE.txt](LICENSE.txt).

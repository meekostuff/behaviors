/*!
 * Copyright 2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

/**
 * Registry for behaviors. Behaviors are keyed by a unique attribute value
 * and dispatched via a single window capture listener per event type.
 */
class BehaviorRegistry {
    #attr;
    #table = new Map(); // key → { proto, listeners }
    #types = new Set();
    #defaultProto;

    #count = 0;

    /**
     * @param {string} [attr='mk-is'] - Attribute name used to identify behavior elements.
     * @param {object|null} [defaultProto=null] - Default prototype for instances when no behavior is registered.
     */
    constructor(attr, defaultProto) {
        this.#attr = attr ?? 'mk-is';
        this.#defaultProto = defaultProto ?? null;
    }

    /**
     * Generate a unique key for a behavior registration.
     * @returns {string}
     */
    uniqueKey() {
        return Math.random().toString(36).slice(2) + (this.#count++).toString(36);
    }

    /** @returns {Map} The behavior table (key → { proto, listeners }). */
    get table() { return this.#table; }

    /** @returns {string} The attribute name used for behavior identification. */
    get attr() { return this.#attr; }

    /**
     * Register a behavior by key. Adds window capture listeners for any new event types.
     * @param {string} key - Unique behavior key (the attribute value).
     * @param {object|null} proto - Prototype for transient instances.
     * @param {Array<{type: string, phase?: string, key?: string, code?: string, clickCount?: number, action: Function}>} listeners - Event listeners.
     * @returns {string} The registered key.
     */
    register(key, proto, listeners) {
        this.#table.set(key, { proto, listeners });
        for (let l of listeners) {
            if (!this.#types.has(l.type)) {
                this.#types.add(l.type);
                window.addEventListener(l.type, this, true);
            }
        }
        return key;
    }

    /**
     * Define a behavior on an element. Generates a unique key, sets the attribute,
     * and extracts any `on*` slots from proto as listeners.
     * @param {Element|null} element - Target element, or null to autodetect from currentScript.
     * @param {object|null} proto - Prototype for transient instances.
     * @param {Array} [listeners] - Event listeners.
     * @returns {string} The registered key.
     */
    define(element, proto, listeners) {
        if (element == null) {
            if (document.currentScript) {
                element = BehaviorRegistry.getTarget(document.currentScript);
            }
            if (element == null) throw new Error('Could not autodetect target for behavior.');
        }
        if (proto) {
            for (let key of Object.keys(proto).filter(k => k.startsWith('on'))) {
                if (proto[key] instanceof Function) {
                    listeners = listeners || [];
                    listeners.push({ type: key.slice(2), action: proto[key] });
                }
            }
        }
        let id = this.uniqueKey();
        element.setAttribute(this.#attr, id);
        return this.register(id, proto, listeners);
    }

    /**
     * Create a transient behavior instance for an element.
     * Uses WeakRef to avoid preventing element GC.
     * @param {Element} element
     * @param {object|null} proto
     * @returns {object} Instance with `element` getter.
     */
    static createInstance(element, proto) {
        let instance = proto ? Object.create(proto) : {};
        let el = new WeakRef(element);
        Object.defineProperty(instance, 'element', { get: () => el.deref() });
        return instance;
    }

    /**
     * Get a transient instance for an element, using its registered proto or the default.
     * @param {Element} element
     * @returns {object} Instance with `element` getter.
     */
    getInstance(element) {
        let key = element.getAttribute(this.#attr);
        let entry = key && this.#table.get(key);
        return BehaviorRegistry.createInstance(element, entry?.proto ?? this.#defaultProto);
    }

    /**
     * EventListener interface. Called by the browser for each captured event.
     * Walks the composed path and attaches once-listeners on matching elements.
     * @param {Event} event
     */
    handleEvent(event) {
        for (let element of event.composedPath()) {
            if (!(element instanceof Element)) continue;
            this.#handleElement(element, event);
        }
    }

    /**
     * Look up and attach listeners for a single element in the event path.
     * @param {Element} element
     * @param {Event} event
     */
    #handleElement(element, event) {
        let key = element.getAttribute(this.#attr);
        if (!key) return;
        let entry = this.#table.get(key);
        if (!entry) return;
        this.#attachListeners(element, entry, event);
    }

    /**
     * Iterate entry listeners, filter by event match, and attach each.
     * @param {Element} element
     * @param {{proto: object|null, listeners: Array}} entry
     * @param {Event} event
     */
    #attachListeners(element, entry, event) {
        for (let listener of entry.listeners) {
            if (!this.#matchesEvent(listener, event, element === event.target)) continue;
            this.#attachListener(element, entry.proto, listener, event);
        }
    }

    /**
     * Attach a single once-listener on the element for this event dispatch cycle.
     * @param {Element} element
     * @param {object|null} proto
     * @param {{type: string, phase?: string, action: Function}} listener
     * @param {Event} event
     */
    #attachListener(element, proto, listener, event) {
        // Guard: if stopImmediatePropagation prevents this from firing on the
        // current event, it becomes a no-op on the next event and self-removes via once.
        let ts = event.timeStamp;
        element.addEventListener(event.type, function(ev) {
            if (ev.timeStamp !== ts) return;
            let instance = BehaviorRegistry.createInstance(ev.currentTarget, proto);
            listener.action.call(instance, ev);
        }, { once: true, capture: listener.phase === 'capture' });
    }

    /**
     * Test whether a listener matches the current event (type, phase, modifiers).
     * @param {{type: string, phase?: string, key?: string, code?: string, clickCount?: number}} listener
     * @param {Event} event
     * @param {boolean} isTarget - Whether the element is the event target.
     * @returns {boolean}
     */
    #matchesEvent(listener, event, isTarget) {
        if (listener.type !== event.type) return false;
        if (listener.phase === 'target' && !isTarget) return false;
        if (listener.phase === 'capture' && isTarget) return false;
        if (listener.phase === 'bubble' && isTarget) return false;
        if (listener.key && !listener.key.split(/\s*,\s*/).includes(event.key)) return false;
        if (listener.code && !listener.code.split(/\s*,\s*/).includes(event.code)) return false;
        if (listener.clickCount && listener.clickCount !== event.detail) return false;
        return true;
    }

    /**
     * Derive the target element from a script element by finding the
     * preceding non-script/style sibling, or the parent node.
     * @param {HTMLScriptElement} script
     * @returns {Element}
     */
    static getTarget(script) {
        let target = script;
        while (target = target.previousElementSibling) {
            if (!['STYLE', 'SCRIPT'].includes(target.tagName)) break;
        }
        return target || script.parentNode;
    }
}

export { BehaviorRegistry };

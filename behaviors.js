(function(exports) {
    "use strict";
    /*!
     * Copyright 2026 Sean Hogan (http://meekostuff.net/)
     * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
     */    class BehaviorRegistry {
        #attr;
        #table=new Map;
        #types=new Set;
        #defaultProto;
        #count=0;
        constructor(attr, defaultProto) {
            this.#attr = attr ?? "mk-is";
            this.#defaultProto = defaultProto ?? null;
        }
        uniqueKey() {
            return Math.random().toString(36).slice(2) + (this.#count++).toString(36);
        }
        get table() {
            return this.#table;
        }
        get attr() {
            return this.#attr;
        }
        register(key, proto, listeners) {
            this.#table.set(key, {
                proto: proto,
                listeners: listeners
            });
            for (let l of listeners) {
                if (!this.#types.has(l.type)) {
                    this.#types.add(l.type);
                    window.addEventListener(l.type, this, true);
                }
            }
            return key;
        }
        define(element, proto, listeners) {
            if (element == null) {
                if (document.currentScript) {
                    element = BehaviorRegistry.getTarget(document.currentScript);
                }
                if (element == null) throw new Error("Could not autodetect target for behavior.");
            }
            if (proto) {
                for (let key of Object.keys(proto).filter(k => k.startsWith("on"))) {
                    if (proto[key] instanceof Function) {
                        listeners = listeners || [];
                        listeners.push({
                            type: key.slice(2),
                            action: proto[key]
                        });
                    }
                }
            }
            let id = this.uniqueKey();
            element.setAttribute(this.#attr, id);
            return this.register(id, proto, listeners);
        }
        static createInstance(element, proto) {
            let instance = proto ? Object.create(proto) : {};
            let el = new WeakRef(element);
            Object.defineProperty(instance, "element", {
                get: () => el.deref()
            });
            return instance;
        }
        getInstance(element) {
            let key = element.getAttribute(this.#attr);
            let entry = key && this.#table.get(key);
            return BehaviorRegistry.createInstance(element, entry?.proto ?? this.#defaultProto);
        }
        handleEvent(event) {
            for (let element of event.composedPath()) {
                if (!(element instanceof Element)) continue;
                this.#handleElement(element, event);
            }
        }
        #handleElement(element, event) {
            let key = element.getAttribute(this.#attr);
            if (!key) return;
            let entry = this.#table.get(key);
            if (!entry) return;
            this.#attachListeners(element, entry, event);
        }
        #attachListeners(element, entry, event) {
            for (let listener of entry.listeners) {
                if (!this.#matchesEvent(listener, event, element === event.target)) continue;
                this.#attachListener(element, entry.proto, listener, event);
            }
        }
        #attachListener(element, proto, listener, event) {
            let ts = event.timeStamp;
            element.addEventListener(event.type, function(ev) {
                if (ev.timeStamp !== ts) return;
                let instance = BehaviorRegistry.createInstance(ev.currentTarget, proto);
                listener.action.call(instance, ev);
            }, {
                once: true,
                capture: listener.phase === "capture"
            });
        }
        #matchesEvent(listener, event, isTarget) {
            if (listener.type !== event.type) return false;
            if (listener.phase === "target" && !isTarget) return false;
            if (listener.phase === "capture" && isTarget) return false;
            if (listener.phase === "bubble" && isTarget) return false;
            if (listener.key && !listener.key.split(/\s*,\s*/).includes(event.key)) return false;
            if (listener.code && !listener.code.split(/\s*,\s*/).includes(event.code)) return false;
            if (listener.clickCount && listener.clickCount !== event.detail) return false;
            return true;
        }
        static getTarget(script) {
            let target = script;
            while (target = target.previousElementSibling) {
                if (![ "STYLE", "SCRIPT" ].includes(target.tagName)) break;
            }
            return target || script.parentNode;
        }
    }
    /*!
     * Copyright 2026 Sean Hogan (http://meekostuff.net/)
     * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
     */    class Behavior {}
    /*!
     * Copyright 2026 Sean Hogan (http://meekostuff.net/)
     * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
     */    let behaviors = new BehaviorRegistry("mk-is", Behavior.prototype);
    window.behaviors = behaviors;
    window.BehaviorRegistry = BehaviorRegistry;
    Object.defineProperty(Element.prototype, "$", {
        get: function() {
            return behaviors.getInstance(this);
        }
    });
    document.addEventListener("DOMContentLoaded", () => {
        let scripts = document.querySelectorAll("script[for]");
        for (let script of scripts) {
            if (script.getAttribute("for")) continue;
            let fn = new Function(`return (${script.textContent})`);
            let o = fn();
            let element = BehaviorRegistry.getTarget(script);
            let listeners = o.listeners || [];
            delete o.listeners;
            behaviors.define(element, o, listeners);
        }
    });
    exports.BehaviorRegistry = BehaviorRegistry;
    exports.behaviors = behaviors;
    return exports;
})({});

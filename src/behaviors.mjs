/*!
 * Copyright 2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import { BehaviorRegistry } from './BehaviorRegistry.mjs';
import { Behavior } from './Behavior.mjs';

let behaviors = new BehaviorRegistry('mk-is', Behavior.prototype);
window.behaviors = behaviors;
window.BehaviorRegistry = BehaviorRegistry;
window.Behavior = Behavior;

Object.defineProperty(Element.prototype, '$', { get: function() {
    return behaviors.getInstance(this);
}});

function processScript(script) {
    let fn = new Function('Behavior', `return (${script.textContent})`);
    let o = fn(Behavior);
    let element = BehaviorRegistry.getTarget(script);
    let proto, listeners;
    if (Array.isArray(o)) {
        listeners = o;
        proto = null;
    } else if (typeof o === 'function') {
        if (o.name) throw new Error(`Behavior class must be anonymous (got "${o.name}")`);
        listeners = o.listeners || [];
        proto = o.prototype;
    } else {
        listeners = o.listeners || [];
        delete o.listeners;
        proto = o;
    }
    behaviors.define(element, proto, listeners);
}

document.addEventListener('DOMContentLoaded', () => {
    let scripts = document.querySelectorAll('script[for]');
    for (let script of scripts) {
        if (script.getAttribute('for')) continue;
        try { processScript(script); }
        catch (e) { console.error(e); }
    }
});

export { BehaviorRegistry, behaviors };

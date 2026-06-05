/*!
 * Copyright 2026 Sean Hogan (http://meekostuff.net/)
 * Mozilla Public License v2.0 (http://mozilla.org/MPL/2.0/)
 */

import { BehaviorRegistry } from './BehaviorRegistry.mjs';
import { Behavior } from './Behavior.mjs';

let behaviors = new BehaviorRegistry('mk-is', Behavior.prototype);
window.behaviors = behaviors;
window.BehaviorRegistry = BehaviorRegistry;

Object.defineProperty(Element.prototype, '$', { get: function() {
    return behaviors.getInstance(this);
}});

document.addEventListener('DOMContentLoaded', () => {
    let scripts = document.querySelectorAll('script[for]');
    for (let script of scripts) {
        if (script.getAttribute('for')) continue;
        let fn = new Function(`return (${script.textContent})`);
        let o = fn();
        let element = BehaviorRegistry.getTarget(script);
        let listeners = o.listeners || [];
        delete o.listeners;
        behaviors.define(element, o, listeners);
    }
});

export { BehaviorRegistry, behaviors };

/**
*  area-sortable.js
*  A simple js class to sort elements of an area using drag-and-drop (desktop and mobile)
*  @VERSION: 1.0.0
*
*  https://github.com/foo123/area-sortable.js
*
**/
!function(root, name, factory) {
"use strict";
if ('object' === typeof exports)
    // CommonJS module
    module.exports = factory();
else if ('function' === typeof define && define.amd)
    // AMD. Register as an anonymous module.
    define(function(req) {return factory();});
else
    root[name] = factory();
}('undefined' !== typeof self ? self : this, 'AreaSortable', function(undef) {
"use strict";

var VERSION = '1.0.0', DOC = window.document,
    $ = '$dndSortable',
    VERTICAL = 1, HORIZONTAL = 2,
    UNRESTRICTED = VERTICAL + HORIZONTAL,
    stdMath = Math, Str = String,
    hasProp = Object.prototype.hasOwnProperty,
    trim_re = /^\s+|\s+$/g, mouse_evt = /mousedown|pointerdown/,
    trim = Str.prototype.trim
        ? function(s) {return s.trim();}
        : function(s) {return s.replace(trim_re, '');},
    eventOptionsSupported = hasEventOptions()/*,
    nextTick = 'undefined' !== typeof Promise
        ? Promise.resolve().then.bind(Promise.resolve())
        : function(cb) {setTimeout(cb, 0);}*/
;

// add custom property to Element.prototype to avoid browser issues
if (
    window.Element
    && !hasProp.call(window.Element.prototype, $)
)
    window.Element.prototype[$] = null;

function hasEventOptions()
{
    var passiveSupported = false, options = {};
    try {
        Object.defineProperty(options, 'passive', {
            get: function(){
                passiveSupported = true;
                return false;
            }
        });
        window.addEventListener('test', null, options);
        window.removeEventListener('test', null, options);
    } catch(e) {
        passiveSupported = false;
    }
    return passiveSupported;
}
function hasClass(el, className)
{
    return el.classList
        ? el.classList.contains(className)
        : -1 !== (' ' + el.className + ' ').indexOf(' ' + className + ' ')
    ;
}
function addClass(el, className)
{
    if (el.classList) el.classList.add(className);
    else if (!hasClass(el, className)) el.className = '' === el.className ? className : (el.className + ' ' + className);
}
function removeClass(el, className)
{
    if (el.classList) el.classList.remove(className);
    else el.className = trim((' ' + el.className + ' ').replace(' ' + className + ' ', ' '));
}
function addEvent(target, event, handler, options)
{
    if (target.attachEvent) target.attachEvent('on' + event, handler);
    else target.addEventListener(event, handler, eventOptionsSupported ? options : ('object' === typeof(options) ? !!options.capture : !!options));
}
function removeEvent(target, event, handler, options)
{
    // if (el.removeEventListener) not working in IE11
    if (target.detachEvent) target.detachEvent('on' + event, handler);
    else target.removeEventListener(event, handler, eventOptionsSupported ? options : ('object' === typeof(options) ? !!options.capture : !!options));
}
function computedStyle(el)
{
    return 'function' === typeof(window.getComputedStyle) ? window.getComputedStyle(el) : el.currentStyle;
}
function elementsAt(x, y)
{
    return DOC.elementsFromPoint(x, y);
}
function closestElement(el, className)
{
    if (el.closest) return el.closest('.' + className);
    while (el)
    {
        if (hasClass(el, className)) return el;
        el = el.parentNode;
    }
}
function computeScroll(el, single)
{
    var scroll = {X: 0/*window.pageXOffset*//*scrollX*/, Y: 0/*window.pageYOffset*//*scrollY*/};
    /*while (el)
    {
        scroll.X += el.scrollLeft || 0;
        scroll.Y += el.scrollTop || 0;
        if (single || (el === DOC.documentElement)) break;
        el = el.parentNode;
    }*/
    return scroll;
}
function throttle(f, limit)
{
    var inThrottle = false;
    return function() {
        var args = arguments, context = this;
        if (!inThrottle)
        {
            f.apply(context, args);
            inThrottle = true;
            setTimeout(function(){inThrottle = false;}, limit);
        }
    };
}

function intersect1D(nodeA, nodeB, coord, size)
{
    var rectA = nodeA[$].r, rectB = nodeB[$].rect
        //,marginA = nodeA[$].margin, marginB = nodeB[$].margin
        //,coord2 = 'top' === coord ? 'bottom' : 'right'
    ;

    return stdMath.max(
        0.0,
        stdMath.min(
            1.0,
            stdMath.max(
                0,
                stdMath.min(
                    rectA[coord] + rectA[size],
                    rectB[coord] + rectB[size]
                )
                -
                stdMath.max(
                    rectA[coord],
                    rectB[coord]
                )
            )
            /
            stdMath.min(
                rectA[size],
                rectB[size]
            )
        )
    );
}
function intersect2D(nodeA, nodeB, coord, size)
{
    var rectA = nodeA[$].r, rectB = nodeB[$].rect,
        //marginA = nodeA[$].margin, marginB = nodeB[$].margin,
        overlapX = 0, overlapY = 0;
    overlapX = stdMath.max(
        0,
        stdMath.min(
            rectA.left + rectA.width,
            rectB.left + rectB.width
        )
        -
        stdMath.max(
            rectA.left,
            rectB.left
        )
    );
    overlapY = stdMath.max(
        0,
        stdMath.min(
            rectA.top + rectA.height,
            rectB.top + rectB.height
        )
        -
        stdMath.max(
            rectA.top,
            rectB.top
        )
    );
    return stdMath.max(
        0.0,
        stdMath.min(
            1.0,
            (overlapX * overlapY)
            /
            (
                stdMath.min(
                    rectA.width,
                    rectB.width
                )
                *
                stdMath.min(
                    rectA.height,
                    rectB.height
                )
            )
        )
    );
}

function storeStyle(el, props)
{
    return props.reduce(function(style, prop){
        style[prop] = el.style.getPropertyValue(prop);
        return style;
    }, {});
}
function restoreStyle(el, props, style)
{
    style = style || el[$].style;
    props.forEach(function(prop){
        if (hasProp.call(style, prop) && ('' !== style[prop])) el.style[prop] = style[prop];
        else el.style.removeProperty(prop);
    });
}

function repaint(el)
{
    return el.offsetWidth;
}
function animate(el, ms, offset)
{
    if (0 < ms)
    {
        if (el[$].animation) el[$].animation.stop();
        var trs = 'transform ' + Str(ms) + 'ms',
            trf = 'translate3d(0,0,0)',
            time = null,
            stop = function stop() {
                if (time) clearTimeout(time);
                time = null;
                if (el[$] && el[$].animation && (stop === el[$].animation.stop)) el[$].animation = null;
                if (el.style.transform === trf && el.style.transition === trs)
                {
                    el.style.transition = 'none';
                    el.style.transform = 'none';
                }
                return el;
            }
        ;
        el.style.transition = 'none';
        el.style.transform = 'translate3d(' + Str(-(offset.left || 0)) + 'px,' + Str(-(offset.top || 0)) + 'px,0)';
        repaint(el);
        el.style.transform = trf;
        el.style.transition = trs;
        time = setTimeout(stop, ms);
        el[$].animation = {stop: stop};
    }
    return el;
}

function setup(self, TYPE)
{
    var isDraggingStarted = false, attached = false,
        dragged, handler, closest, first, last,
        parent, items, parentRect, parentStyle,
        X0, Y0, lastX, lastY, scroll, dir, overlap, moved,
        move, intersect,
        size = HORIZONTAL === TYPE ? 'width' : 'height',
        coord = HORIZONTAL === TYPE ? 'left' : 'top',
        coord2 = 'left' === coord ? 'right' : 'bottom'
    ;

    var clear = function() {
        dragged = null;
        handler = null;
        closest = null;
        first = null;
        last = null;
        parent = null;
        items = null;
        parentRect = null;
        parentStyle = null;
        moved = false;
        overlap = 0;
    };

    var move1D = function(movedNode, refNode, dir, ms) {
        var next, prev, target = refNode, limitNode, delta = 0, margin = 0, offset;
        if (first === last) return;
        if (0 > dir)
        {
            limitNode = movedNode.nextElementSibling;
            // Move `movedNode` before the `refNode`
            if (first === refNode) first = movedNode;
            if (last === movedNode) last = movedNode.previousElementSibling;
            parent.insertBefore(movedNode, refNode);
            movedNode[$].index = refNode[$].index;
            movedNode[$].rect.prev[coord] = movedNode[$].rect[coord];
            margin = movedNode[$].margin[coord] - refNode[$].margin[coord];
            movedNode[$].rect[coord] = refNode[$].rect[coord] + margin;
            prev = movedNode;
            delta = movedNode[$].rect[size] - refNode[$].rect[size];
            margin += movedNode[$].margin[coord2] - refNode[$].margin[coord2];
            while ((next = refNode.nextElementSibling) && (next !== limitNode))
            {
                if (refNode[$].animation) refNode[$].animation.stop();
                refNode[$].index++;
                refNode[$].rect.prev[coord] = refNode[$].rect[coord];
                margin += refNode[$].margin[coord] - next[$].margin[coord];
                refNode[$].rect[coord] = next[$].rect[coord] + delta + margin;
                margin += refNode[$].margin[coord2] - next[$].margin[coord2];
                refNode.style[coord] = Str(refNode[$].rect[coord] - parentRect[coord] - refNode[$].margin[coord])+'px';
                delta += refNode[$].rect[size] - next[$].rect[size];
                prev = refNode;
                refNode = next;
            }
            if (refNode[$].animation) refNode[$].animation.stop();
            refNode[$].index++;
            refNode[$].rect.prev[coord] = refNode[$].rect[coord];
            refNode[$].rect[coord] = movedNode[$].rect.prev[coord] + delta + margin - movedNode[$].margin[coord] + refNode[$].margin[coord];
            refNode.style[coord] = Str(refNode[$].rect[coord] - parentRect[coord] - refNode[$].margin[coord])+'px';
            offset = {};
            offset[coord] = target[$].rect[coord] - target[$].rect.prev[coord];
            animate(target, ms, offset);
        }
        else if (0 < dir)
        {
            limitNode = movedNode.nextElementSibling;
            // Move `movedNode` after the `refNode`
            if (first === movedNode) first = limitNode;
            if (refNode.nextElementSibling)
            {
                parent.insertBefore(movedNode, refNode.nextElementSibling);
            }
            else
            {
                parent.appendChild(movedNode);
                last = movedNode;
            }
            movedNode[$].index = refNode[$].index;
            refNode = limitNode;
            next = movedNode;
            margin = 0;
            delta = 0;
            next[$].rect.prev[coord] = next[$].rect[coord];
            do
            {
                if (refNode[$].animation) refNode[$].animation.stop();
                refNode[$].index--;
                refNode[$].rect.prev[coord] = refNode[$].rect[coord];
                margin += refNode[$].margin[coord] - next[$].margin[coord];
                refNode[$].rect[coord] = next[$].rect.prev[coord] + delta + margin;
                refNode.style[coord] = Str(refNode[$].rect[coord] - parentRect[coord] - refNode[$].margin[coord])+'px';
                delta += -(next[$].rect[size] - refNode[$].rect[size]);
                margin += refNode[$].margin[coord2] - next[$].margin[coord2];
                next = refNode;
                refNode = refNode.nextElementSibling;
            }
            while ((refNode) && (refNode !== movedNode));
            movedNode[$].rect[coord] = next[$].rect.prev[coord] + delta + margin - next[$].margin[coord] + movedNode[$].margin[coord];
            offset = {};
            offset[coord] = target[$].rect[coord] - target[$].rect.prev[coord];
            animate(target, ms, offset);
        }
    };

    var move2D = function(movedNode, refNode, dir, ms) {
        var next, target = refNode, limitNode;
        if (first === last) return;
        if (0 > dir)
        {
            limitNode = movedNode.nextElementSibling;
            // Move `movedNode` before the `refNode`
            if (first === refNode) first = movedNode;
            if (last === movedNode) last = movedNode.previousElementSibling;
            parent.insertBefore(movedNode, refNode);
            //items.splice(movedNode[$].index, 1);
            //items.splice(refNode[$].index, 0, movedNode);
            movedNode[$].index = refNode[$].index;
            movedNode[$].rect.prev.top = movedNode[$].rect.top;
            movedNode[$].rect.prev.left = movedNode[$].rect.left;
            movedNode[$].rect.top = refNode[$].rect.top;
            movedNode[$].rect.left = refNode[$].rect.left;
            while ((next = refNode.nextElementSibling) && (next !== limitNode))
            {
                if (refNode[$].animation) refNode[$].animation.stop();
                refNode[$].index++;
                refNode[$].rect.prev.top = refNode[$].rect.top;
                refNode[$].rect.prev.left = refNode[$].rect.left;
                refNode[$].rect.top = next[$].rect.top;
                refNode[$].rect.left = next[$].rect.left;
                refNode.style.top = Str(refNode[$].rect.top - parentRect.top - refNode[$].margin.top)+'px';
                refNode.style.left = Str(refNode[$].rect.left - parentRect.left - refNode[$].margin.left)+'px';
                refNode = next;
            }
            if (refNode[$].animation) refNode[$].animation.stop();
            refNode[$].index++;
            refNode[$].rect.prev.top = refNode[$].rect.top;
            refNode[$].rect.prev.left = refNode[$].rect.left;
            refNode[$].rect.top = movedNode[$].rect.prev.top;
            refNode[$].rect.left = movedNode[$].rect.prev.left;
            refNode.style.top = Str(refNode[$].rect.top - parentRect.top - refNode[$].margin.top)+'px';
            refNode.style.left = Str(refNode[$].rect.left - parentRect.left - refNode[$].margin.left)+'px';
            animate(target, ms, {
                top: target[$].rect.top - target[$].rect.prev.top,
                left: target[$].rect.left - target[$].rect.prev.left
            });
        }
        else if (0 < dir)
        {
            limitNode = movedNode.nextElementSibling;
            // Move `movedNode` after the `refNode`
            if (first === movedNode) first = limitNode;
            if (refNode.nextElementSibling)
            {
                parent.insertBefore(movedNode, refNode.nextElementSibling);
            }
            else
            {
                parent.appendChild(movedNode);
                last = movedNode;
            }
            //items.splice(movedNode[$].index, 1);
            //items.splice(refNode[$].index, 0, movedNode);
            movedNode[$].index = refNode[$].index;
            refNode = limitNode;
            next = movedNode;
            next[$].rect.prev.top = next[$].rect.top;
            next[$].rect.prev.left = next[$].rect.left;
            do
            {
                if (refNode[$].animation) refNode[$].animation.stop();
                refNode[$].index--;
                refNode[$].rect.prev.top = refNode[$].rect.top;
                refNode[$].rect.prev.left = refNode[$].rect.left;
                refNode[$].rect.top = next[$].rect.prev.top;
                refNode[$].rect.left = next[$].rect.prev.left;
                refNode.style.top = Str(refNode[$].rect.top - parentRect.top - refNode[$].margin.top)+'px';
                refNode.style.left = Str(refNode[$].rect.left - parentRect.left - refNode[$].margin.left)+'px';
                next = refNode;
                refNode = refNode.nextElementSibling;
            }
            while ((refNode) && (refNode !== movedNode));
            movedNode[$].rect.top = next[$].rect.prev.top;
            movedNode[$].rect.left = next[$].rect.prev.left;
            animate(target, ms, {
                top: target[$].rect.top - target[$].rect.prev.top,
                left: target[$].rect.left - target[$].rect.prev.left
            });
        }
    };

    move = UNRESTRICTED === TYPE ? move2D : move1D;
    intersect = UNRESTRICTED === TYPE ? intersect2D : intersect1D;

    var dragStart = function(e) {
        if (isDraggingStarted || !self.opts.container) return;
        // not with right click
        if (mouse_evt.test(e.type) && (0 !== e.button)) return;

        clear();

        handler = e.target;
        if (
            !handler
            || !hasClass(handler, self.opts.handle || 'dnd-sortable-handle')
        )
        {
            clear();
            return;
        }

        dragged = closestElement(handler, self.opts.item || 'dnd-sortable-item');
        if (!dragged)
        {
            clear();
            return;
        }

        parent = dragged.parentNode;
        if (
            !parent
            || (('string' === typeof(self.opts.container))
            && (parent.id !== self.opts.container))
            || (('string' !== typeof(self.opts.container))
            && (parent !== self.opts.container))
        )
        {
            clear();
            return;
        }

        if ('function' === typeof self.opts.onStart)
            self.opts.onStart(dragged);

        if ('function' === typeof self.opts.itemFilter)
        {
            dragged = self.opts.itemFilter(dragged);
            if (!dragged)
            {
                clear();
                return;
            }
        }

        isDraggingStarted = true;
        e.preventDefault && e.preventDefault();
        e.stopPropagation && e.stopPropagation();
        e.stopImmediatePropagation && e.stopImmediatePropagation();

        prepare();

        scroll = computeScroll(parent);
        lastX = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientX : e.clientX;
        lastY = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientY : e.clientY;
        X0 = lastX + parentRect.left - dragged[$].rect.left + dragged[$].margin.left;
        Y0 = lastY + parentRect.top - dragged[$].rect.top + dragged[$].margin.top;

        if (UNRESTRICTED === TYPE)
        {
            dragged.style.top = Str(lastY-Y0)+'px';
            dragged.style.left = Str(lastX-X0)+'px';
        }
        else
        {
            dragged.style[coord] = Str(HORIZONTAL === TYPE ? lastX-X0 : lastY-Y0)+'px';
        }
    };

    var dragMove = throttle(function(e) {
        var hovered, p = 0.0, Y, X, deltaX, deltaY, delta, centerX, centerY,
            c = 'top', s = 'height', zc = 'left', zs = 'width', z, d = 50;

        if (VERTICAL === TYPE)
        {
            zc = 'top';
            zs = 'height';
        }

        X = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientX : e.clientX;
        Y = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientY : e.clientY;
        deltaX = X - lastX;
        deltaY = Y - lastY;
        //dragged[$].r = dragged.getBoundingClientRect();
        dragged[$].r.top = Y - Y0 +  parentRect.top + dragged[$].margin.top;
        dragged[$].r.left = X - X0 +  parentRect.left + dragged[$].margin.left;
        centerX = scroll.X + dragged[$].r.left + dragged[$].r.width / 2;
        centerY = scroll.Y + dragged[$].r.top + dragged[$].r.height / 2;
        z = dragged[$].r[zc];

        hovered = elementsAt(X, Y) // current mouse pos
                .concat(VERTICAL === TYPE ? [] : elementsAt(scroll.X + dragged[$].r.left + 2, centerY)) // left side
                .concat(VERTICAL === TYPE ? [] : elementsAt(scroll.X + dragged[$].r.left + dragged[$].r.width - 2, centerY)) // right side
                .concat(HORIZONTAL === TYPE ? [] : elementsAt(centerX, scroll.Y + dragged[$].r.top + 2)) // top side
                .concat(HORIZONTAL === TYPE ? [] : elementsAt(centerX, scroll.Y + dragged[$].r.top + dragged[$].r.height - 2)) // bottom side
                .reduce(function(candidate, el) {
                    if ((el !== dragged) && (el.parentNode === parent))
                    {
                        var pp = intersect(dragged, el, coord, size);
                        if (pp > p)
                        {
                            p = pp;
                            candidate = el;
                        }
                    }
                    return candidate;
                }, null);


        if (UNRESTRICTED === TYPE)
        {
            if (
                !hovered
                && (dragged !== first)
                && (0 <= first[$].rect[zc] - (z + dragged[$].rect[zs]))
                && (first[$].rect[zc] - (z + dragged[$].rect[zs]) < d)
                && (0.7 < (p = intersect1D(dragged, first, c, s)))
            )
                hovered = first;

            if (
                !hovered
                && (dragged !== last)
                && (0 <= z - (last[$].rect[zc] + last[$].rect[zs]))
                && (z - (last[$].rect[zc] + last[$].rect[zs]) < d)
                && (0.7 < (p = intersect1D(dragged, last, c, s)))
            )
                hovered = last;

            dragged.style.top = Str(Y - Y0)+'px';
            dragged.style.left = Str(X - X0)+'px';
            delta = hovered ? hovered[$].index - dragged[$].index : (stdMath.abs(deltaY) >= stdMath.abs(deltaX) ? deltaY : deltaX);
        }
        else
        {
            if (
                !hovered
                && (dragged !== first)
                && (first[$].rect[zc] > (z + dragged[$].rect[zs]))
            )
                hovered = first;

            if (
                !hovered
                && (dragged !== last)
                && (z > (last[$].rect[zc] + last[$].rect[zs]))
            )
                hovered = last;

            if (HORIZONTAL === TYPE)
            {
                dragged.style[coord] = Str(X - X0)+'px';
                delta = deltaX;
            }
            else
            {
                dragged.style[coord] = Str(Y - Y0)+'px';
                delta = deltaY;
            }
        }

        if (
            closest
            && (
                (0 > dir && 0 < delta && overlap < 0.5)
                || (0 < dir && 0 > delta && overlap < 0.5)
                || (hovered && (closest !== hovered) && (overlap < p))
                || (!intersect(dragged, closest, coord, size))
            )
        )
        {
            removeClass(closest, self.opts.closestItem || 'dnd-sortable-closest');
            overlap = 0; closest = null;
        }

        if (!closest && hovered && p)
        {
            closest = hovered;
            dir = 0 < delta ? 1 : -1;
            overlap = p;
            moved = false;
        }

        lastX = X;
        lastY = Y;

        if (closest)
        {
            p = p || intersect(dragged, closest, coord, size);
            if (p)
            {
                overlap = p;
                if (p > 0.2)
                {
                    addClass(closest, self.opts.closestItem || 'dnd-sortable-closest');
                    if ((p > 0.5) && !moved)
                    {
                        moved = true;
                        move(dragged, closest, dir, self.opts.animationMs || 0);
                    }
                }
                else
                {
                    removeClass(closest, self.opts.closestItem || 'dnd-sortable-closest');
                }
            }
            else
            {
                removeClass(closest, self.opts.closestItem || 'dnd-sortable-closest');
                overlap = 0; closest = null;
            }
        }
    }, 60);

    var prepare = function() {
        parentRect = parent.getBoundingClientRect();
        parentStyle = storeStyle(parent, ['width', 'height', 'box-sizing']);
        items = [].map.call(parent.children, function(el, index) {
            var r = el.getBoundingClientRect(), style = computedStyle(el);
            el[$] = {
                index: index,
                rect: {
                    top: r.top,
                    left: r.left,
                    width: r.width,
                    height: r.height,
                    prev: {}
                },
                r: {
                    top: r.top,
                    left: r.left,
                    width: r.width,
                    height: r.height
                },
                margin: {
                    top: parseInt(style.marginTop) || 0,
                    right: parseInt(style.marginRight) || 0,
                    bottom: parseInt(style.marginBottom) || 0,
                    left: parseInt(style.marginLeft) || 0
                },
                style: storeStyle(el, [
                    'position',
                    'box-sizing',
                    'overflow',
                    'margin',
                    'margin-top',
                    'margin-left',
                    'margin-right',
                    'margin-bottom',
                    'top',
                    'left',
                    'width',
                    'height',
                    'transform',
                    'transition'
                ]),
                animation: null
            };
            return el;
        });
        if (items.length)
        {
            first = items[0];
            last = items[items.length-1];
        }
        addClass(parent, self.opts.activeArea || 'dnd-sortable-area');
        parent.style.boxSizing = 'border-box';
        parent.style.width = Str(parentRect.width) + 'px';
        parent.style.height = Str(parentRect.height) + 'px';
        dragged.draggable = false; // disable native drag
        addClass(dragged, self.opts.activeItem || 'dnd-sortable-dragged');
        items.forEach(function(el) {
            el.style.position = 'absolute';
            el.style.boxSizing = 'border-box';
            el.style.overflow = 'hidden';
            el.style.top = Str(el[$].rect.top - parentRect.top - el[$].margin.top)+'px';
            el.style.left = Str(el[$].rect.left - parentRect.left - el[$].margin.left)+'px';
            el.style.width = Str(el[$].rect.width)+'px';
            el.style.height = Str(el[$].rect.height)+'px';
        });
        addEvent(DOC, 'touchmove', dragMove, false);
        addEvent(DOC, 'touchend', dragEnd, false);
        addEvent(DOC, 'touchcancel', dragEnd, false);
        addEvent(DOC, 'mousemove', dragMove, false);
        addEvent(DOC, 'mouseup', dragEnd, false);
    };

    var restore = function() {
        if (isDraggingStarted)
        {
            removeEvent(DOC, 'touchmove', dragMove, false);
            removeEvent(DOC, 'touchend', dragEnd, false);
            removeEvent(DOC, 'touchcancel', dragEnd, false);
            removeEvent(DOC, 'mousemove', dragMove, false);
            removeEvent(DOC, 'mouseup', dragEnd, false);
            removeClass(parent, self.opts.activeArea || 'dnd-sortable-area');
            restoreStyle(parent, ['width', 'height', 'box-sizing'], parentStyle);
            if (closest) removeClass(closest, self.opts.closestItem || 'dnd-sortable-closest');
            removeClass(dragged, self.opts.activeItem || 'dnd-sortable-dragged');
            items.forEach(function(el) {
                restoreStyle(el, [
                    'position',
                    'box-sizing',
                    'overflow',
                    'margin',
                    'margin-top',
                    'margin-left',
                    'margin-right',
                    'margin-bottom',
                    'top',
                    'left',
                    'width',
                    'height',
                    'transform',
                    'transition'
                ]);
                el[$] = null;
            });
            isDraggingStarted = false;
        }
    };

    var dragEnd = function(e) {
        var el = dragged;
        restore();
        clear();
        if ('function' === typeof self.opts.onEnd)
            self.opts.onEnd(el);
    };

    self.start = function() {
        if (!attached)
        {
            attached = true;
            clear();
            addEvent(DOC, 'touchstart', dragStart, {capture:true, passive:false});
            addEvent(DOC, 'mousedown', dragStart, {capture:true, passive:false});
        }
    };

    self.stop = function() {
        if (attached)
        {
            attached = false;
            removeEvent(DOC, 'touchstart', dragStart, {capture:true, passive:false});
            removeEvent(DOC, 'mousedown', dragStart, {capture:true, passive:false});
            restore();
            clear();
        }
    };
}

function AreaSortable(type, opts)
{
    var self = this;
    if (!(self instanceof AreaSortable)) return new AreaSortable(type, opts);
    self.opts = opts || {};
    switch (Str(type || 'vertical').toLowerCase())
    {
        case 'unrestricted':
            setup(self, UNRESTRICTED);
            break;
        case 'horizontal':
            setup(self, HORIZONTAL);
            break;
        default:
            setup(self, VERTICAL);
            break;
    }
    self.start();
}
AreaSortable.VERSION = VERSION;
AreaSortable.prototype = {
    constructor: AreaSortable
    ,opts: null
    ,start: null
    ,stop: null
    ,dispose: function() {
        var self = this;
        if (self.stop) self.stop();
        self.opts = null;
        self.start = null;
        self.stop = null;
        return self;
    }
};

return AreaSortable;
});
/**
*  area-sortable.js
*  A simple js class to sort elements of an area smoothly using drag-and-drop (desktop and mobile)
*  @VERSION: 1.1.0
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

var VERSION = '1.1.0', DOC = window.document,
    $ = '$areaSortable', RECT = 'rect', STYLE = 'style',
    MARGIN = 'margin', PADDING = 'padding',
    LEFT = 'left', RIGHT = 'right', WIDTH = 'width',
    TOP = 'top', BOTTOM = 'bottom', HEIGHT = 'height',
    NEXT = 'nextElementSibling', PREV = 'previousElementSibling',
    VERTICAL = 1, HORIZONTAL = 2,
    UNRESTRICTED = VERTICAL + HORIZONTAL,
    stdMath = Math, Str = String, int = parseInt,
    hasProp = Object.prototype.hasOwnProperty,
    trim_re = /^\s+|\s+$/g, mouse_evt = /mousedown|pointerdown/,
    trim = Str.prototype.trim
        ? function(s) {return s.trim();}
        : function(s) {return s.replace(trim_re, '');},
    eventOptionsSupported = null
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
    if (null == eventOptionsSupported) eventOptionsSupported = hasEventOptions();
    if (target.attachEvent) target.attachEvent('on' + event, handler);
    else target.addEventListener(event, handler, eventOptionsSupported ? options : ('object' === typeof(options) ? !!options.capture : !!options));
}
function removeEvent(target, event, handler, options)
{
    if (null == eventOptionsSupported) eventOptionsSupported = hasEventOptions();
    // if (el.removeEventListener) not working in IE11
    if (target.detachEvent) target.detachEvent('on' + event, handler);
    else target.removeEventListener(event, handler, eventOptionsSupported ? options : ('object' === typeof(options) ? !!options.capture : !!options));
}
function computedStyle(el)
{
    return ('function' === typeof(window.getComputedStyle) ? window.getComputedStyle(el) : el.currentStyle) || {};
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
function storeStyle(el, props)
{
    return props.reduce(function(style, prop){
        style[prop] = el[STYLE].getPropertyValue(prop);
        return style;
    }, {});
}
function restoreStyle(el, props, style)
{
    style = style || el[$][STYLE];
    props.forEach(function(prop){
        if (hasProp.call(style, prop) && ('' !== style[prop])) el[STYLE][prop] = style[prop];
        else el[STYLE].removeProperty(prop);
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
                if (el[STYLE].transform === trf && el[STYLE].transition === trs)
                {
                    el[STYLE].transition = 'none';
                    el[STYLE].transform = 'none';
                }
                return el;
            }
        ;
        el[STYLE].transition = 'none';
        el[STYLE].transform = 'translate3d(' + Str(-(offset[LEFT] || 0)) + 'px,' + Str(-(offset[TOP] || 0)) + 'px,0)';
        repaint(el);
        el[STYLE].transform = trf;
        el[STYLE].transition = trs;
        time = setTimeout(stop, ms);
        el[$].animation = {stop: stop};
    }
    return el;
}
function intersect1D(nodeA, nodeB, axis, size)
{
    var rectA = nodeA[$].r, rectB = nodeB[$][RECT];

    return stdMath.max(
        0.0,
        stdMath.min(
            1.0,
            stdMath.max(
                0,
                stdMath.min(
                    rectA[axis] + rectA[size],
                    rectB[axis] + rectB[size]
                )
                -
                stdMath.max(
                    rectA[axis],
                    rectB[axis]
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
function intersect2D(nodeA, nodeB, axis, size)
{
    var rectA = nodeA[$].r, rectB = nodeB[$][RECT],
        overlapX = 0, overlapY = 0;

    overlapX = stdMath.max(
        0,
        stdMath.min(
            rectA[LEFT] + rectA[WIDTH],
            rectB[LEFT] + rectB[WIDTH]
        )
        -
        stdMath.max(
            rectA[LEFT],
            rectB[LEFT]
        )
    );
    overlapY = stdMath.max(
        0,
        stdMath.min(
            rectA[TOP] + rectA[HEIGHT],
            rectB[TOP] + rectB[HEIGHT]
        )
        -
        stdMath.max(
            rectA[TOP],
            rectB[TOP]
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
                    rectA[WIDTH],
                    rectB[WIDTH]
                )
                *
                stdMath.min(
                    rectA[HEIGHT],
                    rectB[HEIGHT]
                )
            )
        )
    );
}
function updateIndex(el, limit, dir, placeholder)
{
    el = el[(0 > dir ? NEXT : PREV)];
    while (el)
    {
        if (el !== placeholder) el[$].index += (0 > dir ? 1 : -1);
        if (el === limit) return;
        el = el[(0 > dir ? NEXT : PREV)];
    }
}
function lineStart(el, line)
{
    var next;
    //while ((el[$].line < line) && (next = el[NEXT])) el = next;
    while ((next = el[PREV]) && (next[$] && next[$].line >= line)) el = next;
    return el;
}
function layout1(el, line, parent, movedNode, placeholder, axis, size, axis_opposite)
{
    // layout "horizontal" positions and lines
    // to compute which "visual" line {el} is placed
    // assume no absolute or fixed positioning
    // and row-first ordering instead of column-first (default browser element ordering)
    var runningEnd = 0, end;
    while (el)
    {
        if (el !== placeholder)
        {
            if (el[$] && el[$].animation) el[$].animation.stop();
            end = el[$][MARGIN][axis] + el[$][RECT][size] + el[$][MARGIN][axis_opposite];
            if ((0 < runningEnd) && (parent[PADDING][axis] + runningEnd + end + parent[PADDING][axis_opposite] > parent[size]))
            {
                line++;
                runningEnd = 0;
            }
            el[$].line = line;
            el[$].prev[axis] = el[$][RECT][axis];
            el[$][RECT][axis] = parent[axis] + parent[PADDING][axis] + runningEnd + el[$][MARGIN][axis];
            if (el === movedNode)
                placeholder[STYLE][axis] = Str(el[$][RECT][axis]/* - el[$][MARGIN][axis]*/ - parent[axis]) + 'px';
            else
                el[STYLE][axis] = Str(el[$][RECT][axis] - el[$][MARGIN][axis] - parent[axis]) + 'px';
            runningEnd += end;
        }
        el = el[NEXT];
    }
}
function layout2(el, lines, parent, movedNode, placeholder, axis, size, axis_opposite)
{
    // layout "vertical" positions
    // to compute which "visual" line {el} is placed
    // assume no absolute or fixed positioning
    // and row-first ordering instead of column-first (default browser element ordering)
    var o = el, currentLine = el[$].line, lineSize = 0, line, lineTop, end;
    while (el)
    {
        if (el !== placeholder)
        {
            line = el[$].line;
            end = el[$][MARGIN][axis] + el[$][RECT][size] + el[$][MARGIN][axis_opposite];
            if (line === currentLine)
            {
                lineSize = stdMath.max(lineSize, end);
            }
            else
            {
                lines[line] = lines[currentLine] + lineSize;
                currentLine = line;
                lineSize = end;
            }
        }
        el = el[NEXT];
    }
    if (0 < lineSize) lines[currentLine + 1] = lines[currentLine] + lineSize;
    el = o;
    while (el)
    {
        if (el !== placeholder)
        {
            line = el[$].line;
            lineTop = lines[line];
            el[$].prev[axis] = el[$][RECT][axis];
            switch(el[$].$.verticalAlign)
            {
                // TODO: support more vertical align options
                case 'bottom':
                    el[$][RECT][axis] = parent[axis] + lines[line + 1] - el[$][RECT][size] - el[$][MARGIN][axis_opposite];
                    break;
                case 'top':
                default:
                    el[$][RECT][axis] = parent[axis] + lineTop + el[$][MARGIN][axis];
                    break;
            }
            if (el === movedNode)
                placeholder[STYLE][axis] = Str(el[$][RECT][axis]/* - el[$][MARGIN][axis]*/ - parent[axis]) + 'px';
            else
                el[STYLE][axis] = Str(el[$][RECT][axis] - el[$][MARGIN][axis] - parent[axis]) + 'px';
        }
        el = el[NEXT];
    }
}

function setup(self, TYPE)
{
    var attached = false, canHandle = false, isDraggingStarted = false, isTouch = false,
        placeholder, dragged, handler, closest, first, last, parent, items, lines,
        parentRect, parentComputedStyle, parentStyle,
        X0, Y0, lastX, lastY, scroll, dir, overlap, moved,
        move, intersect, hasSymmetricItems = false,
        size = HORIZONTAL === TYPE ? WIDTH : HEIGHT,
        axis = HORIZONTAL === TYPE ? LEFT : TOP,
        axis_opposite = LEFT === axis ? RIGHT : BOTTOM
    ;

    var clear = function() {
        placeholder = null;
        dragged = null;
        handler = null;
        closest = null;
        first = null;
        last = null;
        parent = null;
        parentRect = null;
        parentStyle = null;
        parentComputedStyle = null;
        items = null;
        lines = null;
        moved = false;
        overlap = 0;
    };

    var prepare = function() {
        var line = 0, runningEnd = 0, mrg = 0, axis = LEFT, size = WIDTH, axis_opposite = RIGHT,
            tag = (parent.tagName || '').toLowerCase();

        parentStyle = storeStyle(parent, ['width', 'height', 'box-sizing']);
        parentComputedStyle = computedStyle(parent);
        parentRect = parent.getBoundingClientRect();
        parentRect[PADDING] = {
            left: int(parentComputedStyle.paddingLeft) || 0,
            right: int(parentComputedStyle.paddingRight) || 0
        };
        items = [].map.call(parent.children, function(el, index) {
            var end, r = el.getBoundingClientRect(), style = computedStyle(el);
            el[$] = {
                index: index,
                line: 0,
                prev: {},
                rect: {
                    top: r[TOP],
                    left: r[LEFT],
                    width: r[WIDTH],
                    height: r[HEIGHT]
                },
                r: {
                    top: r[TOP],
                    left: r[LEFT],
                    width: r[WIDTH],
                    height: r[HEIGHT]
                },
                margin: {
                    top: int(style.marginTop) || 0,
                    right: int(style.marginRight) || 0,
                    bottom: int(style.marginBottom) || 0,
                    left: int(style.marginLeft) || 0
                },
                $: style,
                style: storeStyle(el, [
                    'position',
                    'box-sizing',
                    'overflow',
                    'top',
                    'left',
                    'width',
                    'height',
                    'transform',
                    'transition'
                ]),
                animation: null
            };
            // to compute which "visual" line {el} is placed
            // assume no absolute or fixed positioning
            // and row-first ordering instead of column-first (default browser element ordering)
            end = el[$][MARGIN][axis] + el[$][RECT][size] + el[$][MARGIN][axis_opposite];
             // does not miss lines
            if ((0 < runningEnd) && (parentRect[PADDING][axis] + runningEnd + end + parentRect[PADDING][axis_opposite] > parentRect[size]))
            {
                line++;
                runningEnd = 0;
                mrg = 0;
            }
            el[$].line = line;
            runningEnd += end /*+ mrg*/;
            //mrg += el[$][MARGIN][axis_opposite];
            return el;
        });
        if (items.length)
        {
            first = items[0];
            last = items[items.length-1];
        }

        axis = TOP; size = HEIGHT; axis_opposite = BOTTOM;
        // at most so many lines as items, pre-allocate mem to avoid changing array size all the time
        lines = new Array(items.length);
        items.forEach(function(el){
            // take 1st (highest) element of each line to define the visual line start position
            // take care of margin bottom/top collapse between siblings and parent/child
            var lineNum = el[$].line, lineStart = el[$][RECT][axis] - el[$][MARGIN][axis] - parentRect[axis];
            lines[lineNum] = null == lines[lineNum] ? lineStart : stdMath.min(lineStart, lines[lineNum]);
        });

        addClass(parent, self.opts.activeArea || 'dnd-sortable-area');
        parent[STYLE].boxSizing = 'border-box';
        parent[STYLE][WIDTH] = Str(parentRect[WIDTH]) + 'px';
        parent[STYLE][HEIGHT] = Str(parentRect[HEIGHT]) + 'px';
        dragged.draggable = false; // disable native drag
        addClass(dragged, self.opts.activeItem || 'dnd-sortable-dragged');
        hasSymmetricItems = true;
        items.forEach(function(el) {
            var ref = items[0];
            el[STYLE].position = 'absolute';
            el[STYLE].boxSizing = 'border-box';
            el[STYLE].overflow = 'hidden';
            el[STYLE][TOP] = Str(el[$][RECT][TOP] - parentRect[TOP] - el[$][MARGIN][TOP]) + 'px';
            el[STYLE][LEFT] = Str(el[$][RECT][LEFT] - parentRect[LEFT] - el[$][MARGIN][LEFT]) + 'px';
            el[STYLE][WIDTH] = Str(el[$][RECT][WIDTH]) + 'px';
            el[STYLE][HEIGHT] = Str(el[$][RECT][HEIGHT]) + 'px';
            if (
                (el[$][RECT][WIDTH] !== ref[$][RECT][WIDTH])
                || (el[$][RECT][HEIGHT] !== ref[$][RECT][HEIGHT])
                || (el[$][MARGIN][TOP] !== ref[$][MARGIN][TOP])
                || (el[$][MARGIN][BOTTOM] !== ref[$][MARGIN][BOTTOM])
                || (el[$][MARGIN][LEFT] !== ref[$][MARGIN][LEFT])
                || (el[$][MARGIN][RIGHT] !== ref[$][MARGIN][RIGHT])
            )
                hasSymmetricItems = false;
        });
        placeholder = DOC.createElement('ul' === tag || 'ol' === tag ? 'li' : ('tr' === tag ? 'td' : ('tbody' === tag || 'thead' === tag || 'tfoot' === tag || 'table' === tag ? 'tr' : 'span')));
        addClass(placeholder, self.opts.placeholder || 'dnd-sortable-placeholder');
        placeholder[STYLE].position = 'absolute';
        placeholder[STYLE].display = 'block';
        placeholder[STYLE].boxSizing = 'border-box';
        placeholder[STYLE].margin = '0';
        if (isTouch)
        {
            addEvent(DOC, 'touchmove', dragMove, false);
            addEvent(DOC, 'touchend', dragEnd, false);
            addEvent(DOC, 'touchcancel', dragEnd, false);
        }
        else
        {
            addEvent(DOC, 'mousemove', dragMove, false);
            addEvent(DOC, 'mouseup', dragEnd, false);
        }
    };

    var restore = function() {
        if (isDraggingStarted)
        {
            if (isTouch)
            {
                removeEvent(DOC, 'touchmove', dragMove, false);
                removeEvent(DOC, 'touchend', dragEnd, false);
                removeEvent(DOC, 'touchcancel', dragEnd, false);
            }
            else
            {
                removeEvent(DOC, 'mousemove', dragMove, false);
                removeEvent(DOC, 'mouseup', dragEnd, false);
            }
            if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
            removeClass(parent, self.opts.activeArea || 'dnd-sortable-area');
            restoreStyle(parent, ['width', 'height', 'box-sizing'], parentStyle);
            if (closest) removeClass(closest, self.opts.closestItem || 'dnd-sortable-closest');
            removeClass(dragged, self.opts.activeItem || 'dnd-sortable-dragged');
            items.forEach(function(el) {
                restoreStyle(el, [
                    'position',
                    'box-sizing',
                    'overflow',
                    'top',
                    'left',
                    'width',
                    'height',
                    'transform',
                    'transition'
                ]);
                /*if ('absolute' === el[$].$.position)
                {
                    // item has probably moved, update the final position
                    el[STYLE][TOP] = Str(el[$][RECT][TOP] - parentRect[TOP] - el[$][MARGIN][TOP]) + 'px';
                    el[STYLE][LEFT] = Str(el[$][RECT][LEFT] - parentRect[LEFT] - el[$][MARGIN][LEFT]) + 'px';
                }
                else if ('fixed' === el[$].$.position)
                {
                    // item has probably moved, update the final position
                    el[STYLE][TOP] = Str(el[$][RECT][TOP] - el[$][MARGIN][TOP]) + 'px';
                    el[STYLE][LEFT] = Str(el[$][RECT][LEFT] - el[$][MARGIN][LEFT]) + 'px';
                }*/
                el[$] = null;
            });
            isDraggingStarted = false;
        }
    };

    var moveTo = function(movedNode, refNode, dir) {
        if (0 > dir)
        {
            // Move `movedNode` before the `refNode`
            if (first === refNode) first = movedNode;
            if (last === movedNode) last = placeholder[PREV]; // placeholder is right before movedNode
            parent.insertBefore(movedNode, refNode);
        }
        else if (0 < dir)
        {
            // Move `movedNode` after the `refNode`
            if (first === movedNode) first = movedNode[NEXT];
            if (refNode[NEXT])
            {
                parent.insertBefore(movedNode, refNode[NEXT]);
            }
            else
            {
                parent.appendChild(movedNode);
                last = movedNode;
            }
        }
        movedNode[$].index = refNode[$].index;
        parent.insertBefore(placeholder, movedNode);
    };

    var move1D = function(movedNode, refNode, dir, ms) {
        var target = refNode, next, limitNode, offset, delta = 0, margin = 0;
        if (0 > dir)
        {
            limitNode = movedNode[NEXT];
            moveTo(movedNode, refNode, dir);
            movedNode[$].prev[axis] = movedNode[$][RECT][axis];
            margin = movedNode[$][MARGIN][axis] - refNode[$][MARGIN][axis];
            movedNode[$][RECT][axis] = refNode[$][RECT][axis] + margin;
            placeholder[STYLE][axis] = Str(movedNode[$][RECT][axis] - parentRect[axis]) + 'px';
            delta = movedNode[$][RECT][size] - refNode[$][RECT][size];
            margin += movedNode[$][MARGIN][axis_opposite] - refNode[$][MARGIN][axis_opposite];
            while ((next = refNode[NEXT]) && (next !== limitNode))
            {
                if (refNode[$].animation) refNode[$].animation.stop();
                refNode[$].index++;
                refNode[$].prev[axis] = refNode[$][RECT][axis];
                margin += refNode[$][MARGIN][axis] - next[$][MARGIN][axis];
                refNode[$][RECT][axis] = next[$][RECT][axis] + delta + margin;
                margin += refNode[$][MARGIN][axis_opposite] - next[$][MARGIN][axis_opposite];
                refNode[STYLE][axis] = Str(refNode[$][RECT][axis] - parentRect[axis] - refNode[$][MARGIN][axis]) + 'px';
                delta += refNode[$][RECT][size] - next[$][RECT][size];
                refNode = next;
            }
            if (refNode[$].animation) refNode[$].animation.stop();
            refNode[$].index++;
            refNode[$].prev[axis] = refNode[$][RECT][axis];
            refNode[$][RECT][axis] = movedNode[$].prev[axis] + delta + margin - movedNode[$][MARGIN][axis] + refNode[$][MARGIN][axis];
            refNode[STYLE][axis] = Str(refNode[$][RECT][axis] - parentRect[axis] - refNode[$][MARGIN][axis]) + 'px';
        }
        else if (0 < dir)
        {
            limitNode = movedNode[NEXT];
            moveTo(movedNode, refNode, dir);
            refNode = limitNode;
            next = movedNode;
            margin = 0;
            delta = 0;
            next[$].prev[axis] = next[$][RECT][axis];
            do
            {
                if (refNode[$].animation) refNode[$].animation.stop();
                refNode[$].index--;
                refNode[$].prev[axis] = refNode[$][RECT][axis];
                margin += refNode[$][MARGIN][axis] - next[$][MARGIN][axis];
                refNode[$][RECT][axis] = next[$].prev[axis] + delta + margin;
                refNode[STYLE][axis] = Str(refNode[$][RECT][axis] - parentRect[axis] - refNode[$][MARGIN][axis]) + 'px';
                delta += -(next[$][RECT][size] - refNode[$][RECT][size]);
                margin += refNode[$][MARGIN][axis_opposite] - next[$][MARGIN][axis_opposite];
                next = refNode;
                refNode = refNode[NEXT];
            }
            while ((refNode) && (refNode !== placeholder));
            movedNode[$][RECT][axis] = next[$].prev[axis] + delta + margin - next[$][MARGIN][axis] + movedNode[$][MARGIN][axis];
            placeholder[STYLE][axis] = Str(movedNode[$][RECT][axis] - parentRect[axis]) + 'px';
        }
        offset = {};
        offset[axis] = target[$][RECT][axis] - target[$].prev[axis];
        animate(target, ms, offset);
    };

    var move2D = function(movedNode, refNode, dir, ms) {
        var target = refNode, line, next, limitNode;
        if (hasSymmetricItems)
        {
            // simpler, faster algorithm for symmetric items
            if (0 > dir)
            {
                limitNode = movedNode[NEXT];
                moveTo(movedNode, refNode, dir);
                movedNode[$].prev.line = movedNode[$].line;
                movedNode[$].prev[TOP] = movedNode[$][RECT][TOP];
                movedNode[$].prev[LEFT] = movedNode[$][RECT][LEFT];
                movedNode[$].line = refNode[$].line;
                movedNode[$][RECT][TOP] = refNode[$][RECT][TOP];
                movedNode[$][RECT][LEFT] = refNode[$][RECT][LEFT];
                placeholder[STYLE][TOP] = Str(movedNode[$][RECT][TOP] - parentRect[TOP]) + 'px';
                placeholder[STYLE][LEFT] = Str(movedNode[$][RECT][LEFT] - parentRect[LEFT]) + 'px';
                while ((next = refNode[NEXT]) && (next !== limitNode))
                {
                    if (refNode[$].animation) refNode[$].animation.stop();
                    refNode[$].index++;
                    refNode[$].prev.line = refNode[$].line;
                    refNode[$].prev[TOP] = refNode[$][RECT][TOP];
                    refNode[$].prev[LEFT] = refNode[$][RECT][LEFT];
                    refNode[$].line = next[$].line;
                    refNode[$][RECT][TOP] = next[$][RECT][TOP];
                    refNode[$][RECT][LEFT] = next[$][RECT][LEFT];
                    refNode[STYLE][TOP] = Str(refNode[$][RECT][TOP] - parentRect[TOP] - refNode[$][MARGIN][TOP]) + 'px';
                    refNode[STYLE][LEFT] = Str(refNode[$][RECT][LEFT] - parentRect[LEFT] - refNode[$][MARGIN][LEFT]) + 'px';
                    refNode = next;
                }
                if (refNode[$].animation) refNode[$].animation.stop();
                refNode[$].index++;
                refNode[$].prev.line = refNode[$].line;
                refNode[$].prev[TOP] = refNode[$][RECT][TOP];
                refNode[$].prev[LEFT] = refNode[$][RECT][LEFT];
                refNode[$].line = movedNode[$].prev.line;
                refNode[$][RECT][TOP] = movedNode[$].prev[TOP];
                refNode[$][RECT][LEFT] = movedNode[$].prev[LEFT];
                refNode[STYLE][TOP] = Str(refNode[$][RECT][TOP] - parentRect[TOP] - refNode[$][MARGIN][TOP]) + 'px';
                refNode[STYLE][LEFT] = Str(refNode[$][RECT][LEFT] - parentRect[LEFT] - refNode[$][MARGIN][LEFT]) + 'px';
            }
            else if (0 < dir)
            {
                limitNode = movedNode[NEXT];
                moveTo(movedNode, refNode, dir);
                refNode = limitNode;
                next = movedNode;
                next[$].prev.line = next[$].line;
                next[$].prev[TOP] = next[$][RECT][TOP];
                next[$].prev[LEFT] = next[$][RECT][LEFT];
                do
                {
                    if (refNode[$].animation) refNode[$].animation.stop();
                    refNode[$].index--;
                    refNode[$].prev.line = refNode[$].line;
                    refNode[$].prev[TOP] = refNode[$][RECT][TOP];
                    refNode[$].prev[LEFT] = refNode[$][RECT][LEFT];
                    refNode[$].line = next[$].prev.line;
                    refNode[$][RECT][TOP] = next[$].prev[TOP];
                    refNode[$][RECT][LEFT] = next[$].prev[LEFT];
                    refNode[STYLE][TOP] = Str(refNode[$][RECT][TOP] - parentRect[TOP] - refNode[$][MARGIN][TOP]) + 'px';
                    refNode[STYLE][LEFT] = Str(refNode[$][RECT][LEFT] - parentRect[LEFT] - refNode[$][MARGIN][LEFT]) + 'px';
                    next = refNode;
                    refNode = refNode[NEXT];
                }
                while ((refNode) && (refNode !== placeholder));
                movedNode[$].line = next[$].prev.line;
                movedNode[$][RECT][TOP] = next[$].prev[TOP];
                movedNode[$][RECT][LEFT] = next[$].prev[LEFT];
                placeholder[STYLE][TOP] = Str(movedNode[$][RECT][TOP] - parentRect[TOP]) + 'px';
                placeholder[STYLE][LEFT] = Str(movedNode[$][RECT][LEFT] - parentRect[LEFT]) + 'px';
            }
            animate(target, ms, {
                top: target[$][RECT][TOP] - target[$].prev[TOP],
                left: target[$][RECT][LEFT] - target[$].prev[LEFT]
            });
        }
        else
        {
            // general algorithm for asymmetric items
            if (0 > dir)
            {
                next = placeholder[PREV];
                limitNode = refNode[PREV] || refNode;
                moveTo(movedNode, refNode, dir);
            }
            else if (0 < dir)
            {
                next = movedNode[NEXT];
                limitNode = placeholder[PREV] || movedNode[NEXT];
                moveTo(movedNode, refNode, dir);
            }
            updateIndex(movedNode, next, dir, placeholder);
            line = limitNode[$].line;
            limitNode = lineStart(limitNode, line);
            // update layout
            layout1(limitNode, line, parentRect, movedNode, placeholder, LEFT, WIDTH, RIGHT);
            layout2(limitNode, lines, parentRect, movedNode, placeholder, TOP, HEIGHT, BOTTOM);
            animate(target, ms, {
                top: target[$][RECT][TOP] - target[$].prev[TOP],
                left: target[$][RECT][LEFT] - target[$].prev[LEFT]
            });
        }
    };

    move = UNRESTRICTED === TYPE ? move2D : move1D;
    intersect = UNRESTRICTED === TYPE ? intersect2D : intersect1D;

    var dragStart = function(e) {
        if (!canHandle || isDraggingStarted || !self.opts.container) return;
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

        isTouch = e.changedTouches && e.changedTouches.length;

        scroll = computeScroll(parent);
        prepare();

        lastX = isTouch ? e.changedTouches[0].clientX : e.clientX;
        lastY = isTouch ? e.changedTouches[0].clientY : e.clientY;
        X0 = lastX + parentRect[LEFT] - dragged[$][RECT][LEFT] + dragged[$][MARGIN][LEFT];
        Y0 = lastY + parentRect[TOP] - dragged[$][RECT][TOP] + dragged[$][MARGIN][TOP];

        parent.insertBefore(placeholder, dragged);
        placeholder[STYLE][WIDTH] = Str(dragged[$][RECT][WIDTH]) + 'px';
        placeholder[STYLE][HEIGHT] = Str(dragged[$][RECT][HEIGHT]) + 'px';
        placeholder[STYLE][TOP] = Str(dragged[$][RECT][TOP] - parentRect[TOP]) + 'px';
        placeholder[STYLE][LEFT] = Str(dragged[$][RECT][LEFT] - parentRect[LEFT]) + 'px';

        if (UNRESTRICTED === TYPE)
        {
            dragged[STYLE][TOP] = Str(lastY-Y0) + 'px';
            dragged[STYLE][LEFT] = Str(lastX-X0) + 'px';
        }
        else
        {
            dragged[STYLE][axis] = Str(HORIZONTAL === TYPE ? lastX-X0 : lastY-Y0) + 'px';
        }
    };

    var dragMove = throttle(function(e) {
        var hovered, p = 0.0, Y, X, deltaX, deltaY, delta, centerX, centerY,
            c = TOP, s = HEIGHT, zc = LEFT, zs = WIDTH, z, d = 50;

        if (VERTICAL === TYPE)
        {
            zc = TOP;
            zs = HEIGHT;
        }

        X = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientX : e.clientX;
        Y = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientY : e.clientY;
        deltaX = X - lastX;
        deltaY = Y - lastY;
        //dragged[$].r = dragged.getBoundingClientRect();
        dragged[$].r[TOP] = Y - Y0 +  parentRect[TOP] + dragged[$][MARGIN][TOP];
        dragged[$].r[LEFT] = X - X0 +  parentRect[LEFT] + dragged[$][MARGIN][LEFT];
        centerX = /*scroll.X +*/ dragged[$].r[LEFT] + dragged[$].r[WIDTH] / 2;
        centerY = /*scroll.Y +*/ dragged[$].r[TOP] + dragged[$].r[HEIGHT] / 2;
        z = dragged[$].r[zc];

        hovered = elementsAt(X, Y) // current mouse pos
                .concat(VERTICAL === TYPE ? [] : elementsAt(/*scroll.X +*/ dragged[$].r[LEFT] + 2, centerY)) // left side
                .concat(VERTICAL === TYPE ? [] : elementsAt(/*scroll.X +*/ dragged[$].r[LEFT] + dragged[$].r[WIDTH] - 2, centerY)) // right side
                .concat(HORIZONTAL === TYPE ? [] : elementsAt(centerX, /*scroll.Y +*/ dragged[$].r[TOP] + 2)) // top side
                .concat(HORIZONTAL === TYPE ? [] : elementsAt(centerX, /*scroll.Y +*/ dragged[$].r[TOP] + dragged[$].r[HEIGHT] - 2)) // bottom side
                .reduce(function(candidate, el) {
                    if ((el !== dragged) && (el !== placeholder) && (el.parentNode === parent))
                    {
                        var pp = intersect(dragged, el, axis, size);
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
                && (0 <= first[$][RECT][zc] - (z + dragged[$][RECT][zs]))
                && (first[$][RECT][zc] - (z + dragged[$][RECT][zs]) < d)
                && (0.7 < (p = intersect1D(dragged, first, c, s)))
            )
                hovered = first;

            if (
                !hovered
                && (dragged !== last)
                && (0 <= z - (last[$][RECT][zc] + last[$][RECT][zs]))
                && (z - (last[$][RECT][zc] + last[$][RECT][zs]) < d)
                && (0.7 < (p = intersect1D(dragged, last, c, s)))
            )
                hovered = last;

            dragged[STYLE][TOP] = Str(Y - Y0) + 'px';
            dragged[STYLE][LEFT] = Str(X - X0) + 'px';
            delta = hovered ? hovered[$].index - dragged[$].index : (stdMath.abs(deltaY) >= stdMath.abs(deltaX) ? deltaY : deltaX);
        }
        else
        {
            if (
                !hovered
                && (dragged !== first)
                && (first[$][RECT][zc] > (z + dragged[$][RECT][zs]))
            )
                hovered = first;

            if (
                !hovered
                && (dragged !== last)
                && (z > (last[$][RECT][zc] + last[$][RECT][zs]))
            )
                hovered = last;

            if (HORIZONTAL === TYPE)
            {
                dragged[STYLE][axis] = Str(X - X0) + 'px';
                delta = deltaX;
            }
            else
            {
                dragged[STYLE][axis] = Str(Y - Y0) + 'px';
                delta = deltaY;
            }
        }

        if (
            closest
            && (
                (0 > dir && 0 < delta && overlap < 0.5)
                || (0 < dir && 0 > delta && overlap < 0.5)
                || (hovered && (closest !== hovered) && (overlap < p))
                || (!intersect(dragged, closest, axis, size))
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
            p = p || intersect(dragged, closest, axis, size);
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

    var dragEnd = function(e) {
        var el = dragged;
        restore();
        clear();
        if ('function' === typeof self.opts.onEnd)
            self.opts.onEnd(el);
    };

    self.start = self.opts.callable ? function() {
        if (canHandle) return;
        attached = false;
        canHandle = true;
        self.handle = dragStart;
    } : function() {
        if (canHandle) return;
        canHandle = true;
        if (!attached)
        {
            attached = true;
            addEvent(DOC, 'touchstart', dragStart, {capture:true, passive:false});
            addEvent(DOC, 'mousedown', dragStart, {capture:true, passive:false});
        }
    };

    self.stop = function() {
        self.handle = null;
        canHandle = false;
        if (attached)
        {
            attached = false;
            removeEvent(DOC, 'touchstart', dragStart, {capture:true, passive:false});
            removeEvent(DOC, 'mousedown', dragStart, {capture:true, passive:false});
        }
        restore();
        clear();
    };
}

function AreaSortable(type, opts)
{
    var self = this;
    if (!(self instanceof AreaSortable)) return new AreaSortable(type, opts);
    self.opts = opts || {};
    type = Str(type);
    switch (type.toLowerCase())
    {
        case 'unrestricted':
            setup(self, UNRESTRICTED);
            break;
        case 'horizontal':
            setup(self, HORIZONTAL);
            break;
        case 'vertical':
            setup(self, VERTICAL);
            break;
        default:
            throw new TypeError('AreaSortable invalid sort mode:' + type);
            break;
    }
    self.start();
}
AreaSortable.VERSION = VERSION;
AreaSortable.prototype = {
    constructor: AreaSortable
    ,opts: null
    ,start: null
    ,handle: null
    ,stop: null
    ,dispose: function() {
        var self = this;
        if (self.stop) self.stop();
        self.opts = null;
        self.start = null;
        self.handle = null;
        self.stop = null;
        return self;
    }
};

return AreaSortable;
});
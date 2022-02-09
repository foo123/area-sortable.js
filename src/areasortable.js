/**
*  area-sortable.js
*  A simple js class to sort elements of an area using drag-and-drop (desktop and mobile)
*  @VERSION: 1.0.0
*
*  https://github.com/foo123/area-sortable.js
*
**/
!function( root, name, factory ) {
"use strict";
var m;
if ( ('undefined'!==typeof Components)&&('object'===typeof Components.classes)&&('object'===typeof Components.classesByID)&&Components.utils&&('function'===typeof Components.utils['import']) ) /* XPCOM */
    (root.EXPORTED_SYMBOLS = [ name ]) && (root[ name ] = factory.call( root ));
else if ( ('object'===typeof module)&&module.exports ) /* CommonJS */
    module.exports = factory.call( root );
else if ( ('function'===typeof(define))&&define.amd&&('function'===typeof(require))&&('function'===typeof(require.specified))&&require.specified(name) ) /* AMD */
    define(name,['require','exports','module'],function( ){return factory.call( root );});
else if ( !(name in root) ) /* Browser/WebWorker/.. */
    (root[ name ] = (m=factory.call( root )))&&('function'===typeof(define))&&define.amd&&define(function( ){return m;} );
}(  /* current root */          'undefined' !== typeof self ? self : this,
    /* module name */           "AreaSortable",
    /* module factory */        function( undef ) {
"use strict";

var VERSION = '1.0.0',
    $ = '$dndSortable',
    VERTICAL = 1, HORIZONTAL = 2,
    UNRESTRICTED = VERTICAL+HORIZONTAL,
    stdMath = Math, Str = String,
    hasProp = Object.prototype.hasOwnProperty,
    trim_re = /^\s+|\s+$/g,
    trim = Str.prototype.trim
        ? function(s) {return s.trim();}
        : function(s) {return s.replace(trim_re,'');}
;

if (
    window.Element
    && !hasProp.call(window.Element.prototype, $)
)
    window.Element.prototype[$] = null;

function hasClass(el, className)
{
    return el.classList
        ? el.classList.contains(className)
        : -1 !== (' ' + el.className + ' ').indexOf(' ' + className + ' ')
    ;
}
function addClass(el, className)
{
    /*if (!hasClass(el, className))
    {*/
        if (el.classList) el.classList.add(className);
        else el.className = trim('' === el.className ? className : el.className + ' ' + className);
    /*}*/
}
function removeClass(el, className)
{
    if (el.classList) el.classList.remove(className);
    else el.className = trim((' ' + el.className + ' ').replace(' ' + className + ' ', ' '));
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
    var rectA = nodeA.getBoundingClientRect(),
        rectB = nodeB.getBoundingClientRect();
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
    var rectA = nodeA.getBoundingClientRect(),
        rectB = nodeB.getBoundingClientRect(),
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

function setup(self, TYPE)
{
    var closestEle, draggingEle, handlerEle,
        parent, items, parentRect, parentStyle,
        X0, Y0, lastX, lastY, dir, moved, move, intersect,
        isDraggingStarted = false, attached = false,
        size = HORIZONTAL === TYPE ? 'width' : 'height',
        coord = HORIZONTAL === TYPE ? 'left' : 'top'
    ;

    var move1D = function(movedNode, refNode, dir) {
        var next, delta = 0, pos, limitNode;
        if (0 > dir)
        {
            limitNode = movedNode.nextElementSibling;
            pos = movedNode[$].rect[coord];
            // Move `movedNode` before the `refNode`
            parent.insertBefore(movedNode, refNode);
            movedNode[$].index = refNode[$].index;
            movedNode[$].rect[coord] = refNode[$].rect[coord];
            delta = movedNode[$].rect[size]-refNode[$].rect[size];
            while ((next = refNode.nextElementSibling) && (next !== limitNode))
            {
                refNode[$].index++;
                refNode[$].rect[coord] = next[$].rect[coord]+delta;
                refNode.style[coord] = Str(refNode[$].rect[coord]-parentRect[coord])+'px';
                delta = refNode[$].rect[size]-next[$].rect[size];
                refNode = next;
            }
            refNode[$].index++;
            refNode[$].rect[coord] = pos+delta;
            refNode.style[coord] = Str(refNode[$].rect[coord]-parentRect[coord])+'px';
        }
        else if (0 < dir)
        {
            limitNode = movedNode.previousElementSibling;
            // Move `movedNode` after the `refNode`
            if (refNode.nextElementSibling)
                parent.insertBefore(movedNode, refNode.nextElementSibling);
            else
                parent.appendChild(movedNode);
            movedNode[$].index = refNode[$].index;
            refNode = limitNode ? limitNode.nextElementSibling : refNode;
            next = movedNode;
            delta = 0;
            do
            {
                refNode[$].index--;
                pos = refNode[$].rect[coord];
                refNode[$].rect[coord] = next[$].rect[coord]+delta;
                refNode.style[coord] = Str(refNode[$].rect[coord]-parentRect[coord])+'px';
                delta = refNode[$].rect[size]-next[$].rect[size];
                next = refNode;
                refNode = refNode.nextElementSibling;
            }
            while ((refNode) && (refNode !== movedNode));
            refNode[$].rect[coord] = pos+delta;
            refNode.style[coord] = Str(refNode[$].rect[coord]-parentRect[coord])+'px';
        }
    };

    var move2D = function(movedNode, refNode, dir) {
        var next, posX, posY, limitNode;
        if (0 > dir)
        {
            limitNode = movedNode.nextElementSibling;
            posY = movedNode[$].rect.top;
            posX = movedNode[$].rect.left;
            // Move `movedNode` before the `refNode`
            parent.insertBefore(movedNode, refNode);
            //items.splice(movedNode[$].index, 1);
            //items.splice(refNode[$].index, 0, movedNode);
            movedNode[$].index = refNode[$].index;
            movedNode[$].rect.top = refNode[$].rect.top;
            movedNode[$].rect.left = refNode[$].rect.left;
            while ((next = refNode.nextElementSibling) && (next !== limitNode))
            {
                refNode[$].index++;
                refNode[$].rect.top = next[$].rect.top;
                refNode[$].rect.left = next[$].rect.left;
                refNode.style.top = Str(refNode[$].rect.top-parentRect.top)+'px';
                refNode.style.left = Str(refNode[$].rect.left-parentRect.left)+'px';
                refNode = next;
            }
            refNode[$].index++;
            refNode[$].rect.top = posY;
            refNode[$].rect.left = posX;
            refNode.style.top = Str(refNode[$].rect.top-parentRect.top)+'px';
            refNode.style.left = Str(refNode[$].rect.left-parentRect.left)+'px';
        }
        else if (0 < dir)
        {
            limitNode = movedNode.previousElementSibling;
            // Move `movedNode` after the `refNode`
            if (refNode.nextElementSibling)
                parent.insertBefore(movedNode, refNode.nextElementSibling);
            else
                parent.appendChild(movedNode);
            //items.splice(movedNode[$].index, 1);
            //items.splice(refNode[$].index, 0, movedNode);
            movedNode[$].index = refNode[$].index;
            refNode = limitNode ? limitNode.nextElementSibling : refNode;
            next = movedNode;
            do
            {
                refNode[$].index--;
                posY = refNode[$].rect.top;
                posX = refNode[$].rect.left;
                refNode[$].rect.top = next[$].rect.top;
                refNode[$].rect.left = next[$].rect.left;
                refNode.style.top = Str(refNode[$].rect.top-parentRect.top)+'px';
                refNode.style.left = Str(refNode[$].rect.left-parentRect.left)+'px';
                next = refNode;
                refNode = refNode.nextElementSibling;
            }
            while ((refNode) && (refNode !== movedNode));
            refNode[$].rect.top = posY;
            refNode[$].rect.left = posX;
            refNode.style.top = Str(refNode[$].rect.top-parentRect.top)+'px';
            refNode.style.left = Str(refNode[$].rect.left-parentRect.left)+'px';
        }
    };

    move = UNRESTRICTED === TYPE ? move2D : move1D;
    intersect = UNRESTRICTED === TYPE ? intersect2D : intersect1D;


    var dragStart = function(e) {
        if (isDraggingStarted) return;

        handlerEle = e.target;
        if (
            !handlerEle
            || !hasClass(handlerEle, self.opts.handle || 'dnd-sortable-handle')
        )
        {
            clear();
            return;
        }

        draggingEle = handlerEle.closest('.'+(self.opts.item || 'dnd-sortable-item'));
        if (!draggingEle)
        {
            clear();
            return;
        }

        parent = draggingEle.parentNode;
        if (!parent || parent.id !== self.opts.container)
        {
            clear();
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        if ('function' === typeof self.opts.onStart)
            self.opts.onStart(draggingEle);

        isDraggingStarted = true;
        closestEle = null;

        parentRect = parent.getBoundingClientRect();
        parentStyle = {
            width: parent.style.getPropertyValue('width'),
            height: parent.style.getPropertyValue('height')
        };
        items = [].map.call(parent.children, function(el, index) {
            var r = el.getBoundingClientRect();
            el[$] = {
                index: index,
                rect: {
                    top: r.top,
                    left: r.left,
                    width: r.width,
                    height: r.height
                },
                style: {
                    pos: el.style.getPropertyValue('position'),
                    top: el.style.getPropertyValue('top'),
                    left: el.style.getPropertyValue('left'),
                    width: el.style.getPropertyValue('width'),
                    height: el.style.getPropertyValue('height')
                }
            };
            return el;
        });
        addClass(parent, self.opts.activeArea || 'dnd-sortable-area');
        parent.style.width = Str(parentRect.width) + 'px';
        parent.style.height = Str(parentRect.height) + 'px';
        draggingEle.draggable = false; // disable native drag
        addClass(draggingEle, self.opts.activeItem || 'dnd-sortable-dragged');
        items.forEach(function(el) {
            el.style.position = 'absolute';
            el.style.top = Str(el[$].rect.top-parentRect.top)+'px';
            el.style.left = Str(el[$].rect.left-parentRect.left)+'px';
            el.style.width = Str(el[$].rect.width)+'px';
            el.style.height = Str(el[$].rect.height)+'px';
        });

        lastX = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientX : e.clientX;
        lastY = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientY : e.clientY;
        X0 = lastX + parentRect.left - draggingEle[$].rect.left;
        Y0 = lastY + parentRect.top - draggingEle[$].rect.top;

        if (UNRESTRICTED === TYPE)
        {
            draggingEle.style.top = Str(lastY-Y0)+'px';
            draggingEle.style.left = Str(lastX-X0)+'px';
        }
        else
        {
            draggingEle.style[coord] = Str(HORIZONTAL === TYPE ? lastX-X0 : lastY-Y0)+'px';
        }

        document.addEventListener('touchmove', dragMove, false);
        document.addEventListener('touchend', dragEnd, false);
        document.addEventListener('touchcancel', dragEnd, false);
        document.addEventListener('mousemove', dragMove, false);
        document.addEventListener('mouseup', dragEnd, false);
    };

    var dragMove = throttle(function(e) {
        var hoverEle, p = 0.0, Y, X, deltaX, deltaY, delta;

        X = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientX : e.clientX;
        Y = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientY : e.clientY;
        deltaX = X - lastX;
        deltaY = Y - lastY;

        if (UNRESTRICTED === TYPE)
        {
            draggingEle.style.top = Str(Y - Y0)+'px';
            draggingEle.style.left = Str(X - X0)+'px';
            hoverEle = document.elementsFromPoint(X, Y).reduce(function(candidate, el) {
                if (
                    (el !== draggingEle)
                    && hasClass(el, self.opts.item || 'dnd-sortable-item')
                )
                {
                    var pp = intersect(draggingEle, el, coord, size);
                    if (pp > p)
                    {
                        p = pp;
                        candidate = el;
                    }
                }
                return candidate;
            }, null);
            delta = hoverEle ? hoverEle[$].index - draggingEle[$].index : dir;
        }
        else if (HORIZONTAL === TYPE)
        {
            draggingEle.style[coord] = Str(X - X0)+'px';
            delta = deltaX;
        }
        else
        {
            draggingEle.style[coord] = Str(Y - Y0)+'px';
            delta = deltaY;
        }

        if (
            closestEle
            && (
                (0 > dir && 0 < delta)
                || (0 < dir && 0 > delta)
                || (!intersect(draggingEle, closestEle, coord, size))
            )
        )
        {
            removeClass(closestEle, self.opts.closestItem || 'dnd-sortable-closest');
            closestEle = null;
        }

        if (!closestEle)
        {
            if (UNRESTRICTED === TYPE)
            {
                hoverEle = hoverEle || document.elementsFromPoint(X, Y).reduce(function(candidate, el) {
                    if (
                        (el !== draggingEle)
                        && hasClass(el, self.opts.item || 'dnd-sortable-item')
                    )
                    {
                        var pp = intersect(draggingEle, el, coord, size);
                        if (pp > p)
                        {
                            p = pp;
                            candidate = el;
                        }
                    }
                    return candidate;
                }, null);
            }
            else
            {
                hoverEle = document.elementsFromPoint(X, Y).filter(function(el) {
                    return (el !== draggingEle) && hasClass(el, self.opts.item || 'dnd-sortable-item');
                })[0];
                if (hoverEle) p = intersect(draggingEle, hoverEle, coord, size);
            }

            if (hoverEle && p)
            {
                closestEle = hoverEle;
                dir = 0 < delta ? 1 : -1;
                moved = false;
            }
        }

        lastX = X;
        lastY = Y;

        if (closestEle)
        {
            p = p || intersect(draggingEle, closestEle, coord, size);
            if (p)
            {
                if (p >= 0.3)
                {
                    addClass(closestEle, self.opts.closestItem || 'dnd-sortable-closest');
                    if (p >= 0.6 && !moved)
                    {
                        moved = true;
                        move(draggingEle, closestEle, dir);
                    }
                }
                else
                {
                    removeClass(closestEle, self.opts.closestItem || 'dnd-sortable-closest');
                }
            }
            else
            {
                removeClass(closestEle, self.opts.closestItem || 'dnd-sortable-closest');
                closestEle = null;
            }
        }
    }, 20);

    var restore = function() {
        if (isDraggingStarted)
        {
            // Remove the handlers of `mousemove` and `mouseup`
            document.removeEventListener('touchmove', dragMove, false);
            document.removeEventListener('touchend', dragEnd, false);
            document.removeEventListener('touchcancel', dragEnd, false);
            document.removeEventListener('mousemove', dragMove, false);
            document.removeEventListener('mouseup', dragEnd, false);
            if ('' !== parentStyle.width) parent.style.width = parentStyle.width;
            else parent.style.removeProperty('width');
            if ('' !== parentStyle.height) parent.style.height = parentStyle.height;
            else parent.style.removeProperty('height');
            removeClass(parent, self.opts.activeArea || 'dnd-sortable-area');
            if (closestEle) removeClass(closestEle, self.opts.closestItem || 'dnd-sortable-closest');
            removeClass(draggingEle, self.opts.activeItem || 'dnd-sortable-dragged');
            items.forEach(function(el) {
                if ('' !== el[$].style.pos) el.style.position = el[$].style.pos;
                else el.style.removeProperty('position');
                if ('' !== el[$].style.top) el.style.top = el[$].style.top;
                else el.style.removeProperty('top');
                if ('' !== el[$].style.left) el.style.left = el[$].style.left;
                else el.style.removeProperty('left');
                if ('' !== el[$].style.width) el.style.width = el[$].style.width;
                else el.style.removeProperty('width');
                if ('' !== el[$].style.height) el.style.height = el[$].style.height;
                else el.style.removeProperty('height');
                el[$] = null;
            });
            isDraggingStarted = false;
        }
    };

    var clear = function() {
        closestEle = null;
        handlerEle = null;
        draggingEle = null;
        parent = null;
        items = null;
        parentRect = null;
        parentStyle = null;
    };

    var dragEnd = function(e) {
        restore();

        if ('function' === typeof self.opts.onEnd)
            self.opts.onEnd(draggingEle);

        clear();
    };

    self.start = function() {
        if (!attached)
        {
            attached = true;
            clear();
            document.addEventListener('touchstart', dragStart, true);
            document.addEventListener('mousedown', dragStart, true);
        }
    };

    self.stop = function() {
        if (attached)
        {
            attached = false;
            document.removeEventListener('touchstart', dragStart, true);
            document.removeEventListener('mousedown', dragStart, true);
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
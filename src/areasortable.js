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
    VERTICAL = 1, HORIZONTAL = 2,
    UNRESTRICTED = VERTICAL+HORIZONTAL,
    stdMath = Math
;

if (
    window.Element
    && !Object.prototype.hasOwnProperty.call(window.Element.prototype, '$dndSortableRect')
)
    window.Element.prototype.$dndSortableRect = null;

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

function setup(self, TYPE)
{
    var closestEle, draggingEle, handlerEle, parent, items, parentRect,
        X0, Y0, lastX, lastY, isDraggingStarted = false, attached = false,
        dir, moved, move, intersect,
        size = HORIZONTAL === TYPE ? 'width' : 'height',
        coord = HORIZONTAL === TYPE ? 'left' : 'top';

    var intersect1D = function(nodeA, nodeB) {
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
    };

    var intersect2D = function(nodeA, nodeB) {
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
    };

    var move1D = function(movedNode, refNode, dir) {
        var next, delta, pos, limitNode;
        if (0 > dir)
        {
            limitNode = movedNode.nextElementSibling;
            pos = movedNode.$dndSortableRect[coord];
            // Move `movedNode` before the `refNode`
            parent.insertBefore(movedNode, refNode);
            movedNode.$dndSortableRect[coord] = refNode.$dndSortableRect[coord];
            delta = movedNode.$dndSortableRect[size]-refNode.$dndSortableRect[size];
            while ((next = refNode.nextElementSibling) && (next !== limitNode))
            {
                refNode.$dndSortableRect[coord] = next.$dndSortableRect[coord]+delta;
                refNode.style[coord] = String(refNode.$dndSortableRect[coord]-parentRect[coord])+'px';
                delta = refNode.$dndSortableRect[size]-next.$dndSortableRect[size];
                refNode = next;
            }
            refNode.$dndSortableRect[coord] = pos+delta;
            refNode.style[coord] = String(refNode.$dndSortableRect[coord]-parentRect[coord])+'px';
        }
        else if (0 < dir)
        {
            limitNode = movedNode.previousElementSibling;
            pos = movedNode.$dndSortableRect[coord];
            // Move `movedNode` after the `refNode`
            if (refNode.nextElementSibling)
                parent.insertBefore(movedNode, refNode.nextElementSibling);
            else
                parent.appendChild(movedNode);
            movedNode.$dndSortableRect[coord] = refNode.$dndSortableRect[coord];
            delta = movedNode.$dndSortableRect[size]-refNode.$dndSortableRect[size];
            while ((next = refNode.previousElementSibling) && (next !== limitNode))
            {
                refNode.$dndSortableRect[coord] = next.$dndSortableRect[coord]-delta;
                refNode.style[coord] = String(refNode.$dndSortableRect[coord]-parentRect[coord])+'px';
                delta = refNode.$dndSortableRect[size]-next.$dndSortableRect[size];
                refNode = next;
            }
            refNode.$dndSortableRect[coord] = pos-delta;
            refNode.style[coord] = String(refNode.$dndSortableRect[coord]-parentRect[coord])+'px';
        }
    };

    var move2D = function(movedNode, refNode, dir) {
        var next, deltaX, deltaY, posX, posY, limitNode,
            movedIndex = items.indexOf(movedNode), refIndex;
        if (0 > dir)
        {
            limitNode = movedNode.nextElementSibling;
            posY = movedNode.$dndSortableRect.top;
            posX = movedNode.$dndSortableRect.left;
            // Move `movedNode` before the `refNode`
            parent.insertBefore(movedNode, refNode);
            items.splice(movedIndex, 1);
            refIndex = items.indexOf(refNode);
            items.splice(refIndex, 0, movedNode);
            movedNode.$dndSortableRect.top = refNode.$dndSortableRect.top;
            movedNode.$dndSortableRect.left = refNode.$dndSortableRect.left;
            deltaY = movedNode.$dndSortableRect.height-refNode.$dndSortableRect.height;
            deltaX = movedNode.$dndSortableRect.width-refNode.$dndSortableRect.width;
            while ((next = refNode.nextElementSibling) && (next !== limitNode))
            {
                refNode.$dndSortableRect.top = next.$dndSortableRect.top+deltaY;
                refNode.$dndSortableRect.left = next.$dndSortableRect.left+deltaX;
                refNode.style.top = String(refNode.$dndSortableRect.top-parentRect.top)+'px';
                refNode.style.left = String(refNode.$dndSortableRect.left-parentRect.left)+'px';
                deltaY = refNode.$dndSortableRect.height-next.$dndSortableRect.height;
                deltaX = refNode.$dndSortableRect.width-next.$dndSortableRect.width;
                refNode = next;
            }
            refNode.$dndSortableRect.top = posY+deltaY;
            refNode.$dndSortableRect.left = posX+deltaX;
            refNode.style.top = String(refNode.$dndSortableRect.top-parentRect.top)+'px';
            refNode.style.left = String(refNode.$dndSortableRect.left-parentRect.left)+'px';
        }
        else if (0 < dir)
        {
            limitNode = movedNode.previousElementSibling;
            posY = movedNode.$dndSortableRect.top;
            posX = movedNode.$dndSortableRect.left;
            // Move `movedNode` after the `refNode`
            if (refNode.nextElementSibling)
                parent.insertBefore(movedNode, refNode.nextElementSibling);
            else
                parent.appendChild(movedNode);
            items.splice(movedIndex, 1);
            refIndex = items.indexOf(refNode);
            items.splice(refIndex+1, 0, movedNode);
            movedNode.$dndSortableRect.top = refNode.$dndSortableRect.top;
            movedNode.$dndSortableRect.left = refNode.$dndSortableRect.left;
            deltaY = movedNode.$dndSortableRect.height-refNode.$dndSortableRect.height;
            deltaX = movedNode.$dndSortableRect.width-refNode.$dndSortableRect.width;
            while ((next = refNode.previousElementSibling) && (next !== limitNode))
            {
                refNode.$dndSortableRect.top = next.$dndSortableRect.top-deltaY;
                refNode.$dndSortableRect.left = next.$dndSortableRect.left-deltaX;
                refNode.style.top = String(refNode.$dndSortableRect.top-parentRect.top)+'px';
                refNode.style.left = String(refNode.$dndSortableRect.left-parentRect.left)+'px';
                deltaY = refNode.$dndSortableRect.height-next.$dndSortableRect.height;
                deltaX = refNode.$dndSortableRect.width-next.$dndSortableRect.width;
                refNode = next;
            }
            refNode.$dndSortableRect.top = posY-deltaY;
            refNode.$dndSortableRect.left = posX-deltaX;
            refNode.style.top = String(refNode.$dndSortableRect.top-parentRect.top)+'px';
            refNode.style.left = String(refNode.$dndSortableRect.left-parentRect.left)+'px';
        }
    };

    move = UNRESTRICTED === TYPE ? move2D : move1D;
    intersect = UNRESTRICTED === TYPE ? intersect2D : intersect1D;


    var dragStart = function(e) {
        if (isDraggingStarted) return;

        handlerEle = e.target;
        if (
            !handlerEle
            || !handlerEle.classList.contains(self.opts.handle || 'dnd-sortable-handle')
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
        items = [].map.call(parent.children, function(el) {
            var r = el.getBoundingClientRect();
            el.$dndSortableRect = {top: r.top, left: r.left, width: r.width, height: r.height};
            return el;
        });
        parent.classList.add(self.opts.activeArea || 'dnd-sortable-area');
        parent.style.width = String(parentRect.width) + 'px';
        parent.style.height = String(parentRect.height) + 'px';
        draggingEle.draggable = false; // disable native drag
        draggingEle.classList.add(self.opts.activeItem || 'dnd-sortable-dragged');
        items.forEach(function(el) {
            el.style.position = 'absolute';
            el.style.top = String(el.$dndSortableRect.top-parentRect.top)+'px';
            el.style.left = String(el.$dndSortableRect.left-parentRect.left)+'px';
            el.style.width = String(el.$dndSortableRect.width)+'px';
            el.style.height = String(el.$dndSortableRect.height)+'px';
        });

        lastX = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientX : e.clientX;
        lastY = e.changedTouches && e.changedTouches.length ? e.changedTouches[0].clientY : e.clientY;
        X0 = lastX + parentRect.left - draggingEle.$dndSortableRect.left;
        Y0 = lastY + parentRect.top - draggingEle.$dndSortableRect.top;

        if (UNRESTRICTED === TYPE)
        {
            draggingEle.style.top = String(lastY-Y0)+'px';
            draggingEle.style.left = String(lastX-X0)+'px';
        }
        else
        {
            draggingEle.style[coord] = String(HORIZONTAL === TYPE ? lastX-X0 : lastY-Y0)+'px';
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
            draggingEle.style.top = String(Y - Y0)+'px';
            draggingEle.style.left = String(X - X0)+'px';
            hoverEle = document.elementsFromPoint(X, Y).reduce(function(candidate, el) {
                if (
                    (el !== draggingEle)
                    && el.classList.contains(self.opts.item || 'dnd-sortable-item')
                )
                {
                    let pp = intersect(draggingEle, el);
                    if (pp > p)
                    {
                        p = pp;
                        candidate = el;
                    }
                }
                return candidate;
            }, null);
            delta = hoverEle ? items.indexOf(hoverEle) - items.indexOf(draggingEle) : dir;
        }
        else if (HORIZONTAL === TYPE)
        {
            draggingEle.style[coord] = String(X - X0)+'px';
            delta = deltaX;
        }
        else
        {
            draggingEle.style[coord] = String(Y - Y0)+'px';
            delta = deltaY;
        }

        if (
            closestEle
            && ((0 > dir && 0 < delta) || (0 < dir && 0 > delta))
        )
        {
            closestEle.classList.remove(self.opts.closestItem || 'dnd-sortable-closest');
            closestEle = null;
        }

        if (!closestEle)
        {
            if (UNRESTRICTED === TYPE)
            {
                hoverEle = hoverEle || document.elementsFromPoint(X, Y).reduce(function(candidate, el) {
                    if (
                        (el !== draggingEle)
                        && el.classList.contains(self.opts.item || 'dnd-sortable-item')
                    )
                    {
                        let pp = intersect(draggingEle, el);
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
                    return (el !== draggingEle) && el.classList.contains(self.opts.item || 'dnd-sortable-item');
                })[0];
                if (hoverEle) p = intersect(draggingEle, hoverEle);
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
            p = p || intersect(draggingEle, closestEle);
            if (p)
            {
                if (p >= 0.3)
                {
                    closestEle.classList.add(self.opts.closestItem || 'dnd-sortable-closest');
                    if (!moved)
                    {
                        moved = true;
                        move(draggingEle, closestEle, dir);
                    }
                }
                else
                {
                    closestEle.classList.remove(self.opts.closestItem || 'dnd-sortable-closest');
                }
            }
            else
            {
                closestEle.classList.remove(self.opts.closestItem || 'dnd-sortable-closest');
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
            parent.style.removeProperty('width');
            parent.style.removeProperty('height');
            parent.classList.remove(self.opts.activeArea || 'dnd-sortable-area');
            if (closestEle) closestEle.classList.remove(self.opts.closestItem || 'dnd-sortable-closest');
            draggingEle.classList.remove(self.opts.activeItem || 'dnd-sortable-dragged');
            items.forEach(function(el) {
                el.$dndSortableRect = null;
                el.style.removeProperty('position');
                el.style.removeProperty('top');
                el.style.removeProperty('left');
                el.style.removeProperty('width');
                el.style.removeProperty('height');
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
    switch (String(type || 'vertical').toLowerCase())
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

import anime from 'animejs';

export default function SvgPathDrawer(containerBoundingRect, segmentCount, colors) {
    var svgElement = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    svgElement.setAttribute('class', "path-container");
    svgElement.setAttribute('width', '100%');
    svgElement.setAttribute('height', '100%');

    var innerElement = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    innerElement.setAttribute('class', 'svg-paths svg-paths-dashed');
    svgElement.appendChild(innerElement);

    var pathElements = [];
    for (var i = 0; i < segmentCount; i++) {
        var pathElement = document.createElementNS("http://www.w3.org/2000/svg", 'path');
        pathElement.setAttribute('stroke', colors[i%colors.length]);

        innerElement.appendChild(pathElement);

        pathElements.push(pathElement);
    }

    this.graphicsElement = innerElement;
    this.pathElements = pathElements;
    this.svgElement = svgElement;

    this.loopingAnimation = null;

    this.pathDrawingMode = SvgPathDrawer.PathDrawingMode.Outline;
}

SvgPathDrawer.PathDrawingMode = {
    Outline: 0,
    Trace: 1,
    Count: 2,

    toString: function(mode) {
        switch (mode) {
            case SvgPathDrawer.PathDrawingMode.Outline:
                return "OUTLINE";
            case SvgPathDrawer.PathDrawingMode.Trace:
                return "TRACE";
            default:
                return "LOL_BUG";
        }
    },
}

SvgPathDrawer.prototype.clear = function() {
    for (var i = 0; i < path.length; i++) {
        this.pathElements[i].setAttribute('d', "");
    }
};

SvgPathDrawer.prototype.drawPath = function(path) {
    for (var i = 0; i < path.length; i++) {
        var svgSegment = [];

        for (var j = 0; j < path[i].length; j++) {
            svgSegment.push(path[i][j].x + " " + path[i][j].y);
        }

        var pathString = svgSegment.join(" L");
        pathString = "M" + pathString;
        
        this.pathElements[i].setAttribute('d', pathString);
    }

    this.restartPath();
};

SvgPathDrawer.prototype.setMode = function(mode) {
    if (this.pathDrawingMode === mode) {
        return;
    }

    this.pathDrawingMode = mode;
    this.restartPath();
}

SvgPathDrawer.prototype.restartPath = function() {
    if (this.pathDrawingMode === SvgPathDrawer.PathDrawingMode.Outline) {
        this.startAnimatingDashes();
    } else {
        this.startRunningPath();
    }
}

SvgPathDrawer.prototype.startAnimatingDashes = function() {
    this.stopAnimation(this.loopingAnimation);
    this.loopingAnimation = null;

    this.resetDashArrayProps();

    var animation = anime({
        targets: this.pathElements,
        strokeDashoffset: [20, 0],
        easing: 'linear',
        duration: 1000,
        loop: true
    });

    this.loopingAnimation = animation;
};

SvgPathDrawer.prototype.startRunningPath = function() {
    this.stopAnimation(this.loopingAnimation);
    this.loopingAnimation = null;

    var totalPathLength = 0;
    for (var i = 0; i < this.pathElements.length; i++) {
        totalPathLength += this.pathElements[i].getTotalLength();
    }

    var traceLength = 30;
    var currentOffset = traceLength;
    var animations = [];

    for (var i = 0; i < this.pathElements.length; i++) {
        (function() {
            var pathElement = this.pathElements[i];
            var duration = 1.5*totalPathLength;

            var dashArray = traceLength + ',' + (totalPathLength-traceLength);
            pathElement.setAttribute('stroke-dasharray', dashArray);
            pathElement.style['stroke-dasharray'] = dashArray;

            var animation = anime({
                targets: pathElement,
                strokeDashoffset: [currentOffset, -totalPathLength+currentOffset],
                easing: 'linear',
                duration: duration,
                loop: true,
            });

            currentOffset += pathElement.getTotalLength();
            animations.push(animation);
        }).bind(this)();
    }

    this.loopingAnimation = animations;
};

SvgPathDrawer.prototype.hasLoopingAnimation = function() {
    return this.loopingAnimation !== null
}

SvgPathDrawer.prototype.stopAnimation = function(animation) {
    if (animation === null) {
        return;
    }

    if (animation.constructor === Array) {
        for (var i = 0; i < animation.length; i++) {
            this.stopAnimation(animation[i]);
        }
    } else {
        animation.pause();
    }
}

SvgPathDrawer.prototype.introAnimation = function() {
    this.resetDashArrayProps();

    var lineDrawing = anime({
        targets: this.pathElements,
        strokeDashoffset: [anime.setDashoffset, 0],
        easing: 'easeInOutSine',
        duration: 1000,
        delay: function(el, i) { return i * 250 },
    }).finished.then(this.animateToDashed.bind(this))
    .then(this.startAnimatingDashes.bind(this));
}

SvgPathDrawer.prototype.animateToDashed = function() {
    for (var i = 0; i < this.pathElements.length; i++) {
        this.pathElements[i].setAttribute('stroke-dasharray', '20, 0');
        this.pathElements[i].style['stroke-dasharray'] = '20, 0';
    }

    var dashAnimation = anime({
        targets: this.pathElements,
        strokeDasharray: '10, 10',
        easing: 'easeInOutSine',
        duration: 500
    });

    return dashAnimation.finished.then(function(dashAnim) {
        for (var i = 0; i < this.pathElements.length; i++) {
            this.resetDashArrayProps();
        }

        return Promise.resolve(dashAnim);
    }.bind(this));
}

SvgPathDrawer.prototype.resetDashArrayProps = function() {
    for (var i = 0; i < this.pathElements.length; i++) {
        // Leaving this interferes with animejs, and we get the
        // stroke-dasharray from svg-paths-dashed
        this.pathElements[i].removeAttribute('stroke-dasharray');
        this.pathElements[i].style['stroke-dasharray'] = null;
    }
}

SvgPathDrawer.prototype.flashInvalidPathSegment = function(i) {
    if (this.pathElements[i].animation !== undefined &&
            !this.pathElements[i].animation.completed) {
        this.pathElements[i].animation.seek(1.0);
    }

    var animation = anime({
        targets: this.pathElements[i],
        stroke: '#FF0000',
        'stroke-width': 6,
        easing: 'linear',
        loop: 4,
        direction: 'alternate',
        duration: 100,
    });

    this.pathElements[i].animation = animation;
};

SvgPathDrawer.prototype.getElement = function() {
    return this.svgElement;
};

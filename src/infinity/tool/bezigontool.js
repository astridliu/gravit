(function (_) {
    /**
     * The bezigon tool
     * @class GXBezigonTool
     * @extends GXPathTool
     * @constructor
     * @version 1.0
     */
    function GXBezigonTool() {
        GXPathTool.call(this);
    }

    GObject.inherit(GXBezigonTool, GXPathTool);

    /** @override */
    GXBezigonTool.prototype.getGroup = function () {
        return 'draw';
    };

    /** @override */
    GXBezigonTool.prototype.getImageClass = function () {
        return 'g-tool-bezigon';
    };

    /** @override */
    GXBezigonTool.prototype.getHint = function () {
        return GXPathTool.prototype.getHint.call(this)
            .addKey(GUIKey.Constant.OPTION, new GLocale.Key(GXBezigonTool, "shortcut.option"), true)
            .addKey(GUIKey.Constant.SHIFT, new GLocale.Key(GXBezigonTool, "shortcut.shift"), true)
            .setTitle(new GLocale.Key(GXBezigonTool, "title"));
    };

    /** @override */
    GXBezigonTool.prototype.getActivationCharacters = function () {
        return ['B', '8'];
    };

    /** @override */
    GXBezigonTool.prototype.activate = function (view, layer) {
        GXPathTool.prototype.activate.call(this, view, layer);
        layer.addEventListener(GUIMouseEvent.Drag, this._mouseDrag, this);
        layer.addEventListener(GUIMouseEvent.Move, this._mouseMove, this);
    };

    /** @override */
    GXBezigonTool.prototype.deactivate = function (view, layer) {
        GXPathTool.prototype.deactivate.call(this, view, layer);
        layer.removeEventListener(GUIMouseEvent.Drag, this._mouseDrag);
        layer.removeEventListener(GUIMouseEvent.Move, this._mouseMove);
    };

    /**
     * @param {GUIMouseEvent.Down} event
     * @private
     */
    GXBezigonTool.prototype._mouseDown = function (event) {
        var tm = new Date().getTime();
        if (tm - this._mDownTime < 300) {
            // Double-click
            return;
        }

        this._mDownTime = tm;
        this._released = false;
        var anchorPt = null;
        var clickPt;
        this._editor.updateByMousePosition(event.client, this._view.getWorldTransform());
        this._dragStarted = false;
        this._newPoint = null;
        this._editPt = null;

        if (event.button == GUIMouseEvent.BUTTON_LEFT ||
            event.button == GUIMouseEvent.BUTTON_RIGHT && gPlatform.modifiers.optionKey) {

            this._checkMode();
            clickPt = this._view.getViewTransform().mapPoint(event.client);

            if (this._mode == GXPathTool.Mode.Edit) {
                this._mouseDownOnEdit(clickPt);
            }

            this._updateCursor();
            if (this._mode != GXPathTool.Mode.Edit) {
                clickPt = this._constrainIfNeeded(clickPt, this._pathRef);
                var otherPt;
                if (this._pathEditor) {
                    if (this._mode == GXPathTool.Mode.Append) {
                        otherPt = this._pathRef.getAnchorPoints().getFirstChild();
                    } else { // this._mode == GXPathTool.Mode.Prepend
                        otherPt = this._pathRef.getAnchorPoints().getLastChild();
                    }
                }

                if (otherPt && this._pathEditor.hitAnchorPoint(otherPt, clickPt)) {
                    this._pathRef.setProperty('closed', true);
                    this._pathEditor.selectOnePoint(otherPt);
                    this._dpathRef = this._pathEditor.releasePathPreview();
                    this._pathEditor.requestInvalidation();
                    this._mode = GXPathTool.Mode.Edit;
                    this._dpathRef = this._pathEditor.getPathPreview(otherPt);
                    this._editPt = this._pathEditor.getPathPointPreview(otherPt);
                    this._pathEditor.requestInvalidation();
                } else {
                    anchorPt = this._constructNewPoint(event, clickPt);
                    this._addPoint(anchorPt, true);
                }
            }
        }
    };

    GXBezigonTool.prototype._mouseDblClick = function (event) {
        this._checkMode();
        if (this._pathEditor) {
            this._pathEditor.updatePartSelection(false);
            this._commitChanges();
        }
        return;

//        this._editor.updateByMousePosition(event.client, this._view.getWorldTransform());
//        this._reset();
    };

    /**
     * @param {GUIMouseEvent.Move} event
     * @private
     */
    GXBezigonTool.prototype._mouseMove = function (event) {
        var curPt;

        if (!this._released) {
            if (event.button == GUIMouseEvent.BUTTON_RIGHT && gPlatform.modifiers.optionKey) {
                this._mouseDrag(event);
            }
            return;
        }
/*
        curPt = this._view.getViewTransform().mapPoint(event.client);
        this._checkMode();
        this._makeHitTest(curPt);
        this._updateCursor();    */
    };

    /**
     * @param {GUIMouseEvent.Drag} event
     * @private
     */
    GXBezigonTool.prototype._mouseDrag = function (event) {
        if (this._editPt && !this._released) {
            var pt = this._view.getViewTransform().mapPoint(event.client);
            this._dragStarted = true;
            this._pathEditor.requestInvalidation();
            this._updatePoint(pt);
            this._pathEditor.requestInvalidation();
        }
        //this._editor.updateByMousePosition(event.client, this._view.getWorldTransform());
    };

    GXBezigonTool.prototype._updatePoint = function (pt) {
        if (this._dpathRef && this._editPt) {
            var newPos = this._constrainIfNeeded(pt, this._pathRef);

            if (this._editPt.getProperty('ah') ||
                this._editPt.getProperty('tp') == 'C') {
                this._editPt.setProperties(['x', 'y'], [newPos.getX(), newPos.getY()]);
            } else {
                var dx = newPos.getX() - this._editPt.getProperty('x');
                var dy = newPos.getY() - this._editPt.getProperty('y');

                this._dpathRef.beginUpdate();
                this._editPt.setProperties(['x', 'y'], [newPos.getX(), newPos.getY()]);
                var hval = this._editPt.getProperty('hlx');
                if (hval != null) {
                    this._editPt.setProperty('hlx', hval + dx);
                }
                hval = this._editPt.getProperty('hly');
                if (hval != null) {
                    this._editPt.setProperty('hly', hval + dy);
                }
                hval = this._editPt.getProperty('hrx');
                if (hval != null) {
                    this._editPt.setProperty('hrx', hval + dx);
                }
                hval = this._editPt.getProperty('hry');
                if (hval != null) {
                    this._editPt.setProperty('hry', hval + dy);
                }
                this._dpathRef.endUpdate();
            }
        }
    };

    GXBezigonTool.prototype._constructNewPoint = function (event, pt) {
        var anchorPt = new GXPath.AnchorPoint();
        anchorPt.setProperties(['x', 'y', 'ah'], [pt.getX(), pt.getY(), true]);

        if (event.button == GUIMouseEvent.BUTTON_LEFT) {
            if (gPlatform.modifiers.optionKey) {
                anchorPt.setProperty('tp', 'S');
            } else {
                anchorPt.setProperty('tp', 'N');
            }
        } else { // BUTTON_RIGHT && this._AltDown
            anchorPt.setProperty('tp', 'C');
        }

        return anchorPt;
    };

    GXBezigonTool.prototype._closeIfNeeded = function () {
        if (this._pathRef && this._newPoint &&
            (this._mode == GXPathTool.Mode.Append || this._mode == GXPathTool.Mode.Prepend)) {

            var anchorPt;
            var otherPt;
            if (this._mode == GXPathTool.Mode.Append) {
                anchorPt = this._dpathRef.getAnchorPoints().getLastChild();
                otherPt = this._pathRef.getAnchorPoints().getFirstChild();
            } else { // this._mode == GXPathTool.Mode.Prepend
                anchorPt = this._dpathRef.getAnchorPoints().getFirstChild();
                otherPt = this._pathRef.getAnchorPoints().getLastChild();
            }
            var vpt = new GXVertex();
            vpt.x = otherPt.getProperty('x');
            vpt.y = otherPt.getProperty('y');
            var px = anchorPt.getProperty('x');
            var py = anchorPt.getProperty('y');
            if (gMath.isEqualEps(px - vpt.x, 0, this._hitRaduis) &&
                gMath.isEqualEps(py - vpt.y, 0, this._hitRaduis)) {

                this._pathRef.beginUpdate();
                this._pathEditor.selectOnePoint(otherPt);
                if (gPlatform.modifiers.optionKey) {
                    otherPt.setProperties(['ah', 'tp'], [false, 'N']);
                }
                if (!otherPt.getProperty('ah')) {
                    otherPt.setProperties(['hlx', 'hly'], [anchorPt.getProperty('hlx') ,anchorPt.getProperty('hly')]);
                }
                this._dpathRef.getAnchorPoints().removeChild(anchorPt);
                this._pathRef.setProperty('closed', true);
                this._pathRef.endUpdate();
                this._pathEditor.requestInvalidation();
            }
        }
    };

    /** @override */
    GXBezigonTool.prototype._mouseRelease = function (event) {
        if (!this._released) {
            this._released = true;
            //this._editor.updateByMousePosition(event.client, this._view.getWorldTransform());
            if (this._mode == GXPathTool.Mode.Append || this._mode == GXPathTool.Mode.Prepend) {
                var clickPt = this._view.getViewTransform().mapPoint(event.client);
                this._updatePoint(clickPt);
                if (this._newPoint) {
                    this._closeIfNeeded();
                    if (!this._pathRef.getProperty('closed')) {
                        this._addPoint(this._editPt, false);
                    }
                } else if (this._editPt) {
                    this._pathEditor.applyTransform(this._pathRef);
                }
                this._commitChanges();
                // hit test result becomes invalid if any;
                //this._lastHitTest = new GXPathTool.LastHitTest();
            } else if (this._mode == GXPathTool.Mode.Edit && this._editPt) {
                if (this._dragStarted) {
                    clickPt = this._view.getViewTransform().mapPoint(event.client);
                    this._updatePoint(clickPt);
                    this._pathEditor.applyTransform(this._pathRef);
                    this._commitChanges();
                    // hit test result becomes invalid if any;
                    //this._lastHitTest = new GXPathTool.LastHitTest();
                } else {
                    this._mouseNoDragReleaseOnEdit();
                }
            }
            this._dragStarted = false;
        }
    };

    /** override */
    GXBezigonTool.prototype.toString = function () {
        return "[Object GXBezigonTool]";
    };

    _.GXBezigonTool = GXBezigonTool;
})(this);
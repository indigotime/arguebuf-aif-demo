var SVGRoot = null;
var SVGRootG = null;

var TrueCoords = null;
var GrabPoint = null;
var DragTarget = null;
var DragPan = false;

var dialogicalMode = ("plus" in getUrlVars());
var rIATMode = false;
var CurrentFocus = null;
var multiSel = [false, false, false];
var multiSelRect = {};
var CurrentlyEditing = 0;
var editMode = false;
var FormOpen = false;
var dragEdges = [];
var count = 0; //
var users = [];

var mSel = [];
var mselo = [];

var lastedit = 0;
var lasteditCollab = 0;
var groupID = 1;

const NAV_MAP = {
    "+": { dir: 1, act: 'zoom', name: 'in' } /* 187 + shift, 107 */,
    "=": { dir: 1, act: 'zoom', name: 'in' } /* 187, 61 */,
    "-": { dir: -1, act: 'zoom', name: 'out' } /* 189, 109, 173 */,
    "arrowleft": { dir: -1, act: 'move', name: 'left', axis: 0 },
    "arrowup": { dir: -1, act: 'move', name: 'up', axis: 1 },
    "arrowright": { dir: 1, act: 'move', name: 'right', axis: 0 },
    "arrowdown": { dir: 1, act: 'move', name: 'down', axis: 1 }
};

const NF = 16;
var VB = null;
var DMAX = 0;
var WMIN = 0;
let rID = null, f = 0, nav = {}, tg = Array(4);
var scale = 0;
var panZoomID = null;

/**
 * Handles mousewheel scroll and trackpad gestures. 
 * Scrolls up/down with mousewheel and swipe up/down gestures, 
 * zooms in/out with pinch gestures, pans left/right with swipe left/right gestures.
 * @param {*} event - The event to handle
 */
const panZoom = (event) => {
    var onSVG = event.target.id == "inline" || $(event.target).is('rect') || $(event.target).is('tspan');
    if (FormOpen == false && onSVG) {
        if (event.ctrlKey) { //zoom in or out
            tsvg = document.getElementById('inline').getBoundingClientRect();
            svgleft = tsvg.left;
            if (event.clientX > svgleft) {
                var direction = event.deltaY > 0 ? -1 : 1;
                if (inverse) { direction *= -1; }

                tg[2] = VB[2] / Math.pow(1.1, direction);
                tg[3] = VB[3] / Math.pow(1.1, direction);
                tg[0] = .00001 * (DMAX[0] - tg[2]);
                tg[1] = .00001 * (DMAX[1] - tg[3]);

                nav = NAV_MAP["+"]; //updateView() only uses nav.act so can use either '+' or '-'
                updateView();
            }
        }
        else {
            if (event.deltaX == 0) { //pan up or down
                var direction = event.deltaY > 0 ? 1 : -1;
                if (inverse) { direction *= -1; }
                tg[1] = parseFloat(VB[1] + .1 * direction * VB[2]);

                nav = NAV_MAP["arrowup"]; //updateView() only uses nav.axis & nav.act so can use either 'arrowup' or 'arrowdown'
                updateView();
            }
            else if (event.deltaY == 0) { // pan left & right
                var direction = event.deltaX > 0 ? 1 : -1;
                if (inverse) { direction *= -1; }
                tg[0] = parseFloat(VB[0] + .1 * direction * VB[2]);

                nav = NAV_MAP["arrowleft"]; //updateView() only uses nav.axis & nav.act so can use either 'arrowleft' or 'arrowright'
                updateView();
            }
        }
    }
}

window.shiftPress = false;
window.atkPress = false;
window.maPress = false;
window.longEdge = [false, false];
window.nodeCounter = 1;
window.textCounter = 1;
window.edgeCounter = 1;
window.unsaved = false;
window.saveImage = false;
window.undoing = false;
window.reselectSpan = false;

document.addEventListener('contextmenu', event => event.preventDefault());
window.addEventListener('keydown', myKeyDown, true);
window.addEventListener('keyup', myKeyUp, true);
document.onwheel = panZoom;

//set default settings
window.defaultSettings = JSON.parse(window.defaultSettings);
//set display settings
window.bwmode = window.defaultSettings["display"]["black_white"];
window.panMode = typeof window.defaultSettings["display"]["panBtns"] !== 'undefined' ? window.defaultSettings["display"]["panBtns"] : true;
window.inverse = typeof window.defaultSettings["display"]["inverse"] !== 'undefined' ? window.defaultSettings["display"]["inverse"] : false;
window.defaultSchemesets = [["YA", 0], ["RA", 0], ["CA", 0], ["MA", 0], ["TA", 0], ["PA", 0]]; //set scheme set settings
window.snapMode = typeof window.defaultSettings["display"]["snap"] !== 'undefined' ? window.defaultSettings["display"]["snap"] : false;
//set analysis settings
window.cqmode = window.defaultSettings["analysis"]["cq"];
window.eAddMode = window.defaultSettings["analysis"]["eAdd"];
//set timestamp settings
window.startdatestmp = window.defaultSettings["timestamp"]["startdatestmp"];
window.addTimestamps = dialogicalMode ? window.defaultSettings["timestamp"]["addTimestamps"] : false;
window.showTimestamps = dialogicalMode ? window.defaultSettings["timestamp"]["showTimestamps"] : false;
window.editTimestamp = false;

/**
 * Initializes 
 * @param {*} evt 
 */
function Init(evt) {
    updateToolbar();
    SVGRoot = document.getElementById('inline');
    SVGRootG = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    SVGRoot.appendChild(SVGRootG);
    TrueCoords = SVGRoot.createSVGPoint();
    GrabPoint = SVGRoot.createSVGPoint();
    window.sessionid = $.now().toString() + Math.random().toString().substring(3, 8);

    $("#right1").width($("#mainwrap").width() - 41);
    VB = SVGRoot.getAttribute('viewBox').split(' ').map(c => +c);
    VB_width = VB[2];
    DMAX = [10604, 135472];
    WMIN = 455;

    document.getElementById('n_file').addEventListener('change', loadFileBtn, false);


    var urlVars = getUrlVars();
    if (window.ssets == null) {
        window.ssets = {};
    }

    $('#nsetID').on("keyup", function (e) {
        if (e.key !== "Enter") { return false; }
        loadBtn();
    });

    $('#n_text').on("keydown", function (e) {
        if (e.key == "Enter" && !e.shiftKey) {
            e.preventDefault(); //prevent new lines being added
            saveNodeEdit(); closeModal('#node_edit'); //save the edit to the node
        }
    });

    //set up the pan and zoom buttons
    $('#panBtns button.arrow').mousedown(function (e) { //start panning on mousedown
        var key = "arrow" + e.target.name;
        panZoomMode(key, true);
    });
    $('#zoomBtns button').mousedown(function (e) { //start zooming on mousedown
        var key = e.target.name;
        if (key !== 'reset') { panZoomMode(key, true); }
    });
    $('#panBtns button').mouseup(function () { //stop panning or zooming on mouseup
        clearTimeout(panZoomID);
    });
    panModeOnOff();

    $('#inline').mouseout(function () { //stop panning SVG when mouse outside SVG
        DragPan = false;
        // $('#inline').css('cursor', 'grab');
        $('#inline').css('cursor', 'default');
    });

    //set defaults
    setFontSize(window.defaultSettings["display"]["font_size"]);
    setRIATMode();
    eAddModeOnOff();
    setScrollDir();
}

/**
 * Gets or creates the range around a selection
 * @param {*} selectionObject - The selection to get the range for
 * @returns The range around the selection
 */
function getRangeObject(selectionObject) {
    // console.log(selectionObject.getRangeAt);
    if (selectionObject.getRangeAt) {
        return selectionObject.getRangeAt(0);
    } else {
        var range = document.createRange();
        range.setStart(selectionObject.anchorNode, selectionObject.anchorOffset);
        range.setEnd(selectionObject.focusNode, selectionObject.focusOffset);
        return range;
    }
}


/**
 * Gets all nodes that are connected by an edge to the given node
 * @param {Node} node - The node to get the connected nodes for
 * @returns An array of the nodes connected to
 */
function getNodesIn(node) {
    var nlist = [];
    var l = edges.length;
    for (var i = 0; i < l; i++) {
        if (edges[i].toID == node.nodeID) {
            var nID = edges[i].fromID;
            var nIndex = findNodeIndex(nID);
            if (nIndex > -1) { nlist.push(nodes[nIndex]); }  //if the node exists add it
        }
    }
    return nlist;
}

/**
 * Gets all nodes that are connected by an edge from the given node
 * @param {Node} node - The node to get the connected nodes for
 * @returns An array of the nodes connected from
 */
function getNodesOut(node) {
    var nlist = [];
    var l = edges.length;
    for (var i = 0; i < l; i++) {
        if (edges[i].fromID == node.nodeID) {
            var nID = edges[i].toID;
            var nIndex = findNodeIndex(nID);
            if (nIndex > -1) { nlist.push(nodes[nIndex]); }  //if the node exists add it
        }
    }
    return nlist;
}

/**
 * Filters schemes by their scheme set
 * @param {Number} schemesetID - The ID of the scheme set to filter by
 * @returns {Boolean}
 */
function filterschemes(schemesetID) {
    // console.log(schemesetID)
    var setschemes = window.ssets[schemesetID];
    var type = document.getElementById("s_type").value;
    switch (type) {
        case "RA":
            $("#s_ischeme option").each(function () {
                $(this).show();
            });
            if (schemesetID !== "0") {
                $("#s_ischeme option").each(function () {
                    if (setschemes.indexOf($(this).val()) == -1) {
                        $(this).hide();
                    }
                });
            }
            break;
        case "CA":
            $("#s_cscheme option").each(function () {
                $(this).show();
            });
            if (schemesetID !== "0") {
                $("#s_cscheme option").each(function () {
                    if (setschemes.indexOf($(this).val()) == -1) {
                        $(this).hide();
                    }
                });
            }
            break;
        case "YA":
            $("#s_lscheme option").each(function () {
                $(this).show();
            });
            if (schemesetID !== "0") {
                $("#s_lscheme option").each(function () {
                    if (setschemes.indexOf($(this).val()) == -1) {
                        $(this).hide();
                    }
                });
            }
            break;
        case "TA":
            $("#s_tscheme option").each(function () {
                $(this).show();
            });
            if (schemesetID !== "0") {
                $("#s_tscheme option").each(function () {
                    if (setschemes.indexOf($(this).val()) == -1) {
                        $(this).hide();
                    }
                });
            }
            break;
        case "MA":
            $("#s_mscheme option").each(function () {
                $(this).show();
            });
            if (schemesetID !== "0") {
                $("#s_mscheme option").each(function () {
                    if (setschemes.indexOf($(this).val()) == -1) {
                        $(this).hide();
                    }
                });
            }
            break;
        case "PA":
            $("#s_pscheme option").each(function () {
                $(this).show();
            });
            if (schemesetID !== "0") {
                $("#s_pscheme option").each(function () {
                    if (setschemes.indexOf($(this).val()) == -1) {
                        $(this).hide();
                    }
                });
            }
            break;
        default:
            return false;
    }
}

/**
 * Sets the default scheme set
 * @param {String} type - The type to set the default for
 * @param {String} schemesetID - The ID of the scheme set to set as default
 */
function setDefaultSchemeset(type, schemesetID) {
    var index = window.defaultSchemesets.findIndex(x => x.includes(type));
    if (index == -1) { //if no default was set for that type
        window.defaultSchemesets.push([type, schemesetID]);
    } else { //if there already was a default set for that type
        window.defaultSchemesets[index][1] = schemesetID;
    }
    filterschemes(schemesetID);
}

var sort_by = function (field, reverse, primer) {
    var key = function (x) { return primer ? primer(x[field]) : x[field] };
    return function (a, b) {
        var A = key(a), B = key(b);
        return ((A < B) ? -1 : (A > B) ? +1 : 0) * [-1, 1][+!!reverse];
    }
}


/**
 * Handles turning sticky add edge mode on and off
 */
function eAddModeOnOff() {
    if (window.eAddMode) {
        $("#eadd").attr("onclick", "edgeMode('switch')");
        $("#eaddX").attr("onclick", "edgeMode('switch')");
    }
    else {
        $("#eadd").attr("onclick", "clearEdgeModal()");
        $("#eaddX").attr("onclick", "clearEdgeModal()");
    }
}

/**
 * Handles showing/hiding the pan and zoom buttons when turned on or off
 */
function panModeOnOff() {
    if (window.panMode) { $("#panBtns").show(); }
    else { $("#panBtns").hide(); }
}

/**
 * Autolayout
 */
function genldot() {
    //create a temp dot file for this analysis
    var doto = "digraph odg {";
    var ranks = "";
    var alreadyDrawn = {};
    if ("plus" in getUrlVars()) {
        doto = doto + "rankdir=RL;";
    }

    for (var i = 0, l = nodes.length; i < l; i++) { //for each node in the analysis
        dnode = nodes[i];
        dnodeID = i; //its index in the nodes array as the dot file needs integer IDs
        doto = doto + dnodeID + ' [label="xxx xxx xxx xxx xxx\\nxxx xxx xxx xxx xxx\\nxxx xxx xxx xxx xxx\\nxxx xxx xxx xxx xxx"];';

        if (dnode.type != 'I' && dnode.type != 'L') {
            dout = getNodesOut(dnode);
            for (var j = 0, ol = dout.length; j < ol; j++) { //for each node connected from
                doutID = findNodeIndex(dout[j].nodeID); //its index in the nodes array as the dot file needs integer IDs
                if (alreadyDrawn[dnodeID + "-" + doutID] !== 100) { //if not already drawn
                    doto = doto + dnodeID + ' -> ' + doutID; //add the edge
                    alreadyDrawn[dnodeID + "-" + doutID] = 100; //set that it's already been drawn

                    if ("plus" in getUrlVars() && dnode.type != 'YA' && dout[j].type != 'YA') {
                        doto = doto + " [constraint=false]";
                        if ((dnode.type == 'RA' || dnode.type == 'CA') && dout[j].type == 'I') {
                            ranks = ranks + '{ rank = same; ' + dnodeID + '; ' + doutID + '; }';
                        }
                    }
                    doto = doto + ';';
                }
            }

            din = getNodesIn(dnode);
            for (var j = 0, ol = din.length; j < ol; j++) { //for each node connected to
                dinID = findNodeIndex(din[j].nodeID); //its index in the nodes array as the dot file needs integer IDs
                if (alreadyDrawn[dinID + "-" + dnodeID] !== 100) { //if not already drawn
                    doto = doto + dinID + ' -> ' + dnodeID; //add the edge
                    alreadyDrawn[dinID + "-" + dnodeID] = 100; //set that it's already been drawn

                    if ("plus" in getUrlVars() && dnode.type != 'YA' && din[j].type != 'YA') {
                        doto = doto + " [constraint=false]";
                        if ((din[j].type == 'RA' || din[j].type == 'CA') && dnode.type == 'I') {
                            ranks = ranks + '{ rank = same; ' + dinID + '; ' + dnodeID + '; }';
                        }
                    }
                    doto = doto + ';';
                }
            }
        }
    }

    doto = doto + ranks;
    doto = doto + '}';
}

/**
 * Sets the font size for the analysis text
 * @param {String} size - The new font size
 * @returns {Boolean}
 */
function setFontSize(size) {
    if (size == "ts" || size == "tm" || size == "tl") {
        $("#left1").removeClass("ts tm tl");
        $("#left1").addClass(size);
    }
    return false;
}

/**
 * Sets Rapid IAT mode based on default settings
 */
function setRIATMode() {
    if (dialogicalMode && window.defaultSettings["analysis"]["rIAT"]) {
        window.rIATMode = true;
    } else {
        $("#riattoggle").toggleClass("on off");
    }
}

/**
 * Sets the default scroll direction to natural or reverse depending on if Mac OS detected
 */
function setScrollDir() {
    if (!inverse && navigator.userAgent.indexOf('Mac') > -1) {
        inverse = true;
        $("#inverseToggle").toggleClass("on off");
        console.log("Mac detected, scroll direction set to natural");
    }
    else if (inverse) { //set scroll direction to reverse
        inverse = false;
        $("#inverseToggle").toggleClass("on off");
    }
}

/**
 * Handles changing tabs on the settings modal
 * @param {*} evt - The event
 * @param {String} tab - The tab to change to
 * @returns {Boolean}
 */
function settingsTab(evt, tab) {
    var tabs = document.getElementsByClassName("stg");
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove("selected");
    }
    evt.currentTarget.classList.add("selected");
    $('#displaystg').hide();
    $('#anastg').hide();
    $('#timestg').hide();
    $('#schemestg').hide();
    $('#' + tab).show();
    return false;
}

/**
 * Handles changing tabs on the helpsheet modal
 * @param {*} evt - The event
 * @param {String} tab - The tab to change to
 * @returns {Boolean}
 */
function helpTab(evt, tab) {
    var tabs = document.getElementsByClassName("helpsheet");
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove("selected");
    }
    evt.currentTarget.classList.add("selected");
    $('#shortcuts-help').hide();
    $('#node-help').hide();
    $('#edge-help').hide();
    $('#timestamp-help').hide();
    $('#' + tab).show();
    return false;
}

/**
 * Handles changing tabs on the edit node modal
 * @param {String} tab - The tab to change to
 * @returns {Boolean}
 */
function editsTab(tab) {
    var tabs = document.getElementsByClassName("nEdit");
    for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.remove("selected");
    }
    document.getElementById("tab_" + tab).classList.add("selected");
    $('#node_options').hide();
    $('#descriptor_selects').hide();
    $('#cq_selects').hide();
    $('#' + tab).show();
    return false;
}

/**
 * Sets the start date and time for the timestamps
 * @param {String} startdatestmp - Optional
 * @returns 
 */
function setTimestampStart(startdatestmp) {
    if (typeof startdatestmp !== 'undefined' && startdatestmp != "") { //set the start date time stamp to the given value
        window.startdatestmp = startdatestmp;
        document.getElementById("startTimestampLabel").innerHTML = window.startdatestmp;
    } else { //validate the user input and update the date time stamp
        var date = document.getElementById("dateInput").value;
        var time = document.getElementById("timeInput").value;
        var timezoneTime = document.getElementById("timezoneInput").value;
        var timezoneSelect = document.getElementById("timezoneSelect").value;
        if (date != "" && time != "" && timezoneTime != "") {
            var d = date.split("-", 3);
            var t = timezoneTime.split(":", 2);
            var timezone = "GMT" + timezoneSelect + t[0] + t[1];
            var start = d[0] + "/" + d[1] + "/" + d[2] + " " + time + " " + timezone;
            if (window.editTimestamp) { //if editing a locution's timestamp
                var tstamp = Math.round(new Date(start).getTime());
                var tsd = new Date();
                tsd.setTime(tstamp);
                var str = tsd.toString().split(" (")[0];
                document.getElementById("timestamp_label").innerHTML = str;
                window.editTimestamp = false;
                window.groupID++;
                updateTimestamp(mySel.nodeID, str);
                if (window.showTimestamps) {
                    var edited = editTimestampSVG(mySel.nodeID, str);
                    if (!edited) { DrawTimestamp(mySel.nodeID, str, mySel.x, mySel.y); }
                }
                $('#delTimestampBtn').hide();
                closeModal('#modal-timestamps');
                editpopup(mySel);
            } else { //if updating the start date time stamp
                window.startdatestmp = start;
                document.getElementById("startTimestampLabel").innerHTML = window.startdatestmp;
                closeModal('#modal-timestamps');
                openModal('#modal-settings');
            }
        }
    }
    return false;
}

/**
 * Handles deleting a timestamp
 */
function deleteTimestamp() {
    if (mySel.timestamp != "") {
        delTimestamp(mySel.nodeID);
        removeTimestamps(mySel.nodeID);
        document.getElementById("timestamp_label").innerHTML = "The timestamp has been deleted.";
    }
    window.editTimestamp = false;
    $('#delTimestampBtn').hide();
    closeModal('#modal-timestamps');
    editpopup(mySel);
}
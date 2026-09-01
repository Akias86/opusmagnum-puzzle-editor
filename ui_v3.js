
// svg props
var svgWidth = 2400;//d3.select("#transmutation").node().offsetWidth;
var svgHeight = 2400;//d3.select("#transmutation").node().offsetHeight;
var svgContentSize = 2400;
var scale = d3.scaleLinear().domain([0,svgContentSize]).range([0, Math.min(svgHeight * 4/3, svgWidth)]).nice();

// camera state: pixel position of the hex origin (0,0) inside the transmutation
// viewport. the board is conceptually infinite; these offsets pan the camera.
var gCameraX = 0;
var gCameraY = 0;
// camera zoom: the whole board is scaled about the cursor; ctrl+wheel changes
// the shared factor of both research and production boards. the original 1:1
// scale is the maximum — zooming only shrinks (native pixel density never
// upscales, so sprites stay crisp).
var gZoom = 1;
var gZoomMin = 0.25;
var gZoomMax = 1;

// the complete board spans [-127, 128] on both axial coordinates, forming a
// parallelogram with acute corners at the top-right and bottom-left; grid
// cells outside this range are never rendered and no atoms can be placed
// there.
var gGridMinCoord = -127;
var gGridMaxCoord = 128;

// sprite-sheet (img/atoms_atlas.png) layout: 4x4 grid of 120px cells
var gAtlasOrder = ["salt","air","earth","fire","water","quicksilver","gold","silver","copper","iron","tin","lead","vitae","mors","repeat","quintessence"];
var gAtlasCell = {};
gAtlasOrder.forEach(function(p, i) { gAtlasCell[p] = { col: i % 4, row: Math.floor(i / 4) }; });
function primeHref(d) { return "#spr-" + d.type; }
function bondImg(d) {
	if(d.type.n) {
		return "img/normal.png";
	}
	else if(d.type.r && d.type.k && d.type.y) {
		return "img/triplex.png";
	}
	else if(!d.type.r && !d.type.k && !d.type.y) {
		return "img/nobond.png";
	}
	return "img/" + (d.type.r ? "r" : "") + (d.type.k ? "k" : "") + (d.type.y ? "y" : "") + ".png";
}

// prime/bond transformation functions. coordinates are relative to the hex
// origin (0,0); the root group is translated by the camera, so panning never
// repositions content and the board can extend infinitely.
// the lattice matches the unscaled background tile: 82 px per column, 71 px
// per row (true-hex geometry, so diagonal bonds land exactly on 60° lines)
var primeX = function(d) {
	return 82 * d.x + 41 * d.y - 30;
};
var primeY = function(d) {
	return -71 * d.y - 30;
};
var bondWidth = 33;
var bondHeight = 22;
var bondX = function(d) {
	return 82 * (d.x1 + d.x2) / 2 + 41 * (d.y1 + d.y2) / 2 - bondWidth/2;
};
var bondY = function(d) {
	return -71 * (d.y1 + d.y2) / 2 - bondHeight/2;
};
var bondTransform = function(d) {
	if(d.y2 == d.y1) {
		return "";
	}
	else if(d.y2 != d.y1 && d.x2 != d.x1) {
		return "rotate(60 " + (bondX(d) + bondWidth/2) + " " + (bondY(d) + bondHeight/2) + ")";
	}
	else {
		return "rotate(120 " + (bondX(d) + bondWidth/2) + " " + (bondY(d) + bondHeight/2) + ")";
	}
};

// re-run the hover highlight at the current mouse position, so placing or
// cancelling an atom/bond immediately re-marks the feature under the cursor
function refreshResearchHoverPreview() {
	if(gEditMode.research && gHoverLocalX != null) {
		updateHoverPreview(gHoverLocalX, gHoverLocalY);
	}
}

// prime/bond event functions. left-click places atoms/bonds and repaints an
// atom with the selected type; cancelling existing ones is done with a
// right-click (researchRightClickRemove), so clicking an existing bond or a
// same-type atom no longer removes anything.
var primeClick = function(d) {
	if(gSelectedPrimeType != d.type) {
		d.type = gSelectedPrimeType;
		updateMolecule(gMoleculeObj);
		refreshResearchHoverPreview();
	}
};
var bprimeClick = function(d) {
	var prime = new Prime(gSelectedPrimeType, d.x, d.y);
	gMoleculeObj.primes.push(prime);
	updateMolecule(gMoleculeObj);
	refreshResearchHoverPreview();
};
var bbondClick = function(d) {
	var bond = new Bond(gSelectedBondType, d.x1, d.y1, d.x2, d.y2);
	gMoleculeObj.bonds.push(bond);
	updateMolecule(gMoleculeObj);
	refreshResearchHoverPreview();
};
var eventNothing = function() {
	d3.event.preventDefault();
};

// size of the transmutation viewport (the scroll container)
function transmutationViewSize() {
	var c = $I("transmutation");
	return {"w" : c.clientWidth, "h" : c.clientHeight};
}

// the board background is the seamless lattice pattern (img/grid_tile.png at
// its native 82x142 px period, one column wide and two rows tall) clipped to
// the full board parallelogram — the grid coordinate range [-127..128] on
// both axial axes, edges half a cell outside the outermost cells (so the
// outer link loops are cut at their midpoints, like in-game).
//
// implementation: the pattern and the clip path (both anchored to the root
// coordinate system) are built once; on every camera move only a viewport-
// sized rect is repositioned. a huge filled path is avoided because browser
// rasterization limits would clip it.

// cell-space -> root pixel space (same as primeX/primeY without the sprite
// offset, i.e. cell centers)
function boardCellToPixel(c) {
	return [82 * c[0] + 41 * c[1], -71 * c[1]];
}

// parallelogram covering the full board range, edges half a cell out
function boardBackgroundPath() {
	var m = 0.5;
	var lo = gGridMinCoord - m;
	var hi = gGridMaxCoord + m;
	var pts = [[lo, lo], [hi, lo], [hi, hi], [lo, hi]];
	return "M " + pts.map(function(c) {
		var p = boardCellToPixel(c);
		return p[0] + " " + p[1];
	}).join(" L ") + " Z";
}

// the tile contains a lattice node at source pixel (40.5, 70.5) — the phase
// of cell (0,0) at the tile's native scale (82 px per column, 71 px per row)
var BOARD_TILE_X = -40.5;
var BOARD_TILE_Y = -70.5;

function renderBackgroundWindow() {
	var layer = d3.select("#transmutation-bg");
	if(layer.empty()) {
		return;
	}
	var defs = d3.select("#transmutation-svg").select("defs");
	if(defs.select("pattern#board-bg-pattern").empty()) {
		var bppat = defs.append("pattern")
		.attr("id", "board-bg-pattern")
		.attr("patternUnits", "userSpaceOnUse")
		.attr("width", 82)
		.attr("height", 142);
		// the image is one full native period (82x142), but its phase is offset
		// by the tile's (0,0)-node (BOARD_TILE_X/Y), so lay a 2x2 grid of copies
		// to cover the whole pattern tile; adjacent copies meet exactly at the
		// period, so the wrap is seamless.
		for(var i = 0; i < 2; i++) {
			for(var j = 0; j < 2; j++) {
				bppat.append("image")
				.attr("xlink:href", "img/grid_tile.png")
				.attr("x", BOARD_TILE_X + i * 82)
				.attr("y", BOARD_TILE_Y + j * 142)
				.attr("width", 82)
				.attr("height", 142);
			}
		}
	}
	if(defs.select("clipPath#board-bg-clip").empty()) {
		defs.append("clipPath")
		.attr("id", "board-bg-clip")
		.append("path")
		.attr("d", boardBackgroundPath());
	}
	var size = transmutationViewSize();
	var margin = 120;
	layer.selectAll(".board-bg-rect").data([null])
	.enter().append("rect")
	.attr("class", "board-bg-rect")
	.attr("fill", "url(#board-bg-pattern)")
	.attr("clip-path", "url(#board-bg-clip)")
	.on("click", boardBackgroundClick);
	// only the rect follows the camera; the pattern stays lattice-anchored.
	// the rect lives in the scaled root, so the viewport coverage is divided
	// by the zoom and the margin is measured in root units.
	layer.select(".board-bg-rect")
	.attr("x", -gCameraX / gZoom - margin)
	.attr("y", -gCameraY / gZoom - margin)
	.attr("width", size.w / gZoom + 2 * margin)
	.attr("height", size.h / gZoom + 2 * margin);

	if(layer.select(".origin-highlight").empty()) {
		// the origin cell (0,0) carries a permanent cell highlight
		layer.append("image")
		.attr("class", "origin-highlight")
		.datum({"x" : 0, "y" : 0})
		.attr("width", scale(60))
		.attr("height", scale(60))
		.attr("x", primeX)
		.attr("y", primeY)
		.attr("xlink:href", "img/grid_circle_hover.png")
		.style("pointer-events", "none");
	}
}

// left-click on the board places the selected atom/bond at the feature under
// the cursor, or relabels an existing atom there. the atoms/bonds layer is
// pointer-transparent, so every click reaches this handler and the hit-test
// is the same math the hover highlight uses (a spot near the edge of an atom
// sprite highlights and places a neighbouring bond exactly like it shows).
function boardBackgroundClick() {
	var rect = $I("transmutation").getBoundingClientRect();
	var state = researchNearestFeature(d3.event.clientX - rect.left, d3.event.clientY - rect.top);
	if(!state) {
		return;
	}
	if(state.type == "prime") {
		var prime = researchPrimeAt(state.hex.x, state.hex.y);
		if(prime) {
			primeClick(prime);
		}
		else {
			bprimeClick(state.hex);
		}
	}
	else if(!researchBondAt(state.bond.x1, state.bond.y1, state.bond.x2, state.bond.y2)) {
		bbondClick(state.bond);
	}
}

// move the camera; the board background is static within the root group (the
// pattern is anchored to the lattice, never re-rendered on pan), and the root
// scale is the zoom factor.
function applyCamera() {
	d3.select("#transmutation-root").attr("transform", "translate(" + gCameraX + "," + gCameraY + ") scale(" + gZoom + ")");
	renderBackgroundWindow();
}

// zoom the whole board about the viewport point (anchorX, anchorY): the cell
// under the cursor stays put. both cameras are re-anchored on the same point
// so the hidden tab keeps the same zoom when it becomes visible.
function applyZoom(anchorX, anchorY, newZoom) {
	if(newZoom < gZoomMin || newZoom > gZoomMax || newZoom == gZoom) {
		return;
	}
	var z = gZoom;
	var rx = (anchorX - gCameraX) / z;
	var ry = (anchorY - gCameraY) / z;
	var px = (anchorX - gProdCameraX) / z;
	var py = (anchorY - gProdCameraY) / z;
	gZoom = newZoom;
	gCameraX = anchorX - rx * newZoom;
	gCameraY = anchorY - ry * newZoom;
	gProdCameraX = anchorX - px * newZoom;
	gProdCameraY = anchorY - py * newZoom;
	applyCamera();
	applyProductionCamera();
}

// re-center the camera on the hex origin (0,0), i.e. the middle of the viewport
function centerCamera() {
	var size = transmutationViewSize();
	gCameraX = size.w / 2;
	gCameraY = size.h / 2;
	applyCamera();
}

// init field
function generateField() {
	var size = transmutationViewSize();

	// start with the hex origin centered in the viewport
	gCameraX = size.w / 2;
	gCameraY = size.h / 2;

	// summon svg element (sized to the viewport; the camera pans the content)
	var svg = d3.select("#transmutation-svg").attr("width", size.w).attr("height", size.h)
	.style("position", "absolute")
	.style("left", "0px")
	.style("top", "0px")
	.on("dragstart", eventNothing)
	.on("drag", eventNothing)
	.on("dragend", eventNothing)
	.on("dragout", eventNothing);

	// root group holds all board content and is translated by the camera
	var root = d3.select("#transmutation-root");
	if(root.empty()) {
		root = svg.append("g").attr("id", "transmutation-root");
	}
	root.attr("transform", "translate(" + gCameraX + "," + gCameraY + ") scale(" + gZoom + ")");

	// layers keep z-order stable while panning: background pattern, then the
	// hover highlight (below atoms/bonds), then molecules. order is enforced
	// here and again on each camera move.
	if(d3.select("#transmutation-bg").empty()) {
		root.append("g").attr("id", "transmutation-bg");
	}
	if(d3.select("#transmutation-hover").empty()) {
		root.append("g").attr("id", "transmutation-hover");
	}
	if(d3.select("#transmutation-molecules").empty()) {
		root.append("g").attr("id", "transmutation-molecules");
	}

	renderBackgroundWindow();
}

// convert a point local to the transmutation viewport into the hex cell
// underneath it (research grid). pixel mapping used by renderBackgroundWindow:
// px' = 82x + 41y, py' = -71y; inverse: y = -py'/71, x = (px' - 41y)/82
function researchHexAtPoint(localX, localY) {
	var px = (localX - gCameraX) / gZoom;
	var py = (localY - gCameraY) / gZoom;
	var y = Math.round(-py / 71);
	var x = Math.round((px - 41 * y) / 82);
	if(x < gGridMinCoord || x > gGridMaxCoord || y < gGridMinCoord || y > gGridMaxCoord) {
		return null;
	}
	return {"x" : x, "y" : y};
}

// decide whether the cursor is over a hex cell (place a prime) or over a bond
// (place a bond): pick whichever feature center is nearer to the cursor.
function researchNearestFeature(localX, localY) {
	var hex = researchHexAtPoint(localX, localY);
	if(!hex) {
		return null;
	}
	var px = (localX - gCameraX) / gZoom;
	var py = (localY - gCameraY) / gZoom;
	var x = hex.x;
	var y = hex.y;
	var pmx = 82 * x + 41 * y;
	var pmy = -71 * y;
	var primeDist2 = (px - pmx) * (px - pmx) + (py - pmy) * (py - pmy);
	// the 6 bond centers around this cell (a bond sits at the midpoint between
	// two adjacent hex cells, matching the background bond images). only bonds
	// whose two endpoints are both on the board are offered: boundary atoms
	// must not link outward past the grid range.
	var candidates = [
		[x, y, x + 1, y],
		[x, y, x + 1, y - 1],
		[x, y, x, y - 1],
		[x, y, x - 1, y],
		[x, y, x - 1, y + 1],
		[x, y, x, y + 1]
	];
	var best = null;
	var bestDist2 = primeDist2;
	candidates.forEach(function(c) {
		if(c[0] < gGridMinCoord || c[0] > gGridMaxCoord
		|| c[1] < gGridMinCoord || c[1] > gGridMaxCoord
		|| c[2] < gGridMinCoord || c[2] > gGridMaxCoord
		|| c[3] < gGridMinCoord || c[3] > gGridMaxCoord) {
			return;
		}
		var bx = 82 * (c[0] + c[2]) / 2 + 41 * (c[1] + c[3]) / 2;
		var by = -71 * (c[1] + c[3]) / 2;
		var dx = px - bx;
		var dy = py - by;
		var d2 = dx * dx + dy * dy;
		if(d2 < bestDist2) {
			bestDist2 = d2;
			best = {"x1" : c[0], "y1" : c[1], "x2" : c[2], "y2" : c[3]};
		}
	});
	if(best) {
		return {"type" : "bond", "bond" : best};
	}
	return {"type" : "prime", "hex" : hex};
}

// find an existing prime of the edited molecule at a hex, or null
function researchPrimeAt(x, y) {
	for(var i = 0; i < gMoleculeObj.primes.length; i++) {
		if(gMoleculeObj.primes[i].x == x && gMoleculeObj.primes[i].y == y) {
			return gMoleculeObj.primes[i];
		}
	}
	return null;
}

// find an existing bond of the edited molecule between two hexes (either
// endpoint order matches), or null
function researchBondAt(x1, y1, x2, y2) {
	for(var i = 0; i < gMoleculeObj.bonds.length; i++) {
		var b = gMoleculeObj.bonds[i];
		if((b.x1 == x1 && b.y1 == y1 && b.x2 == x2 && b.y2 == y2)
		|| (b.x1 == x2 && b.y1 == y2 && b.x2 == x1 && b.y2 == y1)) {
			return b;
		}
	}
	return null;
}

// right-click cancels the atom or bond under the cursor: the cursor picks the
// nearest feature exactly like the hover highlight does, and only an existing
// prime/bond of the edited molecule is removed.
function researchRightClickRemove(clientX, clientY) {
	var rect = $I("transmutation").getBoundingClientRect();
	var state = researchNearestFeature(clientX - rect.left, clientY - rect.top);
	if(!state) {
		return;
	}
	if(state.type == "prime") {
		var prime = researchPrimeAt(state.hex.x, state.hex.y);
		if(prime) {
			gMoleculeObj.primes.splice(gMoleculeObj.primes.indexOf(prime), 1);
			updateMolecule(gMoleculeObj);
		}
	}
	else {
		var bond = researchBondAt(state.bond.x1, state.bond.y1, state.bond.x2, state.bond.y2);
		if(bond) {
			gMoleculeObj.bonds.splice(gMoleculeObj.bonds.indexOf(bond), 1);
			updateMolecule(gMoleculeObj);
		}
	}
	// the emptied spot may be re-highlighted without waiting for a move
	refreshResearchHoverPreview();
}

// draw the hover highlight over the board pattern, below atoms and bonds:
// a circle highlight over cell centers and a link highlight over bond slots.
// it marks exactly the feature researchNearestFeature returns for clicks, so
// the highlighted area and the click target always coincide.
function renderResearchHoverPreview(state) {
	var layer = d3.select("#transmutation-hover");
	if(layer.empty()) {
		return;
	}
	layer.selectAll(".hover-highlight").remove();
	if(!state) {
		return;
	}
	if(state.type == "bond") {
		var cx = 82 * (state.bond.x1 + state.bond.x2) / 2 + 41 * (state.bond.y1 + state.bond.y2) / 2;
		var cy = -71 * (state.bond.y1 + state.bond.y2) / 2;
		var straight = state.bond.y2 == state.bond.y1;
		var img = layer.append("image")
		.attr("class", "hover-highlight")
		.attr("width", 24)
		.attr("height", straight ? 18 : 26)
		.attr("x", cx - 12)
		.attr("y", straight ? cy - 9 : cy - 13)
		.attr("xlink:href", straight ? "img/grid_bond_hover_straight.png" : "img/grid_bond_hover_angle.png")
		.style("pointer-events", "none");
		if(!straight) {
			// the two diagonal families are horizontal mirrors of each other:
			// the sprite as-is fits the "\"-type links (same x coordinate on
			// both cells); the "/"-type links use its horizontal flip, made
			// about the bond centre so position is unchanged.
			if(state.bond.x1 != state.bond.x2) {
				img.attr("transform", "translate(" + (2 * cx) + " 0) scale(-1 1)");
			}
		}
	}
	else {
		layer.append("image")
		.attr("class", "hover-highlight")
		.datum({"x" : state.hex.x, "y" : state.hex.y})
		.attr("width", scale(60))
		.attr("height", scale(60))
		.attr("x", primeX)
		.attr("y", primeY)
		.attr("xlink:href", "img/grid_circle_hover.png")
		.style("pointer-events", "none");
	}
}

// update the hover highlight over the research editing area: hovering a hex
// shows the cell highlight, hovering a bond shows the link highlight. an
// existing atom/bond shows nothing (right-click there cancels it instead).
function updateResearchHoverPreview(localX, localY) {
	if(typeof hideProductionHoverPreview == 'function') {
		hideProductionHoverPreview();
	}
	var layer = d3.select("#transmutation-hover");
	if(!layer.empty()) {
		layer.selectAll(".hover-highlight").remove();
	}
	if(!gEditMode.research) {
		gHoverState = null;
		return;
	}
	var state = researchNearestFeature(localX, localY);
	if(state) {
		if(state.type == "prime") {
			if(researchPrimeAt(state.hex.x, state.hex.y)) {
				state = null;
			}
		}
		else if(researchBondAt(state.bond.x1, state.bond.y1, state.bond.x2, state.bond.y2)) {
			state = null;
		}
	}
	gHoverState = state;
	renderResearchHoverPreview(state);
}

// route the hover highlight to the active editing mode (research/production)
function updateHoverPreview(localX, localY) {
	gHoverLocalX = localX;
	gHoverLocalY = localY;
	if(gEditMode.production && typeof updateProductionHoverPreview == "function") {
		updateProductionHoverPreview(localX, localY);
	}
	else {
		updateResearchHoverPreview(localX, localY);
	}
}

// hide the research hover highlight (keeps gHoverState untouched)
function hideResearchHoverPreview() {
	d3.select("#transmutation-hover").selectAll(".hover-highlight").remove();
}

// hide the hover highlight in both modes and forget the hover position
function hideHoverPreview() {
	hideResearchHoverPreview();
	if(typeof hideProductionHoverPreview == 'function') {
		hideProductionHoverPreview();
	}
	gHoverState = null;
}

// toolbox event callbacks.
function toolboxPrimeClick(prime) {
	d3.selectAll(".toolbox-prime").classed("toolbox-selected", false);
	d3.select(".toolbox-" + prime).classed("toolbox-selected", true);
	gSelectedPrimeType = prime;
	// refresh the hover highlight in case the mouse is already over the field
	if(gEditMode.research && gHoverLocalX != null) {
		updateHoverPreview(gHoverLocalX, gHoverLocalY);
	}
}

function toolboxBondClick(bond) {
	if(gSelectedBondType[bond]) {
		gSelectedBondType[bond] = false;
		d3.select(".toolbox-" + bond).classed("toolbox-bond-selected", false);
	}
	else {
		gSelectedBondType[bond] = true;
		d3.select(".toolbox-" + bond).classed("toolbox-bond-selected", true);
	}
	// refresh the hover highlight in case the mouse is already over a bond
	if(gEditMode.research && gHoverLocalX != null) {
		updateHoverPreview(gHoverLocalX, gHoverLocalY);
	}
}

// attaches callbacks to all page elements
function generateMetaCallbacks() {
	d3.select("#puzzle-name").on("keyup", function(d) {
		gPuzzleObj.name = d3.select("#puzzle-name").property("value");
	});
	d3.select("#steam-id").on("input", function(d) {
		var v = d3.select("#steam-id").property("value").replace(/[^0-9]/g, "");
		d3.select("#steam-id").property("value", v);
		gPuzzleObj.steamID = v;
	});
	d3.select("#reagent-add").on("click", function(d) {
		addReagent();
	});
	d3.select("#output-add").on("click", function(d) {
		addOutput();
	});
	d3.select("#reagent-dupe").on("click", function(d) {
		duplicateCurrentToReagent();
	});
	d3.select("#output-dupe").on("click", function(d) {
		duplicateCurrentToOutput();
	});
	d3.select("#output-multiplier-input").on("keyup", function(d) {
		gPuzzleObj.outputTargetScale = parseInt(d3.select("#output-multiplier-input").property("value"), 10);
	});
	d3.select("#savefile").on("click", makePuzzleFile);
	d3.select("#toolbox").on("dragover", eventNothing);
	d3.select("#toolbox").on("drop", toolboxDrop);
	d3.select("#loadfile").on("click", function(d) {
		d3.select("#file-input").node().click();
	});
	d3.select("#file-input").on("change", inputFileLoad);
}

// init function, fill the toolbox
function generateToolbox() {
	var primeTypes = ["salt", "air", "earth", "fire", "water", "quicksilver", "gold", "silver", "copper", "iron", "tin", "lead", "vitae", "mors", "repeat", "quintessence"]
	primeTypes.forEach(function(prime) {
		d3.select("#toolbox-primes").append("div")
		.classed("toolbox-prime", true)
		.classed("toolbox-" + prime, true)
		.style("background-image", "url('img/atoms_atlas.png')")
		.style("background-size", "160px 160px")
		.style("background-position", function() { var c = gAtlasCell[prime]; return (-40 * c.col) + "px " + (-40 * c.row) + "px"; })
		.style("background-repeat", "no-repeat")
		.on("click", toolboxPrimeClick.bind(this, prime));
	});
	var bondTypes = ["n", "r", "k", "y"];
	bondTypes.forEach(function(bondType) {
		d3.select("#toolbox-bonds").append("div")
		.classed("toolbox-bond", true)
		.classed("toolbox-" + bondType, true)
		.style("background", "url('img/" + (bondType == 'n' ? 'normal' : bondType) + ".png')")
		.on("click", toolboxBondClick.bind(this, bondType));
	});
}

function addReagent() {
	gPuzzleObj.reagents.push(new Molecule());
	updateReagents();
}

function addOutput() {
	gPuzzleObj.outputs.push(new Molecule());
	updateOutputs();
}

// highlight the current molecule being edited
function updateHighlightedMolecule() {
	var od1 = d3.select("#reagents").selectAll(".reagent-option").data(gPuzzleObj.reagents);
	var od2 = d3.select("#outputs").selectAll(".output-option").data(gPuzzleObj.outputs);

	od1.classed("molecule-highlight", function(d) {
		if(gMoleculeObj == d) {
			return true;
		}
		return false;
	});
	od2.classed("molecule-highlight", function(d) {
		if(gMoleculeObj == d) {
			return true;
		}
		return false;
	});
}

// update molecule lists
function updateReagents() {

	var od = d3.select("#reagents").selectAll(".reagent-option").data(gPuzzleObj.reagents);

	// --update
	od.select(".reagent-select")
	.html(function(d, i) {
		return "R#" + (1+i);
	})
	// --exit
	od.exit().remove();
	// --enter
	var ro = od.enter().append("div")
	.classed("reagent-option", true);
	ro.append("a")
	.classed("reagent-select", true)
	.html(function(d, i) {
		return "R#" + (1+i);
	})
	.on("click", function(d) {
		updateMolecule(d);
	});
	ro.append("a")
	.classed("reagent-remove", true)
	.html("(del)")
	.on("click", function(d, i) {
		gPuzzleObj.reagents.splice(i, 1);
		updateReagents();
		updateMolecule(new Molecule());
	});
}

function updateOutputs() {
	var od = d3.select("#outputs").selectAll(".output-option").data(gPuzzleObj.outputs);

	// --update
	od.select(".output-select")
	.html(function(d, i) {
		return "O#" + (1+i);
	})
	// --exit
	od.exit().remove();
	// --enter
	var ro = od.enter().append("div")
	.classed("output-option", true);
	ro.append("a")
	.classed("output-select", true)
	.html(function(d, i) {
		return "O#" + (1+i);
	})
	.on("click", function(d) {
		updateMolecule(d);
	});
	ro.append("a")
	.classed("output-remove", true)
	.html("(del)")
	.on("click", function(d, i) {
		gPuzzleObj.outputs.splice(i, 1);
		updateOutputs();
		updateMolecule(new Molecule());
	});
}

// updates reagent/output molecule, does not change background molecule
function updateMolecule(molecule) {

	gMoleculeObj = molecule;
	updateHighlightedMolecule();

	// summon molecule layer (drawn above the background layer)
	var svg = d3.select("#transmutation-molecules");

  // atoms and bonds are pointer-transparent: clicks always fall through to
  // the board background, whose hit-test matches the hover highlight
  svg.style("pointer-events", "none");

  // update primes
  var svgPrimes = svg.selectAll(".pr").data(gMoleculeObj.primes);

  // --update
  svgPrimes.attr("x", primeX).attr("y", primeY).attr("xlink:href", primeHref);
  // --exit
  svgPrimes.exit().remove();
  // --enter
  svgPrimes.enter()
  .append("use")
  .attr("class", "pr")
  .attr("width", scale(60))
  .attr("height", scale(60))
  .attr("x", primeX)
  .attr("y", primeY)
  .attr("xlink:href", primeHref);

  // update bonds: each bond is a group holding one or two link images. when
  // the normal link is selected along with any of the three colored links
  // (r/k/y), the colored link (or their composed sprite) layers on top of the
  // normal one; the single layers alone render exactly as before.
  var bondLayers = function(bond) {
      var t = bond.type;
      var layers = [{ "href" : bondImg(bond), "bond" : bond }];
      if(t.n && (t.r || t.k || t.y)) {
          layers.push({
              "href" : (t.r && t.k && t.y) ? "img/triplex.png"
                     : "img/" + (t.r ? "r" : "") + (t.k ? "k" : "") + (t.y ? "y" : "") + ".png",
              "bond" : bond
          });
      }
      return layers;
  };
  var svgBonds = svg.selectAll("g.bo").data(gMoleculeObj.bonds);
  // --exit: removed bonds must vanish from the DOM, or their ghost images
  // would keep blocking clicks on the underlying board
  svgBonds.exit().remove();
  var bondSel = svgBonds.enter().append("g")
  .attr("class", "bo")
  .merge(svgBonds);
  var bondImgSel = bondSel.selectAll("image").data(bondLayers);
  bondImgSel.exit().remove();
  bondImgSel.enter().append("image")
  .merge(bondImgSel)
  .attr("class", "bond-img")
  .attr("xlink:href", function(d) { return d.href; })
  .attr("x", function(d) { return bondX(d.bond); })
  .attr("y", function(d) { return bondY(d.bond); })
  .attr("transform", function(d) { return bondTransform(d.bond); })
  .attr("width", scale(bondWidth))
  .attr("height", scale(bondHeight));

  // redraw order: editing order must not affect stacking. bonds always sit
  // above primes (an atom added after its bonds must not cover them); select
  // the whole classes so new enter nodes join in too.
  svg.selectAll("g.bo").raise();
  svg.selectAll(".pr").lower();
}

// update inst list
function updateInsts() {
	var insts = gPuzzleObj.inst;
	var instlist = Inst.instlist;

	var od = d3.select("#inst-box").selectAll(".inst-option").data(instlist);
	od.select(".inst-checkbox")
	.style("background", function(d) {
		if(gPuzzleObj.inst[d]) {
			return "url('img/ch1.png')";
		}
		return "url('img/ch0.png')";
	})
	.style("background-size", function(d) {
		return "100% 100%"
	});

	od.exit().remove();

	var bd = od.enter()
	.append("div")
	.classed("inst-option", true);
	bd.append("div")
	.classed("inst-checkbox", true)
	.style("background", function(d) {
		if(gPuzzleObj.inst[d]) {
			return "url('img/ch1.png')";
		}
		return "url('img/ch0.png')";
	})
	.style("background-size", function(d) {
		return "100% 100%"
	})
	.on("click", function(d) {
		gPuzzleObj.inst[d] = !gPuzzleObj.inst[d];
		updateInsts();
	});
	bd.append("div")
	.classed("inst-label", true)
	.html(function(d) {
		return d;
	});
}

// text input fields
function updateTextInputs() {
	d3.select("#puzzle-name").property("value", gPuzzleObj.name);
	d3.select("#steam-id").property("value", gPuzzleObj.steamID);
	d3.select("#output-multiplier-input").property("value", gPuzzleObj.outputTargetScale);
}

// saves file to disk (needs to click the link)
// args: unconverted uint8array, file name, mimetype (should be omitted)
function saveFile(binary_data, fn, tp) {
	fn = fn || "c455310010962974.puzzle";
	tp = tp || "application/opus-magnum-puzzle";
	var blob1 = new Blob([new Uint8Array(binary_data)], { "type" : tp });
	$I("dl").href = URL.createObjectURL(blob1);
	$I("dl").download = fn;
	$I("dl").click();
}

// idk how the game calculates the filename, but it recognizes anything
// so randomly make a prng here
function notRandom(str1, str2) {
	var o = "";
	var h = 0;
	var seed1 = 8888882;
	var seed2 = 6666677;
	var str = str1 + str2;
	for(var i=0; i<str.length; i++) {
		var c = str.charCodeAt(i);
		h = (h + c) % 9;
		seed1 = (seed1 * 2223331 + seed2 * c * 1117771 + h * 6111111) % 8677777;
		seed2 = (seed1 * 5566777 + seed2 * c * 8899227 + h * 5554441) % 6555557;
		seed1 += 1000000;
		seed2 += 1000000;
	}
	return h.toString() + seed1.toString() + seed2.toString();
}

// create binary file from "Puzzle" object
function makePuzzleFile() {
	var pid = $I("puzzle-id").value.trim();
	var fn = pid ? (pid + ".puzzle") : ("c" + notRandom(gPuzzleObj.steamID, gPuzzleObj.name) + ".puzzle");
	saveFile(constructFile(gPuzzleObj), fn, "application/opus-magnum-puzzle");
	// save steamID into localstorage, in case i want to share this with someone else
	try {
		localStorage.setItem("steamID-of-this-player", gPuzzleObj.steamID);
	}
	catch(c) {
	}
}

// write puzzle data to global object, and refresh everything
function importPuzzleData(puz) {
	// transfer props to global object
	gPuzzleObj.name = puz.name || "";
	gPuzzleObj.steamID = puz.steamID || 0;
	["inst", "reagents", "outputs", "outputTargetScale", "isProduction", "productionInfo"].forEach(function(prop) {
		gPuzzleObj[prop] = puz[prop];
	});

	// update metadata
	updateTextInputs();

	// update lists
	updateReagents();
	updateOutputs();
	updateInsts();

    // remove pipe selection
    gSelectedPipe = null;

	// update production info
	updateProduction();
    updateProductionBoard();

	// update molecule
	if(gPuzzleObj.outputs.length == 0) {
		addOutput();
	}
	updateMolecule(gPuzzleObj.outputs[0]);
}

// toolbox drop handler
function toolboxDrop(d) {
	var evt = d3.event;
	evt.stopPropagation();
	evt.preventDefault();

	// find the file
	try {
		var file = d3.event.dataTransfer.files[0];
	}
	catch(c) {
		return;
	}
	setPuzzleIDFromFile(file);

	// load the file
	try {
		loadFile(file);
	}
	catch(c) {
	}
}

// input file load handler
function inputFileLoad(d) {
	try {
		var file = d3.event.target.files[0];
		setPuzzleIDFromFile(file);
		loadFile(file);
	}
	catch(c) {
	}
}

// extract puzzle ID from the file name (base name without extension), if any
function setPuzzleIDFromFile(fp) {
	try {
		var m = /^(.+)\.puzzle$/.exec(fp.name);
		$I("puzzle-id").value = m ? m[1] : "";
	}
	catch(c) {
	}
}

// load file from file obj
function loadFile(fp) {
	var fr = new FileReader();
	fr.onload = function(r) {
		try {
			importPuzzleData(loadPuzzle([].slice.call(new Uint8Array(r.target.result))));
		}
		catch(c) {
		}
	};
	fr.readAsArrayBuffer(fp);
}

// middle-button drag pans the infinite boards; a plain middle-click toggles
// browser-style auto-scroll (keep moving the mouse without holding anything),
// ctrl+wheel zooms the whole board about the cursor. research moves the
// molecule camera; production moves its own camera.
function initTransmutationPan() {
	var pan = {
		"active" : false,
		"startX" : 0,
		"startY" : 0,
		"moved" : false,
		"camX" : 0,
		"camY" : 0,
		"prodCamX" : 0,
		"prodCamY" : 0
	};
	// auto-scroll mode: after a plain middle-click the board keeps panning at
	// a speed proportional to how far the mouse moved away from the click
	// anchor (browser-style: it scrolls continuously even when the mouse is
	// still); any click, wheel or Escape ends it.
	var AUTO_SCROLL_DEAD = 8;    // px around the anchor: no scroll inside
	var AUTO_SCROLL_RATE = 6;    // px per second per px of distance
	var autoScroll = {
		"active" : false,
		"anchorX" : 0,
		"anchorY" : 0,
		"rateX" : 0,
		"rateY" : 0,
		"lastTime" : 0,
		"rafId" : null,
		"tick" : function(now) {
			if(!autoScroll.active) {
				return;
			}
			var dt = Math.min(0.1, (now - autoScroll.lastTime) / 1000);
			autoScroll.lastTime = now;
			if(autoScroll.rateX != 0 || autoScroll.rateY != 0) {
				moveCameras(autoScroll.rateX * dt, autoScroll.rateY * dt);
			}
			autoScroll.rafId = requestAnimationFrame(autoScroll.tick);
		}
	};
	var container = $I("transmutation");
	if(container.querySelector(".auto-scroll-indicator") == null) {
		var ind = document.createElement("div");
		ind.className = "auto-scroll-indicator";
		ind.style.display = "none";
		container.appendChild(ind);
	}

	function moveCameras(dx, dy) {
		if(dx == 0 && dy == 0) {
			return;
		}
		if(gEditMode.production) {
			gProdCameraX += dx;
			gProdCameraY += dy;
			applyProductionCamera();
		}
		else {
			gCameraX += dx;
			gCameraY += dy;
			applyCamera();
		}
	}

	function startAutoScroll(clientX, clientY) {
		autoScroll.active = true;
		autoScroll.anchorX = clientX;
		autoScroll.anchorY = clientY;
		autoScroll.rateX = 0;
		autoScroll.rateY = 0;
		autoScroll.lastTime = performance.now();
		var ind = container.querySelector(".auto-scroll-indicator");
		if(ind) {
			var r = container.getBoundingClientRect();
			ind.style.left = (clientX - r.left) + "px";
			ind.style.top = (clientY - r.top) + "px";
			ind.style.display = "block";
		}
		container.classList.add("auto-scrolling");
		autoScroll.rafId = requestAnimationFrame(autoScroll.tick);
	}

	function stopAutoScroll() {
		if(!autoScroll.active) {
			return;
		}
		autoScroll.active = false;
		if(autoScroll.rafId) {
			cancelAnimationFrame(autoScroll.rafId);
			autoScroll.rafId = null;
		}
		autoScroll.rateX = 0;
		autoScroll.rateY = 0;
		var ind = container.querySelector(".auto-scroll-indicator");
		if(ind) {
			ind.style.display = "none";
		}
		container.classList.remove("auto-scrolling");
	}

	container.addEventListener("mousedown", function(e) {
		if(autoScroll.active) {
			// any button press ends the auto-scroll mode (and does not start
			// a pan/cancel action itself); middle presses must also suppress
			// the browser's built-in auto-scroll.
			stopAutoScroll();
			if(e.button == 1) {
				e.preventDefault();
			}
			return;
		}
		if(e.button != 1) {
			return;
		}
		// stop the browser's built-in middle-button auto-scroll
		e.preventDefault();
		pan.active = true;
		pan.moved = false;
		container.classList.add("panning");
		pan.startX = e.clientX;
		pan.startY = e.clientY;
		if(gEditMode.production) {
			pan.prodCamX = gProdCameraX;
			pan.prodCamY = gProdCameraY;
		}
		else {
			pan.camX = gCameraX;
			pan.camY = gCameraY;
		}
	});

	// hover highlight follows the mouse over the editing area
	container.addEventListener("mousemove", function(e) {
		var rect = container.getBoundingClientRect();
		updateHoverPreview(e.clientX - rect.left, e.clientY - rect.top);
	});
	container.addEventListener("mouseleave", function() {
		hideHoverPreview();
	});
	window.addEventListener("mousemove", function(e) {
		if(autoScroll.active) {
			// browser-style: the pan speed grows linearly with the distance
			// from the anchor and points away from it; the small dead zone
			// around the anchor dot matches the indicator center.
			var adx = e.clientX - autoScroll.anchorX;
			var ady = e.clientY - autoScroll.anchorY;
			var dist = Math.sqrt(adx * adx + ady * ady);
			if(dist > AUTO_SCROLL_DEAD) {
				var speed = AUTO_SCROLL_RATE * dist;
				autoScroll.rateX = (adx / dist) * speed;
				autoScroll.rateY = (ady / dist) * speed;
			}
			else {
				autoScroll.rateX = 0;
				autoScroll.rateY = 0;
			}
			return;
		}
		if(!pan.active) {
			return;
		}
		e.preventDefault();
		// remember that this middle-button press became a drag, so its
		// mouseup is not treated as an auto-scroll toggle
		var mdx = e.clientX - pan.startX;
		var mdy = e.clientY - pan.startY;
		if(mdx * mdx + mdy * mdy > 25) {
			pan.moved = true;
		}
		if(gEditMode.production) {
			gProdCameraX = pan.prodCamX + (e.clientX - pan.startX);
			gProdCameraY = pan.prodCamY + (e.clientY - pan.startY);
			applyProductionCamera();
		}
		else {
			gCameraX = pan.camX + (e.clientX - pan.startX);
			gCameraY = pan.camY + (e.clientY - pan.startY);
			applyCamera();
		}
	});
	window.addEventListener("mouseup", function(e) {
		if(pan.active && e.button == 1) {
			// a middle-button press that never turned into a drag toggles the
			// auto-scroll mode
			if(!pan.moved) {
				if(autoScroll.active) {
					stopAutoScroll();
				}
				else {
					startAutoScroll(e.clientX, e.clientY);
				}
			}
			pan.active = false;
			container.classList.remove("panning");
		}
		if(e.button == 2 && gEditMode.research) {
			researchRightClickRemove(e.clientX, e.clientY);
		}
	});
	container.addEventListener("contextmenu", function(e) {
		e.preventDefault();
	});
	container.addEventListener("wheel", function(e) {
		e.preventDefault();
		stopAutoScroll();
		if(e.ctrlKey) {
			// ctrl+wheel zooms the whole board about the cursor
			var rect = container.getBoundingClientRect();
			var delta = e.deltaY * (e.deltaMode == 1 ? 16 : e.deltaMode == 2 ? 100 : 1);
			applyZoom(e.clientX - rect.left, e.clientY - rect.top, gZoom * Math.exp(-delta * 0.0015));
			return;
		}
		// plain wheel pans (both axes); shift routes the vertical delta to the
		// horizontal axis for sideways panning
		var dx = e.deltaX;
		var dy = e.deltaY;
		if(e.shiftKey) {
			dx = dy;
			dy = 0;
		}
		if(gEditMode.production) {
			gProdCameraX -= dx;
			gProdCameraY -= dy;
			applyProductionCamera();
		}
		else {
			gCameraX -= dx;
			gCameraY -= dy;
			applyCamera();
		}
	});

	// F10: return to the hex origin (center of the viewport)
	window.addEventListener("keydown", function(e) {
		if(e.key == "Escape") {
			stopAutoScroll();
		}
		else if(e.key == "F10") {
			e.preventDefault();
			if(gEditMode.production) {
				centerProduction();
			}
			else {
				centerCamera();
			}
		}
	});
}

function duplicateCurrentToReagent() {
	if(!gMoleculeObj) {
		return;
	}
	var molecule = duplicateMolecule(gMoleculeObj);
	gPuzzleObj.reagents.push(molecule);
	updateReagents();
}

function duplicateCurrentToOutput() {
	if(!gMoleculeObj) {
		return;
	}
	var molecule = duplicateMolecule(gMoleculeObj);
	gPuzzleObj.outputs.push(molecule);
	updateOutputs();
}
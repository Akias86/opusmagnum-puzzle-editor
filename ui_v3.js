
// svg props
var svgWidth = 2400;//d3.select("#transmutation").node().offsetWidth;
var svgHeight = 2400;//d3.select("#transmutation").node().offsetHeight;
var svgContentSize = 2400;
var scale = d3.scaleLinear().domain([0,svgContentSize]).range([0, Math.min(svgHeight * 4/3, svgWidth)]).nice();

// camera state: pixel position of the hex origin (0,0) inside the transmutation
// viewport. the board is conceptually infinite; these offsets pan the camera.
var gCameraX = 0;
var gCameraY = 0;

// the puzzle file format stores each coordinate as a signed byte, so the board
// can only represent coordinates in [-128, 127]; grid cells outside this range
// are never rendered, which also keeps newly placed atoms in bounds.
var gGridMinCoord = -128;
var gGridMaxCoord = 127;

// prime/bond image files
function primeImg(d) {
	return "img/" + d.type + ".png";
}
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
var primeX = function(d) {
	return 60 * d.x + 30 * d.y - 20;
};
var primeY = function(d) {
	return 0.9 * 60 * -d.y - 20;
};
var bondWidth = 27;
var bondHeight = 18;
var bondX = function(d) {
	return 60 * (d.x1 + d.x2) / 2 + 30 * (d.y1 + d.y2) / 2 - bondWidth/2;
};
var bondY = function(d) {
	return 0.9 * 60 * -(d.y1 + d.y2) / 2 - bondHeight/2 - 1;
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

// prime/bond event functions
var primeClick = function(d) {
	if(gSelectedPrimeType == d.type) {
		var ind = gMoleculeObj.primes.indexOf(d);
		gMoleculeObj.primes.splice(ind, 1);
	}
	else {
		d.type = gSelectedPrimeType;
	}
	updateMolecule(gMoleculeObj);
};
var bprimeClick = function(d) {
	var prime = new Prime(gSelectedPrimeType, d.x, d.y);
	gMoleculeObj.primes.push(prime);
	updateMolecule(gMoleculeObj);
};
var bondClick = function(d) {
	var ind = gMoleculeObj.bonds.indexOf(d);
	gMoleculeObj.bonds.splice(ind, 1);
	updateMolecule(gMoleculeObj);
};
var bbondClick = function(d) {
	var bond = new Bond(gSelectedBondType, d.x1, d.y1, d.x2, d.y2);
	gMoleculeObj.bonds.push(bond);
	updateMolecule(gMoleculeObj);
};
var eventNothing = function() {
	d3.event.preventDefault();
};

// size of the transmutation viewport (the scroll container)
function transmutationViewSize() {
	var c = $I("transmutation");
	return {"w" : c.clientWidth, "h" : c.clientHeight};
}

// render only the background hexes visible under the current camera, so the
// board can extend infinitely without ever building a large DOM. the emitted
// hexes are clamped to the file format's coordinate range (gGridMinCoord..
// gGridMaxCoord), so beyond that range nothing is drawn and no atoms can be
// placed there.
function renderBackgroundWindow() {
	var size = transmutationViewSize();
	var margin = 120;

	// visible rectangle in camera space (hex origin at 0,0)
	var left = -gCameraX - margin;
	var right = (size.w - gCameraX) + margin;
	var top = -gCameraY - margin;
	var bottom = (size.h - gCameraY) + margin;

	// pixel mapping: px' = 60x + 30y, py' = -54y
	// inverse: y = -py'/54, x = (px' - 30y)/60
	// clamp to the representable coordinate range so no grid cells show outside
	// the file format's signed-byte limits ([-128, 127]).
	var y0 = Math.max(gGridMinCoord, Math.ceil(-bottom / 54));
	var y1 = Math.min(gGridMaxCoord, Math.floor(-top / 54));

	var primes = [];
	for(var y = y0; y <= y1; y++) {
		var x0 = Math.max(gGridMinCoord, Math.ceil((left - 30 * y) / 60));
		var x1 = Math.min(gGridMaxCoord, Math.floor((right - 30 * y) / 60));
		for(var x = x0; x <= x1; x++) {
			primes.push(new Prime("salt", x, y));
		}
	}
	var bgMolecule = new Molecule(primes, fullBond(primes));

	var layer = d3.select("#transmutation-bg");

	// background primes
	var bp = layer.selectAll(".bpr").data(bgMolecule.primes, function(d) { return d.x + "," + d.y; });
	bp.attr("x", primeX).attr("y", primeY);
	bp.exit().remove();
	bp.enter().append("image")
	.attr("class", "bpr")
	.attr("width", 40)
	.attr("height", 40)
	.attr("x", primeX)
	.attr("y", primeY)
	.attr("xlink:href", function(d) {
		if(d.x == 0 && d.y == 0) {
			// use the red panel at (0,0)
			return "img/bprime0.png";
		}
		return "img/bprime.png";
	})
	.on("click", bprimeClick);

	// background bonds
	var bb = layer.selectAll(".bbo").data(bgMolecule.bonds, function(d) { return d.x1 + "," + d.y1 + "-" + d.x2 + "," + d.y2; });
	bb.attr("x", bondX).attr("y", bondY).attr("transform", bondTransform);
	bb.exit().remove();
	bb.enter().append("image")
	.attr("class", "bbo")
	.attr("xlink:href", "img/bbond.png")
	.attr("x", bondX)
	.attr("y", bondY)
	.attr("transform", bondTransform)
	.attr("width", bondWidth)
	.attr("height", bondHeight)
	.on("click", bbondClick);
}

// move the camera and redraw the visible background window
function applyCamera() {
	d3.select("#transmutation-root").attr("transform", "translate(" + gCameraX + "," + gCameraY + ")");
	renderBackgroundWindow();
}

// re-center the camera on the hex origin (0,0), i.e. the middle of the viewport
function centerCamera() {
	var size = transmutationViewSize();
	gCameraX = size.w / 2;
	gCameraY = size.h / 2;
	applyCamera();
}

// init field
function generateField(bg) {
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
	root.attr("transform", "translate(" + gCameraX + "," + gCameraY + ")");

	// layers keep z-order stable while panning: background always behind
	// molecules, and the hover preview on top so it stays visible everywhere.
	if(d3.select("#transmutation-bg").empty()) {
		root.append("g").attr("id", "transmutation-bg");
	}
	if(d3.select("#transmutation-molecules").empty()) {
		root.append("g").attr("id", "transmutation-molecules");
	}
	if(d3.select("#transmutation-preview").empty()) {
		root.append("g").attr("id", "transmutation-preview");
	}

	renderBackgroundWindow();
}

// convert a point local to the transmutation viewport into the hex cell
// underneath it (research grid). pixel mapping used by renderBackgroundWindow:
// px' = 60x + 30y, py' = -54y; inverse: y = -py'/54, x = (px' - 30y)/60
function researchHexAtPoint(localX, localY) {
	var px = localX - gCameraX;
	var py = localY - gCameraY;
	var y = Math.round(-py / 54);
	var x = Math.round((px - 30 * y) / 60);
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
	var px = localX - gCameraX;
	var py = localY - gCameraY;
	var x = hex.x;
	var y = hex.y;
	var pmx = 60 * x + 30 * y;
	var pmy = -54 * y;
	var primeDist2 = (px - pmx) * (px - pmx) + (py - pmy) * (py - pmy);
	// the 6 bond centers around this cell (a bond sits at the midpoint between
	// two adjacent hex cells, matching the background bond images)
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
		var bx = 60 * (c[0] + c[2]) / 2 + 30 * (c[1] + c[3]) / 2;
		var by = -54 * (c[1] + c[3]) / 2;
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

// draw the ghost preview for the current hover state in the research layer
function renderResearchHoverPreview(state) {
	var layer = d3.select("#transmutation-preview");
	if(layer.empty()) {
		return;
	}
	layer.selectAll(".hover-preview").remove();
	if(!state) {
		return;
	}
	if(state.type == "bond") {
		var fakeBond = new Bond(gSelectedBondType, state.bond.x1, state.bond.y1, state.bond.x2, state.bond.y2);
		layer.append("image")
		.datum(fakeBond)
		.attr("class", "hover-preview")
		.attr("width", scale(bondWidth))
		.attr("height", scale(bondHeight))
		.attr("x", bondX)
		.attr("y", bondY)
		.attr("transform", bondTransform)
		.attr("xlink:href", bondImg)
		.style("opacity", 0.45)
		.style("pointer-events", "none");
	}
	else {
		var fakePrime = new Prime(gSelectedPrimeType, state.hex.x, state.hex.y);
		layer.append("image")
		.datum(fakePrime)
		.attr("class", "hover-preview")
		.attr("width", scale(40))
		.attr("height", scale(40))
		.attr("x", primeX)
		.attr("y", primeY)
		.attr("xlink:href", primeImg)
		.style("opacity", 0.45)
		.style("pointer-events", "none");
	}
}

// update the semi-transparent ghost preview over the research editing area:
// hovering a hex shows the selected atom, hovering a bond shows the selected bond.
function updateResearchHoverPreview(localX, localY) {
	if(typeof hideProductionHoverPreview == 'function') {
		hideProductionHoverPreview();
	}
	var layer = d3.select("#transmutation-preview");
	if(!layer.empty()) {
		layer.selectAll(".hover-preview").remove();
	}
	if(!gEditMode.research) {
		gHoverState = null;
		return;
	}
	var state = researchNearestFeature(localX, localY);
	gHoverState = state;
	renderResearchHoverPreview(state);
}

// route the ghost preview to the active editing mode (research/production)
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

// hide the research ghost preview (keeps gHoverState untouched)
function hideResearchHoverPreview() {
	var layer = d3.select("#transmutation-preview");
	if(!layer.empty()) {
		layer.selectAll(".hover-preview").remove();
	}
}

// hide the ghost preview in both layers and forget the hover position
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
	// refresh the ghost preview in case the mouse is already over the field
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
	// refresh the ghost preview in case the mouse is already over a bond
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
		.style("background", "url('img/" + prime + ".png') 0 0 / 100% 100%")
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

  // update primes
  var svgPrimes = svg.selectAll(".pr").data(gMoleculeObj.primes);

  // --update
  svgPrimes.attr("x", primeX).attr("y", primeY).attr("xlink:href", primeImg);
  // --exit
  svgPrimes.exit().remove();
  // --enter
  svgPrimes.enter()
  .append("image")
  .attr("class", "pr")
  .attr("width", scale(40))
  .attr("height", scale(40))
  .attr("x", primeX)
  .attr("y", primeY)
  .attr("xlink:href", primeImg)
  .on("click", primeClick);

  // update bonds
  var svgBonds = svg.selectAll(".bo").data(gMoleculeObj.bonds);

  // --update
  svgBonds
  .attr("xlink:href", bondImg)
  .attr("x", bondX)
  .attr("y", bondY)
  .attr("transform", bondTransform);
  // --exit
  svgBonds.exit().remove();
  // --enter
  svgBonds.enter()
  .append("image")
  .attr("class", "bo")
  .attr("xlink:href", bondImg)
  .attr("x", bondX)
  .attr("y", bondY)
  .attr("transform", bondTransform)
  .attr("width", scale(bondWidth))
  .attr("height", scale(bondHeight))
	.on("click", bondClick);
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

// right-button drag (or mouse wheel) to pan the infinite boards.
// research moves the molecule camera; production moves its own camera.
function initTransmutationPan() {
	var pan = {
		"active" : false,
		"startX" : 0,
		"startY" : 0,
		"camX" : 0,
		"camY" : 0,
		"prodCamX" : 0,
		"prodCamY" : 0
	};
	var container = $I("transmutation");
	container.addEventListener("mousedown", function(e) {
		if(e.button != 2) {
			return;
		}
		e.preventDefault();
		pan.active = true;
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

	// semi-transparent ghost preview follows the mouse over the editing area
	container.addEventListener("mousemove", function(e) {
		var rect = container.getBoundingClientRect();
		updateHoverPreview(e.clientX - rect.left, e.clientY - rect.top);
	});
	container.addEventListener("mouseleave", function() {
		hideHoverPreview();
	});
	window.addEventListener("mousemove", function(e) {
		if(!pan.active) {
			return;
		}
		e.preventDefault();
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
		if(pan.active) {
			pan.active = false;
			container.classList.remove("panning");
		}
	});
	container.addEventListener("contextmenu", function(e) {
		e.preventDefault();
	});
	container.addEventListener("wheel", function(e) {
		var dx = e.deltaX;
		var dy = e.deltaY;
		if(e.shiftKey) {
			// shift + wheel scrolls horizontally; browsers report the vertical
			// delta even when shift is held, so route it to the x axis.
			dx = dy;
			dy = 0;
		}
		e.preventDefault();
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
		if(e.key == "F10") {
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

// resize function (kept for compatibility: recenters the camera and redraws)
function resizeField(contentSize, moleculeSize) {
	generateField(gBgMolecule);
	updateMolecule(gPuzzleObj.outputs[0] || new Molecule());
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
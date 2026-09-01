'use strict';

// define another scale/positioning set for new svg
var svgWidthProd = 2400;
var svgHeightProd = 2400;
var svgContentSizeProd = 3600;
var scaleProd = d3.scaleLinear().domain([0,svgContentSizeProd]).range([0, Math.min(svgHeightProd * 4/3, svgWidthProd)]);

// production grid geometry, design units (scaleProd turns them into pixels:
// ×2/3): horizontal cell spacing 61.5 (=41px), vertical row spacing 53.25
// (=35.5px), horizontal row offset 30.75 (=20.5px), hexagon height 71 (=47.33px).
var prodCellW = 61.5;
var prodRowOff = 30.75;
var prodRowSpace = 53.25;
var prodHexH = 71;

// hex center (pixels) of a cell (x, y)
var prodCenterX = function(d) {
    return scaleProd(prodCellW * d.x + prodRowOff * d.y);
};
var prodCenterY = function(d) {
    return scaleProd(prodRowSpace * -d.y);
};

// pipe atom sprite (84x95) and bond sprite (30x20), rendered at 50%
var pipeSpriteW = 84 / 2;
var pipeSpriteH = 95 / 2;
var pipeBondW = 30 / 2;
var pipeBondH = 20 / 2;

// =====================================================================
// SPRITE ANCHOR OFFSETS (pixels) — the single place to fine-tune how
// each sprite sits on its hex. Positive dx moves the sprite right,
// positive dy moves it down. Edit these values and refresh the page.
//
//   region[*]: the sprite is centered on the hex, then shifted by {dx,dy}.
//              (wide regions are pre-shifted +20/+40 because their socket
//              sits left of center in the art.)
//   vial[*]:   extra shift on top of VIAL_SOCKET (the socket position
//              measured from the sprite's top-left corner).
//   pipe:      pipe atom sprite, centered on the hex.
//   pbond:     pipe bond sprite, centered on the bond midpoint.
// =====================================================================
var VIAL_SOCKET = {"x" : 55, "topY" : 32, "bottomY" : 102};

var SPRITE_OFFSET = {
    region: {
        "Small"      : {"dx" : 1,  "dy" : -.5},
        "SmallWide"  : {"dx" : 21.25, "dy" : -1},
        "SmallWider" : {"dx" : 41.85, "dy" : -1},
        "Medium"     : {"dx" : .2,  "dy" : -1},
        "MediumWide" : {"dx" : 21, "dy" : -1.5},
        "Large"      : {"dx" : -.5  ,  "dy" : -2}
    },
    vial: {
        "b0" : {"dx" : 0, "dy" : 0},
        "b1" : {"dx" : 0, "dy" : 0},
        "b2" : {"dx" : 0, "dy" : 0},
        "b3" : {"dx" : 3, "dy" : 0},
        "t0" : {"dx" : 0, "dy" : 0},
        "t1" : {"dx" : 0, "dy" : 0},
        "t2" : {"dx" : 0, "dy" : 0},
        "t3" : {"dx" : 3, "dy" : 0}
    },
    pipe:  {"dx" : 0, "dy" : .5},
    pbond: {"dx" : 0, "dy" : 0}
};

// pipe bond: centered on the bond midpoint, rotated to the bond direction
var bondXProd = function(d) {
    return scaleProd(prodCellW * (d.x1 + d.x2) / 2 + prodRowOff * (d.y1 + d.y2) / 2) - pipeBondW/2 + SPRITE_OFFSET.pbond.dx;
};
var bondYProd = function(d) {
    return scaleProd(prodRowSpace * -(d.y1 + d.y2) / 2) - pipeBondH/2 - scaleProd(1) + SPRITE_OFFSET.pbond.dy;
};
var bondTransformProd = function(d) {
    if(d.y2 == d.y1) {
        return "";
    }
    else if(d.y2 != d.y1 && d.x2 != d.x1) {
        return "rotate(60 " + (bondXProd(d) + pipeBondW/2) + " " + (bondYProd(d) + pipeBondH/2) + ")";
    }
    else {
        return "rotate(120 " + (bondXProd(d) + pipeBondW/2) + " " + (bondYProd(d) + pipeBondH/2) + ")";
    }
};

// region calculators
// all production sprites are rendered at 50% of their original image size,
// positioned so their anchor (socket) point stays on the target hex.
var regionSizes = {
    "Small" : [309, 282],
    "SmallWide" : [391, 284],
    "SmallWider" : [473, 284],
    "Medium" : [472, 436],
    "MediumWide" : [556, 438],
    "Large" : [645, 581]
};
function regionWidth(d) {
    return (regionSizes[d.type] ? regionSizes[d.type][0] : 309) / 2;
}
function regionHeight(d) {
    return (regionSizes[d.type] ? regionSizes[d.type][1] : 282) / 2;
}
function regionX(d) {
    var o = SPRITE_OFFSET.region[d.type] || SPRITE_OFFSET.region.Small;
    return prodCenterX(d) - regionWidth(d)/2 + o.dx;
}
function regionY(d) {
    var o = SPRITE_OFFSET.region[d.type] || SPRITE_OFFSET.region.Small;
    return prodCenterY(d) - regionHeight(d)/2 + o.dy;
}

// vial calculators
var vialSizes = {
    "b0" : [301, 268], "b1" : [463, 266], "b2" : [622, 266], "b3" : [785, 265],
    "t0" : [296, 264], "t1" : [459, 260], "t2" : [621, 260], "t3" : [781, 262]
};
function vialSizeKey(d) {
    return (d.isTop ? "t" : "b") + d.count;
}
function vialWidth(d) {
    return (vialSizes[vialSizeKey(d)] ? vialSizes[vialSizeKey(d)][0] : 301) / 2;
}
function vialHeight(d) {
    return (vialSizes[vialSizeKey(d)] ? vialSizes[vialSizeKey(d)][1] : 268) / 2;
}
function vialX(d) {
    var o = SPRITE_OFFSET.vial[vialSizeKey(d)] || SPRITE_OFFSET.vial.b0;
    return prodCenterX(d) - VIAL_SOCKET.x + o.dx;
}
function vialY(d) {
    var o = SPRITE_OFFSET.vial[vialSizeKey(d)] || SPRITE_OFFSET.vial.b0;
    return prodCenterY(d) - (d.isTop ? VIAL_SOCKET.topY : VIAL_SOCKET.bottomY) + o.dy;
}

// production camera: pixel position of the hex origin (0,0) inside the
// production viewport, mirroring the research board's navigation.
var gProdCameraX = 0;
var gProdCameraY = 0;

// render only the production background hexes visible under the current
// camera, clamped to the file format's coordinate range (same as research).
function renderProductionBackgroundWindow() {
    var size = transmutationViewSize();
    var margin = 120;
    var left = -gProdCameraX - margin;
    var right = (size.w - gProdCameraX) + margin;
    var top = -gProdCameraY - margin;
    var bottom = (size.h - gProdCameraY) + margin;

    // production pixel mapping: px' = 41x + 20.5y, py' = -35.5y
    // inverse: y = -py'/35.5, x = px'/41 - y/2
    var prodRowPx = scaleProd(prodRowSpace);
    var prodColPx = scaleProd(prodCellW);
    var y0 = Math.max(gGridMinCoord, Math.ceil(-bottom / prodRowPx));
    var y1 = Math.min(gGridMaxCoord, Math.floor(-top / prodRowPx));

    var primes = [];
    for(var y = y0; y <= y1; y++) {
        var x0 = Math.max(gGridMinCoord, Math.ceil(left / prodColPx - 0.5 * y));
        var x1 = Math.min(gGridMaxCoord, Math.floor(right / prodColPx - 0.5 * y));
        for(var x = x0; x <= x1; x++) {
            primes.push(new Prime("salt", x, y));
        }
    }

    var hexagonLineColor = "rgb(128, 128, 128)";
    var hexagonBgColor = "rgba(0, 0, 0, 0)";
    var hexagonBgMidColor = "rgba(128, 0, 0, 0.5)";

    var drawHexagon = function(x, y, w, h) { return d3.line()
    .x(function(d) { return d.x; })
    .y(function(d) { return d.y; })
    .curve(d3.curveLinear)([
        {"x" : x + w/2, "y" : y - h/4},
        {"x" : x + w/2, "y" : y + h/4},
        {"x" : x, "y" : y + h/2},
        {"x" : x - w/2, "y" : y + h/4},
        {"x" : x - w/2, "y" : y - h/4},
        {"x" : x, "y" : y - h/2},
        {"x" : x + w/2, "y" : y - h/4}
    ])};

    var layer = d3.select("#production-bg");
    var pbh = layer.selectAll(".pbh").data(primes, function(d) { return d.x + "," + d.y; });
    pbh.attr("d", function(d) {
        return drawHexagon(prodCenterX(d), prodCenterY(d), scaleProd(prodCellW), scaleProd(prodHexH));
    });
    pbh.exit().remove();
    pbh.enter().append("path")
    .attr("class", "pbh")
    .attr("d", function(d) {
        return drawHexagon(prodCenterX(d), prodCenterY(d), scaleProd(prodCellW), scaleProd(prodHexH));
    })
    .attr("stroke", hexagonLineColor)
    .attr("fill", function(d) { return d.x == 0 && d.y == 0 ? hexagonBgMidColor : hexagonBgColor; })
    .on("click", productionBgHexClick);
}

// move the production camera and redraw the visible background window
function applyProductionCamera() {
    d3.select("#production-root").attr("transform", "translate(" + gProdCameraX + "," + gProdCameraY + ")");
    renderProductionBackgroundWindow();
}

// functions
function showResearchTab() {
    hideHoverPreview();
    d3.selectAll("#research-area-left,#transmutation-svg").style("display","block");
    d3.selectAll("#production-area,#production-svg").style("display","none");
    d3.select("#transmutation").style("overflow", "hidden");
    gEditMode = {
        "research" : true,
        "production" : false,
        "pipeShape" : false,
        "pipeIO" : false
    };
    d3.selectAll("#tab-production").classed("tab-selected", false);
    d3.selectAll("#tab-research").classed("tab-selected", true);
}

// center the production camera on the hex origin (0,0), i.e. the middle of the viewport
function centerProduction() {
    var size = transmutationViewSize();
    gProdCameraX = size.w / 2;
    gProdCameraY = size.h / 2;
    applyProductionCamera();
}

function showProductionTab() {
    hideHoverPreview();
    d3.selectAll("#research-area-left,#transmutation-svg").style("display","none");
    d3.selectAll("#production-area,#production-svg").style("display","block");
    d3.select("#transmutation").style("overflow", "hidden");
    centerProduction();
    gEditMode = {
        "research" : false,
        "production" : true,
        "pipeShape" : (gSelectedProductionTool && gSelectedProductionTool.is == "pipe" && gSelectedProductionTool.type == "shape"),
        "pipeIO" : !(gSelectedProductionTool && gSelectedProductionTool.is == "pipe" && gSelectedProductionTool.type == "shape")
    };
    d3.selectAll("#tab-production").classed("tab-selected", true);
    d3.selectAll("#tab-research").classed("tab-selected", false);
}

// initialize production
// use gSelectedProductionTool == null as an Accelerator condition
function initProduction() {
    if(!gSelectedProductionTool) {
        gSelectedPipe = gPuzzleObj.productionInfo.pipes[0];
        updateProductionField(15);
        updateProduction();
        updateProductionToolbox();
        updateProductionBoard();

        d3.select("#pipe-add").on("click", addPipe);
        d3.select("#tab-research").on("click", showResearchTab);
        d3.select("#tab-production").on("click", showProductionTab);

        showResearchTab();
        d3.select(".production-toolbox-item").node().click();
    }
}

// updates production info left bar
function updateProduction() {
    var prodOn = gPuzzleObj.isProduction;
    var prod = gPuzzleObj.productionInfo;

    // update each of the checkbox flags
    var productionFlags = [{
        "value" : prodOn,
        "selector" : "#production-checkbox-on",
        "action" : function() {
            gPuzzleObj.isProduction = !gPuzzleObj.isProduction;
            updateProduction();
        }
    }, {
        "value" : prod.shrinkLeft,
        "selector" : "#production-checkbox-shrink-left",
        "action" : function() {
            gPuzzleObj.productionInfo.shrinkLeft = !gPuzzleObj.productionInfo.shrinkLeft;
            updateProduction();
        }
    }, {
        "value" : prod.shrinkRight,
        "selector" : "#production-checkbox-shrink-right",
        "action" : function() {
            gPuzzleObj.productionInfo.shrinkRight = !gPuzzleObj.productionInfo.shrinkRight;
            updateProduction();
        }
    }, {
        "value" : prod.isolateIO,
        "selector" : "#production-checkbox-isolate-io",
        "action" : function() {
            gPuzzleObj.productionInfo.isolateIO = !gPuzzleObj.productionInfo.isolateIO;
            updateProduction();
        }
    }];
    productionFlags.forEach(function(item) {
        d3.select(item.selector)
        .style("background", function(d) {
            if(item.value) {
                return "url('img/ch1.png')";
            }
            return "url('img/ch0.png')";
        })
        .style("background-size", function(d) {
            return "100% 100%"
        })
        .on("click", item.action);
    });

    updatePipeList();
}

// background of production svg
function updateProductionField(param) {
    var size = transmutationViewSize();
    gProdCameraX = size.w / 2;
    gProdCameraY = size.h / 2;

    var svg = d3.select("#production-svg").attr("width", size.w).attr("height", size.h)
    .style("position", "absolute")
    .style("left", "0")
    .style("top", "0")
    .on("dragstart", eventNothing)
    .on("drag", eventNothing)
    .on("dragend", eventNothing)
    .on("dragout", eventNothing);

    // root group is translated by the camera; two layers keep the background
    // (hexes) below the foreground (regions/vials/pipes) while panning.
    var root = d3.select("#production-root");
    if(root.empty()) {
        root = svg.append("g").attr("id", "production-root");
    }
    root.attr("transform", "translate(" + gProdCameraX + "," + gProdCameraY + ")");
    if(d3.select("#production-bg").empty()) {
        root.append("g").attr("id", "production-bg");
    }
    if(d3.select("#production-fore").empty()) {
        root.append("g").attr("id", "production-fore");
    }
    if(d3.select("#production-preview").empty()) {
        root.append("g").attr("id", "production-preview");
    }

    renderProductionBackgroundWindow();
}

// show the tools in the production toolbox
function updateProductionToolbox() {
    var objects = getProductionToolboxObjects();
    d3.select("#production-toolbox-items")
    .selectAll(".production-toolbox-item").data(objects)
    .enter()
    .append("div")
    .classed("production-toolbox-item", true)
    .style("background-image", function(d) {
        return "url(\"img/prod/" + d.image + "\")";
    })
    .on("click", productionToolboxClick);

}

// foreground of production svg
function updateProductionBoard() {
    var prod = gPuzzleObj.productionInfo;
    var svg = d3.select("#production-fore");

    // put regions on board
    var svgRegions = svg.selectAll(".reg").data(prod.regions);
    svgRegions
    .attr("xlink:href", function(d) {
        return "img/regions/" + d.type + ".png";
    })
    .attr("width", regionWidth)
    .attr("height", regionHeight)
    .attr("x", regionX)
    .attr("y", regionY);

    svgRegions.exit().remove();

    svgRegions.enter().append("image")
    .classed("reg", true)
    .style("pointer-events", "none")
    .attr("xlink:href", function(d) {
        return "img/regions/" + d.type + ".png";
    })
    .attr("width", regionWidth)
    .attr("height", regionHeight)
    .attr("x", regionX)
    .attr("y", regionY);

    // put vials on board
    var svgVials = svg.selectAll(".vil").data(prod.vials);
    svgVials
    .attr("xlink:href", function(d) {
        return "img/prod/v" + (d.isTop ? "t" : "b") + d.count + ".png";
    })
    .attr("width", vialWidth)
    .attr("height", vialHeight)
    .attr("x", vialX)
    .attr("y", vialY);

    svgVials.exit().remove();

    svgVials.enter().append("image")
    .classed("vil", true)
    .style("pointer-events", "none")
    .attr("xlink:href", function(d) {
        return "img/prod/v" + (d.isTop ? "t" : "b") + d.count + ".png";
    })
    .attr("width", vialWidth)
    .attr("height", vialHeight)
    .attr("x", vialX)
    .attr("y", vialY);

    // put pipes on board
    updateProductionPipe();
}

// update the pipe displayed in the grid
function updateProductionPipe() {
    var svg = d3.select("#production-fore");
    if(!gSelectedPipe) {
        svg.selectAll(".pipe").remove();
        return;
    }
    var pipe = gSelectedPipe;

    // we have two modes, white pipe = editable shape, red/blue = uneditable / movable
    if(gEditMode.pipeShape) {
        var molecule = generatePipeMolecule(pipe.offsets);
        renderPipeMolecule(molecule, "pipe-prime", "pipe-bond", "img/prod/pipe.png", "img/prod/pbond.png", pipeClick);
        svg.selectAll(".pipe-i-prime").remove();
        svg.selectAll(".pipe-i-bond").remove();
        svg.selectAll(".pipe-o-prime").remove();
        svg.selectAll(".pipe-o-bond").remove();
    }
    else if(gEditMode.pipeIO) {
        var inputMolecule = generatePipeMolecule(pipe.offsets.map(function(offset) {
            return {"x": offset.x + pipe.x1, "y": offset.y + pipe.y1};
        }));
        var outputMolecule = generatePipeMolecule(pipe.offsets.map(function(offset) {
            return {"x": offset.x + pipe.x2, "y": offset.y + pipe.y2};
        }));
        renderPipeMolecule(inputMolecule, "pipe-i-prime", "pipe-i-bond", "img/prod/pipe-red.png", "img/prod/pbond.png", null);
        renderPipeMolecule(outputMolecule, "pipe-o-prime", "pipe-o-bond", "img/prod/pipe-blue.png", "img/prod/pbond.png", null);

        svg.selectAll(".pipe-prime").remove();
        svg.selectAll(".pipe-bond").remove();
    }
    else {
        svg.selectAll(".pipe").remove();
        return;
    }
}

// render the molecule with many parameters
function renderPipeMolecule(molecule, classNamePrime, classNameBond, img, imgBond, callback) {
    var svg = d3.select("#production-fore");
    var pipePrimes = svg.selectAll("." + classNamePrime).data(molecule.primes);

    // pipe molecule update/exit/enter
    pipePrimes
    .attr("x", function(d) { return prodCenterX(d) - pipeSpriteW/2 + SPRITE_OFFSET.pipe.dx; })
    .attr("y", function(d) { return prodCenterY(d) - pipeSpriteH/2 + SPRITE_OFFSET.pipe.dy; });

    pipePrimes.exit().remove();

    // pipe atoms are centered on their hex and rendered at 50% of the original
    var enter = pipePrimes.enter().append("image")
    .classed("pipe", true)
    .classed(classNamePrime, true)
    .attr("xlink:href", img)
    .attr("width", pipeSpriteW)
    .attr("height", pipeSpriteH)
    .attr("x", function(d) { return prodCenterX(d) - pipeSpriteW/2 + SPRITE_OFFSET.pipe.dx; })
    .attr("y", function(d) { return prodCenterY(d) - pipeSpriteH/2 + SPRITE_OFFSET.pipe.dy; });

    // for red/blue pipes there is no callback
    if(callback) {
        enter.on("click", callback);
    }

    // pipe bond update/exit/enter
    var pipeBonds = svg.selectAll("." + classNameBond).data(molecule.bonds);

    pipeBonds
    .attr("x", bondXProd)
    .attr("y", bondYProd)
    .attr("transform", bondTransformProd);

    pipeBonds.exit().remove();

    pipeBonds.enter().append("image")
    .classed("pipe", true)
    .classed(classNameBond, true)
    .attr("xlink:href", imgBond)
    .attr("x", bondXProd)
    .attr("y", bondYProd)
    .attr("transform", bondTransformProd)
    .attr("width", pipeBondW)
    .attr("height", pipeBondH);

}

// select tool. if selects pipe we also need to change the diplay mode
function productionToolboxClick(d, i) {
    d3.selectAll(".production-toolbox-item")
    .classed("production-toolbox-selected", false)
    .filter(function(d0) { return d0 == d;})
    .classed("production-toolbox-selected", true);

    gSelectedProductionTool = d;

    if(d.is == "pipe") {
        var svg = d3.select("#production-fore");
        svg.selectAll(".reg,.vil").style("pointer-events", "none");
    }
    else if(d.is == "vial") {
        var svg = d3.select("#production-fore");
        svg.selectAll(".reg").style("pointer-events", "none");
        svg.selectAll(".vil").style("pointer-events", "none");
    }
    else {
        var svg = d3.select("#production-fore");
        svg.selectAll(".reg").style("pointer-events", "none");
        svg.selectAll(".vil").style("pointer-events", "none");
    }

    // update pipe mode
    if(d.is == "pipe" && d.type == "shape") {
        gEditMode.pipeShape = true;
        gEditMode.pipeIO = false;
    }
    else {
        gEditMode.pipeShape = false;
        gEditMode.pipeIO = true;
    }
    updateProductionPipe();

    // refresh the hover preview in case the mouse is already over the board
    if(gEditMode.production && gHoverLocalX != null) {
        updateHoverPreview(gHoverLocalX, gHoverLocalY);
    }
}

function productionBgHexClick(d, i) {
    if(!gEditMode.production) {
        return;
    }
    var tool = gSelectedProductionTool;
    var prod = gPuzzleObj.productionInfo;
    if(!tool) {
        return;
    }
    if(tool.is == "region") {
        // placing on an anchor already holding the same-size region cancels
        // that region; different sizes coexist on the same anchor.
        var idx = -1;
        for(var i = 0; i < prod.regions.length; i++) {
            if(prod.regions[i].x == d.x && prod.regions[i].y == d.y && prod.regions[i].type == tool.type) {
                idx = i;
                break;
            }
        }
        if(idx >= 0) {
            prod.regions.splice(idx, 1);
        }
        else {
            prod.regions.push(new Region(d.x, d.y, tool.type));
        }
        updateProductionBoard();
    }
    else if(tool.is == "vial") {
        // placing on an anchor already holding the same vial type cancels that
        // vial; different types (isTop/count) coexist on the same anchor.
        var vidx = -1;
        for(var j = 0; j < prod.vials.length; j++) {
            if(prod.vials[j].x == d.x && prod.vials[j].y == d.y && prod.vials[j].isTop == tool.isTop && prod.vials[j].count == tool.count) {
                vidx = j;
                break;
            }
        }
        if(vidx >= 0) {
            prod.vials.splice(vidx, 1);
        }
        else {
            prod.vials.push(new Vial(d.x, d.y, tool.isTop, tool.count));
        }
        updateProductionBoard();
    }
    else if(tool.is == "pipe") {
        if(tool.type == "shape") {
            gSelectedPipe.offsets.push({"x": d.x, "y": d.y});
            updateProductionPipe();
        }
        else if(tool.type == "input") {
            gSelectedPipe.x1 = d.x;
            gSelectedPipe.y1 = d.y;
            updateProductionPipe();
        }
        else if(tool.type == "output") {
            gSelectedPipe.x2 = d.x;
            gSelectedPipe.y2 = d.y;
            updateProductionPipe();
        }
    }
}

function pipeClick(d, i) {
    if(!gEditMode.production) {
        return;
    }
    gSelectedPipe.offsets.splice(i, 1);
    updateProductionPipe();
}

// highlight the current pipe being edited
function updateHighlightedPipe() {
    var prod = gPuzzleObj.productionInfo;
    var od = d3.select("#pipe-items").selectAll(".pipe-option").data(prod.pipes);

    od.classed("pipe-highlight", function(d) {
        if(gSelectedPipe == d) {
            return true;
        }
        return false;
    });
}

// update pipe list
function updatePipeList() {
    var prod = gPuzzleObj.productionInfo;
    var od = d3.select("#pipe-items").selectAll(".pipe-option").data(prod.pipes);

    // --update
    od.select(".pipe-select")
    .html(function(d, i) {
        return "P#" + (1+i);
    })
    // --exit
    od.exit().remove();
    // --enter
    var ro = od.enter().append("div")
    .classed("pipe-option", true);
    ro.append("a")
    .classed("pipe-select", true)
    .html(function(d, i) {
        return "P#" + (1+i);
    })
    .on("click", function(d) {
        gSelectedPipe = d;
        updateProductionPipe();
        updateHighlightedPipe();
    });
    ro.append("a")
    .classed("pipe-remove", true)
    .html("(del)")
    .on("click", function(d, i) {
        gPuzzleObj.productionInfo.pipes.splice(i, 1);
        updatePipeList();
        gSelectedPipe = null;
        updateProductionPipe();
    });
    updateHighlightedPipe();
}

function addPipe() {
    gPuzzleObj.productionInfo.pipes.push(new Pipe());
    updatePipeList();
}
// convert a point local to the production viewport into the hex cell underneath
// it. production mapping: px' = 41x + 20.5y, py' = -35.5y; inverse:
// y = -py'/35.5, x = px'/41 - y/2 (see renderProductionBackgroundWindow)
function productionHexAtPoint(localX, localY) {
    var px = localX - gProdCameraX;
    var py = localY - gProdCameraY;
    var y = Math.round(-py / scaleProd(prodRowSpace));
    var x = Math.round(px / scaleProd(prodCellW) - 0.5 * y);
    if(x < gGridMinCoord || x > gGridMaxCoord || y < gGridMinCoord || y > gGridMaxCoord) {
        return null;
    }
    return {"x" : x, "y" : y};
}

// draw the ghost preview of the selected production tool in the production layer
function renderProductionHoverPreview(hex) {
    var layer = d3.select("#production-preview");
    if(layer.empty()) {
        return;
    }
    layer.selectAll(".hover-preview").remove();
    if(!hex || !gSelectedProductionTool) {
        return;
    }
    var tool = gSelectedProductionTool;
    var img = layer.append("image")
    .attr("class", "hover-preview")
    .style("opacity", 0.45)
    .style("pointer-events", "none");
    if(tool.is == "region") {
        var d = {"x" : hex.x, "y" : hex.y, "type" : tool.type};
        img.datum(d)
        .attr("xlink:href", "img/regions/" + tool.type + ".png")
        .attr("width", regionWidth)
        .attr("height", regionHeight)
        .attr("x", regionX)
        .attr("y", regionY);
    }
    else if(tool.is == "vial") {
        var d = {"x" : hex.x, "y" : hex.y, "isTop" : tool.isTop, "count" : tool.count};
        img.datum(d)
        .attr("xlink:href", "img/prod/v" + (tool.isTop ? "t" : "b") + tool.count + ".png")
        .attr("width", vialWidth)
        .attr("height", vialHeight)
        .attr("x", vialX)
        .attr("y", vialY);
    }
    else if(tool.is == "pipe") {
        var d = {"x" : hex.x, "y" : hex.y};
        var href = tool.type == "shape" ? "img/prod/pipe.png"
                 : (tool.type == "input" ? "img/prod/pipe-red.png" : "img/prod/pipe-blue.png");
        img.datum(d)
        .attr("xlink:href", href)
        .attr("width", pipeSpriteW)
        .attr("height", pipeSpriteH)
        .attr("x", function(d0) { return prodCenterX(d0) - pipeSpriteW/2 + SPRITE_OFFSET.pipe.dx; })
        .attr("y", function(d0) { return prodCenterY(d0) - pipeSpriteH/2 + SPRITE_OFFSET.pipe.dy; });
    }
}

// update the semi-transparent ghost preview over the production editing area,
// mirroring the research preview: it shows the selected region/vial/pipe tool.
function updateProductionHoverPreview(localX, localY) {
    if(typeof hideResearchHoverPreview == 'function') {
        hideResearchHoverPreview();
    }
    var layer = d3.select("#production-preview");
    if(!layer.empty()) {
        layer.selectAll(".hover-preview").remove();
    }
    if(!gEditMode.production) {
        gHoverState = null;
        return;
    }
    var hex = productionHexAtPoint(localX, localY);
    gHoverState = {"type" : "tool", "hex" : hex};
    renderProductionHoverPreview(hex);
}

// hide the production ghost preview (keeps gHoverState untouched)
function hideProductionHoverPreview() {
    var layer = d3.select("#production-preview");
    if(!layer.empty()) {
        layer.selectAll(".hover-preview").remove();
    }
}

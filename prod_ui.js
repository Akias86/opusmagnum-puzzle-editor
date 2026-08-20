'use strict';

// define another scale/positioning set for new svg
var svgWidthProd = 2400;
var svgHeightProd = 2400;
var svgContentSizeProd = 3600;
var scaleProd = d3.scaleLinear().domain([0,svgContentSizeProd]).range([0, Math.min(svgHeightProd * 4/3, svgWidthProd)]);

var primeXProd = function(d) {
    return scaleProd(60 * d.x + 30 * d.y) - scaleProd(20);
};
var primeYProd = function(d) {
    return scaleProd(0.9 * 60 * -d.y) - scaleProd(20);
};
var bondXProd = function(d) {
    return scaleProd(60 * (d.x1 + d.x2) / 2 + 30 * (d.y1 + d.y2) / 2) - scaleProd(bondWidth/2);
};
var bondYProd = function(d) {
    return scaleProd(0.9 * 60 * -(d.y1 + d.y2) / 2) - scaleProd(bondHeight/2) - scaleProd(1);
};
var bondTransformProd = function(d) {
    if(d.y2 == d.y1) {
        return "";
    }
    else if(d.y2 != d.y1 && d.x2 != d.x1) {
        return "rotate(60 " + (bondXProd(d) + scaleProd(bondWidth/2)) + " " + (bondYProd(d) + scaleProd(bondHeight/2)) + ")";
    }
    else {
        return "rotate(120 " + (bondXProd(d) + scaleProd(bondWidth/2)) + " " + (bondYProd(d) + scaleProd(bondHeight/2)) + ")";
    }
};

// region calculators
function regionWidth(d) {
    var rws = {
        "Small" : 240,
        "SmallWide" : 360,
        "SmallWider" : 480,
        "Medium" : 360,
        "MediumWide" : 480,
        "Large" : 480
    };
    return scaleProd(rws[d.type] || 240);
}
function regionHeight(d) {
    var rhs = {
        "Small" : 216,
        "SmallWide" : 216,
        "SmallWider" : 216,
        "Medium" : 324,
        "MediumWide" : 324,
        "Large" : 432
    };
    return scaleProd(rhs[d.type] || 240);
}
function regionX(d) {
    if(d.type == "SmallWide" || d.type == "MediumWide") {
        var offset = regionWidth(d)/2 - scaleProd(30);
    }
    else if(d.type == "SmallWider") {
        var offset = regionWidth(d)/2 - scaleProd(60);
    }
    else {
        var offset = regionWidth(d)/2;
    }
    return scaleProd(60 * d.x + 30 * d.y) - offset;
}
function regionY(d) {
    return scaleProd(0.9 * 60 * -d.y) - regionHeight(d)/2;
}

// vial calculators
function vialWidth(d) {
    return scaleProd(210 + d.count * 120);
}
function vialHeight(d) {
    return scaleProd(216);
}
function vialX(d) {
    return scaleProd(60 * d.x + 30 * d.y) - scaleProd(75);
}
function vialY(d) {
    return scaleProd(0.9 * 60 * -d.y) - scaleProd(d.isTop ? 54 : 162);
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

    // production pixel mapping: px' = (2/3)(60x + 30y) = 40x + 20y,
    // py' = (2/3)(0.9*60*-y) = -36y
    // inverse: y = -py'/36, x = px'/40 - y/2
    var y0 = Math.max(gGridMinCoord, Math.ceil(-bottom / 36));
    var y1 = Math.min(gGridMaxCoord, Math.floor(-top / 36));

    var primes = [];
    for(var y = y0; y <= y1; y++) {
        var x0 = Math.max(gGridMinCoord, Math.ceil(left / 40 - 0.5 * y));
        var x1 = Math.min(gGridMaxCoord, Math.floor(right / 40 - 0.5 * y));
        for(var x = x0; x <= x1; x++) {
            primes.push(new Prime("salt", x, y));
        }
    }

    var hexagonLineColor = "rgb(128, 128, 128)";
    var hexagonBgColor = "rgba(0, 0, 0, 0)";
    var hexagonBgMidColor = "rgba(128, 0, 0, 0.5)";

    var drawHexagon = function(x, y, w) { var h = w * 1.15; return d3.line()
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
        return drawHexagon(primeXProd(d) + scaleProd(20), primeYProd(d) + scaleProd(20), scaleProd(50));
    });
    pbh.exit().remove();
    pbh.enter().append("path")
    .attr("class", "pbh")
    .attr("d", function(d) {
        return drawHexagon(primeXProd(d) + scaleProd(20), primeYProd(d) + scaleProd(20), scaleProd(50));
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
    .attr("xlink:href", function(d) {
        return "img/regions/" + d.type + ".png";
    })
    .attr("width", regionWidth)
    .attr("height", regionHeight)
    .attr("x", regionX)
    .attr("y", regionY)
    .on("click", regionClick);

    // put vials on board
    var svgVials = svg.selectAll(".vil").data(prod.vials);
    svgVials
    .attr("xlink:href", function(d) {
        return "img/prod/v" + (d.isTop ? "t" : "b") + d.count + ".png";
    })
    .attr("width", vialWidth)
    .attr("height", vialHeight)
    .attr("x", vialX)
    .attr("y", vialY)
    .on("click", vialClick);

    svgVials.exit().remove();

    svgVials.enter().append("image")
    .classed("vil", true)
    .attr("xlink:href", function(d) {
        return "img/prod/v" + (d.isTop ? "t" : "b") + d.count + ".png";
    })
    .attr("width", vialWidth)
    .attr("height", vialHeight)
    .attr("x", vialX)
    .attr("y", vialY)
    .on("click", vialClick);

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
    .attr("x", function(d) { return primeXProd(d) - scaleProd(20); })
    .attr("y", function(d) { return primeYProd(d) - scaleProd(20); });

    pipePrimes.exit().remove();

    // since the pipe image is too small... we double its size from 40 to 80
    var enter = pipePrimes.enter().append("image")
    .classed("pipe", true)
    .classed(classNamePrime, true)
    .attr("xlink:href", img)
    .attr("width", scaleProd(80))
    .attr("height", scaleProd(80))
    .attr("x", function(d) { return primeXProd(d) - scaleProd(20); })
    .attr("y", function(d) { return primeYProd(d) - scaleProd(20); });

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
    .attr("width", scaleProd(bondWidth))
    .attr("height", scaleProd(bondHeight));

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
        svg.selectAll(".vil").style("pointer-events", "auto");
    }
    else {
        var svg = d3.select("#production-fore");
        svg.selectAll(".reg").style("pointer-events", "auto");
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

    // refresh the ghost preview in case the mouse is already over the board
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
        prod.regions.push(new Region(d.x, d.y, tool.type));
        updateProductionBoard();
    }
    else if(tool.is == "vial") {
        prod.vials.push(new Vial(d.x, d.y, tool.isTop, tool.count));
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

function vialClick(d, i) {
    if(!gEditMode.production) {
        return;
    }
    gPuzzleObj.productionInfo.vials.splice(i, 1);
    updateProductionBoard();
}

function regionClick(d, i) {
    if(!gEditMode.production) {
        return;
    }
    gPuzzleObj.productionInfo.regions.splice(i, 1);
    updateProductionBoard();
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
// it. production mapping: px' = 40x + 20y, py' = -36y; inverse: y = -py'/36,
// x = px'/40 - y/2 (see renderProductionBackgroundWindow)
function productionHexAtPoint(localX, localY) {
    var px = localX - gProdCameraX;
    var py = localY - gProdCameraY;
    var y = Math.round(-py / 36);
    var x = Math.round(px / 40 - 0.5 * y);
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
        .attr("width", scaleProd(80))
        .attr("height", scaleProd(80))
        .attr("x", function(d0) { return primeXProd(d0) - scaleProd(20); })
        .attr("y", function(d0) { return primeYProd(d0) - scaleProd(20); });
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

window.addEventListener('load', function(evt) {
	'use strict';
	d3.select("#disclaimer").on("click", function() {
		var id = d3.event.target.id;
		if(id == "say-chinese") {
			sayChinese();
		}
		else if(id == "say-english") {
			sayEnglish();
		}
	});
	if(typeof navigator != 'undefined' && navigator.language && navigator.language.toLowerCase().indexOf("zh") == 0) {
		sayChinese();
	}
});

function sayChinese() {
	'use strict';
	d3.select("body").style("font-family", "'\u5FAE\u8F6F\u96C5\u9ED1'");
	d3.select("#puzzle-name-label").html("\u6807\u9898: ");
	d3.select("#steam-id-label").html("Steam ID: ");
	d3.select("#puzzle-id-label").html("\u8c1c\u9898ID: ");
	d3.select("#toolbox-title").html("\u5de5\u5177\u7bb1");
	d3.select("#reagent-title").html("\u539f\u6599");
	d3.select("#output-title-label").html("\u4ea7\u54c1");
	d3.select("#pipe-title").html("\u7ba1\u9053");
	d3.select("#reagent-add").html("\u589e\u52a0");
	d3.select("#output-add").html("\u589e\u52a0");
	d3.select("#pipe-add").html("\u589e\u52a0");
	d3.select("#inst-title").html("\u7269\u4ef6");
	d3.select("#loadfile").html("\u8f7d\u5165");
	d3.select("#savefile").html("\u4fdd\u5b58\u6587\u4ef6");
	d3.select("#title-text").text("Opus\x20Magnum\u81ea\u5236\u5173\u5361\u7f16\u8f91\u5668");
	d3.select("#help-tooltip-research .help-title").html("\u64cd\u4f5c\u63d0\u793a(\u70bc\u91d1\u7814\u7a76)");
	d3.select("#help-tooltip-research ul").html([
		"<li><b>\u5de6\u952e</b> \u653e\u7f6e\u539f\u5b50/\u952e;\u70b9\u51fb\u5df2\u6709\u539f\u5b50\u66f4\u6362\u7c7b\u578b</li>",
		"<li><b>\u53f3\u952e</b> \u53d6\u6d88\u5149\u6807\u4e0b\u7684\u539f\u5b50\u6216\u952e</li>",
		"<li><b>\u4e2d\u952e\u62d6\u52a8</b> \u5e73\u79fb\u68cb\u76d8</li>",
		"<li><b>\u4e2d\u952e\u70b9\u51fb</b> \u8fdb\u5165\u81ea\u52a8\u6eda\u52a8(\u4efb\u610f\u70b9\u51fb / \u6eda\u8f6e / Esc \u9000\u51fa)</li>",
		"<li><b>Ctrl+\u6eda\u8f6e</b> \u7f29\u653e(\u539f\u59cb\u6bd4\u4f8b\u5373\u6700\u5927)</li>",
		"<li><b>\u6eda\u8f6e</b> \u5e73\u79fb;Shift+\u6eda\u8f6e \u6c34\u5e73\u5e73\u79fb</li>",
		"<li><b>F10</b> \u56de\u5230\u539f\u70b9</li>"
	].join(""));
	d3.select("#help-tooltip-production .help-title").html("\u64cd\u4f5c\u63d0\u793a(\u751f\u4ea7\u5f15\u64ce)");
	d3.select("#help-tooltip-production ul").html([
		"<li><b>\u5de6\u952e</b> \u653e\u7f6e/\u53d6\u6d88\u533a\u57df\u4e0e\u74f6;\u70b9\u51fb\u683c\u70b9\u8bbe\u7f6e\u7ba1\u9053 - \u5f62\u72b6\u70b9 / \u8f93\u5165 / \u8f93\u51fa</li>",
		"<li><b>\u5de6\u952e\u70b9\u51fb\u7ba1\u9053\u5f62\u72b6\u5c0f\u5757</b> \u5220\u9664\u8be5\u5757</li>",
		"<li><b>\u5de6\u952e</b> \u518d\u6b21\u70b9\u51fb\u540c\u7c7b\u578b\u533a\u57df/\u74f6\u53ef\u53d6\u6d88</li>",
		"<li><b>\u4e2d\u952e\u62d6\u52a8</b> \u5e73\u79fb\u68cb\u76d8</li>",
		"<li><b>\u4e2d\u952e\u70b9\u51fb</b> \u8fdb\u5165\u81ea\u52a8\u6eda\u52a8(\u4efb\u610f\u70b9\u51fb / \u6eda\u8f6e / Esc \u9000\u51fa)</li>",
		"<li><b>Ctrl+\u6eda\u8f6e</b> \u7f29\u653e(\u539f\u59cb\u6bd4\u4f8b\u5373\u6700\u5927)</li>",
		"<li><b>\u6eda\u8f6e</b> \u5e73\u79fb;Shift+\u6eda\u8f6e \u6c34\u5e73\u5e73\u79fb</li>",
		"<li><b>F10</b> \u56de\u5230\u539f\u70b9</li>"
	].join(""));
	var c = ["\u673a\u68b0\u81c2", "\u591a\u91cd\u81c2", "\u6d3b\u585e\u81c2", "\u8f68\u9053", "\u952e\u5408\u7b26\u6587", "\u6d88\u9664\u7b26\u6587", "\u591a\u91cd\u952e\u5408\u7b26\u6587", "\u4e09\u952e\u7b26\u6587", "\u9499\u5316\u7b26\u6587", "\u590d\u5236\u7b26\u6587", "\u6295\u5c04\u7b26\u6587", "\u7eaf\u5316\u7b26\u6587", "\u6cdb\u7075\u7b26\u6587", "\u56de\u6536\u7b26\u6587", "\u4ee5\u592a\u7b26\u6587", "\u5206\u88c2\u7b26\u6587", "\u8d2c\u65a5\u7b26\u6587", "\u589e\u6b96\u7b26\u6587", "\u6293\u53d6/\u8f6c\u5411\u6307\u4ee4", "\u653e\u4e0b\u6307\u4ee4", "\u8fd8\u539f\u6307\u4ee4", "\u91cd\u590d\u6307\u4ee4", "\u81ea\u8f6c\u6307\u4ee4", "\u8303\u8d1d\u7f57\u4e4b\u8f6e", "\u62c9\u74e6\u91cc\u4e4b\u8f6e"];
	d3.selectAll(".inst-label").html(function(d, i) {
		return c[i];
	});
	d3.select("#tab-research").html("\u539f\u6599\u548c\u4ea7\u54c1");
	d3.select("#tab-production").html("\u751f\u4ea7\u5f15\u64ce");
	d3.select("#reagent-dupe").html("\u590d\u5236");
	d3.select("#output-dupe").html("\u590d\u5236");
	d3.selectAll(".production-label").html(function(d, i) {
		return ["\u751f\u4ea7\u6a21\u5f0f", "\u5de6\u7f29\u77ed", "\u53f3\u7f29\u77ed", "\u5206\u79bb\u539f\u6599\u548c\u4ea7\u54c1"][i];
	});
	d3.select("#disclaimer").html("<p>\u6ce8\u610f\u4e8b\u9879\uff1a</p><p>\u7528\u8fd9\u79cd\u5de5\u5177\u4fee\u6539\u51fa\u6765\u7684\u5173\u5361\u6709\u53ef\u80fd\u4f1a\u5bfc\u81f4\u6e38\u620f\u5d29\u6e83\u3002<br />\u5982\u679c\u6e38\u620f\u5d29\u6e83\u4e86\u7684\u8bdd\uff0c\u628a\u5bfc\u81f4\u5d29\u6e83\u7684\u6587\u4ef6\u66ff\u6362\u6210\u6b63\u5e38\u7684\u6587\u4ef6\uff08\u6bd4\u5982\u9ed8\u8ba4\u7684\u90a3\u4e2a\uff09\u5373\u53ef\u3002</p><p>\u7279\u522b\u662f\u8fd9\u51e0\u79cd\u60c5\u51b5\u7279\u522b\u5bb9\u6613\u5d29\u6e83\uff1a<br />1. \u653e\u4e86\u4e24\u4e2a\u91cd\u590d\u5143\u7d20\u3002<br />2. \u628a\u91cd\u590d\u5143\u7d20\u653e\u5230\u6709\u95ee\u9898\u7684\u5730\u65b9\u3002<br />3. \u4e0d\u5b8c\u5168\u8fde\u63a5\u7684\u5206\u5b50\uff0c\u53ea\u80fd\u653e\u5728\u53f3\u4e0a\u89d260\xb0\u7684\u533a\u57df\uff0c\u4e0d\u7136\u5bb9\u6613\u5d29\u6e83\u3002<br />4. \u4e00\u4e2a\u952e\u4e24\u8fb9\u90fd\u6ca1\u8fde\u539f\u5b50\u3002<br />5. \u8138\u9ed1\u3002</p><p>\u628apuzzle\u6587\u4ef6\u62d6\u8fdb\u5de5\u5177\u7bb1\u53ef\u4ee5\u8f7d\u5165\u6587\u4ef6\u3002</p><p>\u53e6\u5916\uff0c\u6587\u4ef6\u8981\u653e\u5728{\u6587\u6863\\My Games\\Opus Magnum\\[steam ID]\\custom\\}\u4e0b\u9762\u3002<br />\u7279\u522b\u611f\u8c22d3js, jsbn\u9879\u76ee\u548caperture\u7f16\u5199\u7684steam\u6307\u5357\u3002</p><p><a id=\"say-chinese\">\u8bf4\u4e2d\u6587</a> <a id=\"say-english\">English</a></p>");
	d3.select("#say-chinese").style("display", "none");
	d3.select("#say-english").style("display", "inline");
}

function sayEnglish() {
	'use strict';
	d3.select("body").style("font-family", "");
	d3.select("#puzzle-name-label").html("Puzzle Name: ");
	d3.select("#steam-id-label").html("Steam ID: ");
	d3.select("#puzzle-id-label").html("Puzzle ID: ");
	d3.select("#toolbox-title").html("TOOLBOX");
	d3.select("#reagent-title").html("REAGENTS");
	d3.select("#output-title-label").html("OUTPUTS");
	d3.select("#pipe-title").html("PIPES");
	d3.select("#reagent-add").html("add");
	d3.select("#output-add").html("add");
	d3.select("#pipe-add").html("add");
	d3.select("#inst-title").html("ITEMS");
	d3.select("#loadfile").html("Load");
	d3.select("#savefile").html("Save Puzzle File");
	d3.select("#title-text").text("Opus Magnum Puzzle Editor");
	d3.select("#help-tooltip-research .help-title").html("Controls (Molecular Research)");
	d3.select("#help-tooltip-research ul").html([
		"<li><b>Left-click</b> Place atoms/bonds; click an existing atom to change its type</li>",
		"<li><b>Right-click</b> Cancel the atom or bond under the cursor</li>",
		"<li><b>Middle-drag</b> Pan the board</li>",
		"<li><b>Middle-click</b> Auto-scroll (any click / wheel / Esc exits)</li>",
		"<li><b>Ctrl+wheel</b> Zoom (original scale is the maximum)</li>",
		"<li><b>Wheel</b> Pan; Shift+wheel pans sideways</li>",
		"<li><b>F10</b> Recenter on the origin</li>"
	].join(""));
	d3.select("#help-tooltip-production .help-title").html("Controls (Production Engine)");
	d3.select("#help-tooltip-production ul").html([
		"<li><b>Left-click</b> Place or cancel regions and vials; click cells to shape a pipe - offsets / input / output</li>",
		"<li><b>Left-click a pipe shape block</b> Delete that block</li>",
		"<li><b>Left-click</b> the same region/vial again cancels it</li>",
		"<li><b>Middle-drag</b> Pan the board</li>",
		"<li><b>Middle-click</b> Auto-scroll (any click / wheel / Esc exits)</li>",
		"<li><b>Ctrl+wheel</b> Zoom (original scale is the maximum)</li>",
		"<li><b>Wheel</b> Pan; Shift+wheel pans sideways</li>",
		"<li><b>F10</b> Recenter on the origin</li>"
	].join(""));
	d3.selectAll(".inst-label").html(function(d) {
		return d;
	});
	d3.select("#tab-research").html("Research");
	d3.select("#tab-production").html("Production");
	d3.select("#reagent-dupe").html("dupe");
	d3.select("#output-dupe").html("dupe");
	d3.selectAll(".production-label").html(function(d, i) {
		return ["Production Mode", "Shrink Left", "Shrink Right", "Isolation"][i];
	});
	d3.select("#disclaimer").html("<p>Important Notes:</p><p>Do note that malformed puzzles created with this tool may <span class=\"disred\">crash the game</span>.<br />When this happens, you should replace the puzzle causing crash with a normal one (i.e. default).</p><p>Crash especially happens (not always) when: <br />- Using 2+ repeat symbols.<br />- Putting a repeat symbol somewhere the game didn't allow.<br />- Having unbonded atoms outside of the top-right 60 degree sector.<br />- Bonds unattached to any atom.</p><p>Drop puzzle file into toolbox to import.</p><p>Also, custom puzzle files are located in My Documents\\My Games\\Opus Magnum\\[steam ID]\\custom\\.<br />Credits to d3js, jsbn and Aperture's steam guide.</p><p><a id=\"say-chinese\">\u8bf4\u4e2d\u6587</a> <a id=\"say-english\">English</a></p>");
	d3.select("#say-chinese").style("display", "");
	d3.select("#say-english").style("display", "none");
}

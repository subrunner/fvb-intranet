/**
 * IBM Connections Engagement Center - {custom}.js
 * @copyright Copyright IBM Corp. 2017, 2018 All Rights Reserved
 */
(function () {
	"use strict";
	XCC.X = XCC.X || {};
	XCC.X.init = () => {
		var tempModuleObject = {},
			customPath = "/xcc/rest/public/custom/";

		// initialize CustomWidgets, if they are defined
		$.each(XCC.X.customWidgets || [], function (i, widgetName) {
			try {
				XCC.X[widgetName]();
			} catch (e){
				// eslint-disable-line
				console.log("Cannot initialize widget " + widgetName + "!");
				// eslint-disable-line
				console.error(e);
			}
		});

		// calculate path of customModules. Here we need to follow a name convention: All replaced Modules have the name "CUSTOM-<Originalname>"
		$.each(XCC.X.replacedModules || [], function (i, val) {
			var originalName = (XCC.requirejs.s.contexts._.config.paths[val] || "").split("/").pop(),
				newName = `CUSTOM-${originalName}.js`;

			tempModuleObject[val] = XCC.T.replaceUrlParameter((XCC.S.anon ? "/xcc/rest/proxy" : "") + customPath + newName, "token", XCC.S.csrftoken);
		});
		// now we replace the original paths with our new Custom-paths
		$.extend(XCC.requirejs.s.contexts._.config.paths, tempModuleObject);


		function waitUntilExists(selector, callback){
			var counter=0,
				el, i=setInterval(function(){
					el=$(selector);
					if (el.length){
						callback(el);
						clearInterval(i);
					}
					if (counter===10000){
						clearInterval(i);
					}
					counter+=300;
				}, 300);
		}



		//newsOverview Widget Customizing
		waitUntilExists("div.xccWidget[data-wtype=xccNewsOverview] .newsOverviewContainer img", (el)=>{
			el.each(function(){
				var element = $(this);

				element.load(function() {
					if (element.height()<=element.width()){
						element.parent().css({
							"float": "none"
						});
					}
					else {
						element.parent().css({
							"height": "100%",
							"max-height": "300px",
							"width": "45%",
							"float": "left"
						});

						element.parent().next().css({
							"width": "50%",
							"padding-left": "15px"

						});
					}
				});
			});
		});
	};
}());
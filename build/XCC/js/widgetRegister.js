/**
 * Please enter your widgetNames into the Array. It will be directly initialized by the XCC.X.init function.
 * author: CLU
 */
(function () {
	XCC.X = XCC.X || {};
	/**
	 * The strings in the replacedModules Array have to be the same as found in XCC.requirejs.s.contexts._.config.paths
	 * e.g. XCC.X.replacedModules = ["communityOverview"] will replace the communityOverview module
	 **/
	XCC.X.replacedModules = ["navigationWidget", "peopleBirthday", "ASWidget"];

	XCC.X.customWidgets = ["_myID_"];
})();
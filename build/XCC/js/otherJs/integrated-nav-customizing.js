/* *
*
* Custom Navigation: Use Connections wiki as navigation in CNX header
*
* */

"use strict";


function loadCSS(url) {
	var head = document.getElementsByTagName("head")[0],
		link = document.createElement("link");
	link.rel = "stylesheet";
	link.type = "text/css";
	link.href = url;
	head.appendChild(link);
}

function loadScript(src, callback) {
	var s,
		r,
		t;
	r = false;
	s = document.createElement('script');
	s.type = 'text/javascript';
	s.src = src;
	s.onload = s.onreadystatechange = function () {
		//log.log( this.readyState ); //uncomment this line to see which ready states are called.
		if (!r && (!this.readyState || this.readyState === 'complete')) {
			r = true;
			callback();
		}
	};
	t = document.getElementsByTagName('script')[0];
	t.parentNode.insertBefore(s, t);
}

(function () {
	// Actual definition of the values in integrated-nav-customizing_DEF.js
	var NAV,
		additionalListItems = [],
		selectedClassName="lotusSelected",
		log = console;

	loadScript("/xcc/rest/public/custom/integrated-nav-customizing_DEF.js", function(){



		// anon page check must take place at the very beginning
		var isAnonXccPage = typeof (XCC) !== 'undefined' && XCC.S.anon,
			div,
			language,
			wikiId,
			wikiUrl;
		NAV = window.NAV;

		/**
		* @param json 2: returns complete text return; true: returns parsed JSON; false: returns XML
		*/
		function doGet(url, json, callback, async) {
			var request = new XMLHttpRequest();
			//JSON Parameter: Bei true gibt die Funktion JSON zurück, bei false XML
			async = async !== false ? true : false;

			try {
				request.open('GET', url, async);
				request.onload = function () {
					if (request.status >= 200 && request.status < 300) {
						if (json ===2)
						{return callback(this.response);}
						return json
							? callback(JSON.parse(this.response))
							: callback(this.responseXML);
					}
					return "ERROR: request status is " + request.status;
				};
				request.onerror = function () {
					alert("Could not retrieve " + url);
				};
				request.send();
			} catch (e){
				log.error(e);
			}
		}




		/**
		*
		* Makes sure that window.currentLogin.language has a valid value...
		* Value is the international language ID (en, de, etc.)
		*/
		function loadLanguage(){
			var lang = null,
				profileExtensionUrl;

			// 1.) Check if we haven't already loaded it...
			if (!window.currentLogin){
				window.currentLogin={
					extid: document.getElementById("userExtIdDiv").getAttribute("value")
				};
			}
			if (window.currentLogin.language)
			{return;}



			// 2.) Not an anon-page: load from the profile field extension
			if (!isAnonXccPage){
				profileExtensionUrl = "//" + window.location.host + "/profiles/atom/profileExtension.do?userid=" + window.currentLogin.extid
				+ "&extensionId=" + NAV.PROFILE_EXTENSION_ID_LANGUAGE;
				//log.log("Load profile extension",profileExtensionUrl);

				// force to load synchronized so that we are sure we've got our language set
				doGet(profileExtensionUrl, 2, function(response){
					//log.log("Profile extension url returned " , response);
					lang = response;
				}, false);
			}

			// 3.) Make sure that we actually have loaded a language...
			if (!lang){

				// nothing defined: try the browser language
				lang = navigator.language || navigator.userLanguage;
			}

			// 5.) Actually set the language
			window.currentLogin.language = lang;

		}

		/**
		* Makes sure the HTML page is prepared so that we can continue with our things as if it were a regular CNX / XCC page
		* despite the user not being logged in
		*/
		function initializeForAnonXccPage(){
			var xccNavDiv = document.createElement('div'),
				target = document.getElementById('lotusFrame'),
				mbLogo = document.createElement('div'),
				cnxLink = document.createElement('a'),
				cnxLogo = document.createElement('div');
			xccNavDiv.id = NAV.NAVIGATION_ELEMENT_ID;
			xccNavDiv.className = 'anonNav';

			mbLogo.className = 'lotusBranding';
			xccNavDiv.parentNode.insertBefore(mbLogo, xccNavDiv.nextSibling);

			cnxLink.href = '/xcc/main';
			cnxLogo.classList.add('lotusLogo');

			cnxLink.appendChild(cnxLogo);
			xccNavDiv.appendChild(cnxLink);
			//xccNavDiv.parentNode.insertBefore(cnxLink, xccNavDiv);

			// insert into DOM here to minimalize DOM-changes
			target.insertBefore(xccNavDiv, target.firstChild);

		}

		/**
		* Creates navigation from the wiki-feed
		*
		* @param parent {JSON} current wiki page tree JSON - current node for which to create
		* @param wikiData {JSON} complete wiki tree
		*/
		function createNav(parent, wikiData, level) {
			//Erstellt Navigation aus dem Wikifeed
			var htmlParent = document.createElement('li'),
				a = document.createElement('a'),
				arrowIcon = document.createElement('i'),
				htmlChilds,
				el,
				child,
				childNavigation,
				foundDisplayableChildren;

			// Do not display pages (page-trees) that begin with '#-'
			if (parent.label.indexOf("#-") === 0)
			{return;}
			//log.log("CreateNav - parent: ", parent.label);

			a.innerHTML = level==1?parent.label + "<span id='" + parent.id + "'>" + parent.label + "</span>":parent.label;
			a.id = parent.id;
			a.name = parent.label;
			a.onclick = function (event) {
				retrieveUrl(event.target.id, event);
			};

			if (level === 1) {
				htmlParent.onmouseover = function (e) {
					e.currentTarget.querySelector('a').classList.add('highlightNav');
				};
				htmlParent.onmouseleave = function (e) {
					e.currentTarget.querySelector('a').classList.remove('highlightNav');
				};
			}

			arrowIcon.classList.add('fa');
			arrowIcon.classList.add('fa-chevron-right');
			arrowIcon.classList.add('hasDropdown');


			htmlParent.appendChild(a);

			if (parent.childSize > 0) {
				htmlChilds = document.createElement('ul');
				htmlChilds.setAttribute('class', 'navLevel-' + level);
				foundDisplayableChildren = false;
				parent.children.forEach(function (childEl){
					el = childEl._reference,
					child = wikiData.items.filter(function (obj) {
						return obj.id == el;
					});
					childNavigation = createNav(child[0], wikiData, level + 1);
					if (childNavigation){
						htmlChilds.appendChild(childNavigation);
						foundDisplayableChildren = true;
					}
				});
				/*for (i = 0; i < parent.children.length; i=i+1) {
					el = parent.children[i]._reference,
					child = wikiData.items.filter(function (obj) {
						return obj.id == el;
					});
					childNavigation = createNav(child[0], wikiData, level + 1);
					if (childNavigation){
						htmlChilds.appendChild(childNavigation);
						foundDisplayableChildren = true;
					}
				}*/
				if (foundDisplayableChildren) {
					htmlParent.appendChild(htmlChilds);
					if (level > 1) {
						a.appendChild(arrowIcon);
					}
				}
			}
			return htmlParent;
		} // END createNav

		/**
		* Reads the wikipage and tries to read the content for a target link - it is a navigation item, after all
		*
		* @param wikiPageId {String} ID of the wiki page for which to retrieve the content
		* @param  event {JS Event} Event for which to set the target URL
		*/
		function retrieveUrl(wikiPageId, event) {
			//log.log("retrieveUrl enterint " ,wikiPageId, event);
			//retrieves url from wiki page's body and adds it on mouseover
			var url =
				'//' +
				window.location.host +
				'/wikis/basic/api/wiki/' +
				wikiId +
				'/page/' +
				wikiPageId +
				'/entry';
			doGet(
				url,
				false,
				function (xml) {
					var content = xml.getElementsByTagName('summary')[0].textContent;

					// replace all XCC page links
					if (content.indexOf('xcc://') >= 0) {
						content = content.replace(
							'xcc://',
							'//' + window.location.host + '/xcc/main?page='
						);

					}
					if (content.length > 0) {
						event.target.href=content;
						if (event.currentTarget)
						{event.currentTarget.href = content;}
						//log.log("Link to ",content);
					}
				},
				false
			);
			return true;
		} // END retrieveUrl

		/**
		* Searches the generated navigation menu items to highlight the selected XCC page
		* happens whenever the navigation menu item has the same [name] attribute as the pageTitle

		* assigns the 'currentPage' class if such a menu item is found
		*
		* @param pageTitle {String} Title of the XCC page
		*/
		function findNavEntry(pageTitle) {
			var mbNavigationContainer = document.getElementById(NAV.NAVIGATION_ELEMENT_ID),
				mbNavigationTopLevel = mbNavigationContainer.querySelectorAll('.navLevel-0 > li'),
				i,
				selectedMenuItem;

			for (i = 0; i < mbNavigationTopLevel.length; i += 1) {
				selectedMenuItem = mbNavigationTopLevel[i].querySelector("[name='" + pageTitle + "']");
				if (selectedMenuItem) {
					mbNavigationTopLevel[i].querySelector("a").classList.add("currentPage");
					return;
				}
			}


		} // END findNavEntry

		/**
		* Takes care of highlighting (=assigning 'currentPage' style) for navigation
		*/
		function highlightNav() {
			var pageTitle,
				pageID,
				helpLinkNode;

			if (window.location.href.indexOf('xcc') >= 0) {
				pageTitle = XCC.S.container.title;
				pageID = XCC.S.page;
				helpLinkNode = document.getElementById('headerHelpHref');

				if (pageID.split('-')[0] === 'start') {
					document.getElementById('lotusLogo').className += ' currentPage';
				}
				else if (helpLinkNode.href.indexOf(pageID) == helpLinkNode.href.length - pageID.length){
					// the currently highlighted page is the help page
					helpLinkNode.classList.add("currentPage");
				} else {
					findNavEntry(pageTitle);
				}
			}
		} // END highlightNav




		/*START OLD*/

		// take care of configuring things for anonymous XCC pages...
		if (isAnonXccPage) {
			initializeForAnonXccPage();
		}

		div = document.getElementById(NAV.NAVIGATION_ELEMENT_ID); //Stelle an dem die Navigation angehängt wird

		/*
		* 1.) Create navigation wiki URL based on language

		*/

		loadLanguage();
		language = window.currentLogin.language;
		wikiId = NAV.WIKI_ID[language];
		if (!wikiId){
			//log.log("No wiki defined for language " + language);
			wikiId = NAV.WIKI_ID[NAV.DEFAULT_LANGUAGE];
		}
		wikiUrl =
				'//' +
				window.location.host +
				'/wikis/basic/api/wiki/' +
				wikiId +
				'/nav/feed';



		/*
		* 2.)	load our hard-coded wiki and generate navigation
		*/
		doGet(wikiUrl, true, function (wikiData) {
			var tree = wikiData.items.filter(function (obj) {
					return obj.id === 'tree'; //JSON mit allen (Unter)seiten
				}),
				nav = createNav(tree[0], wikiData, 0),
				navUl = nav.querySelector('ul'),
				infoIcon,
				helpWikiLi = navUl.lastElementChild,
				helpWikiHref = helpWikiLi.firstChild,
				helpHref = document.getElementById("headerHelpHref"),
				helpEvent = {};
			navUl.classList.add('lotusInlinelist');
			navUl.classList.add('lotusLinks');
			div.insertBefore(
				navUl,
				document.getElementById('infoLink')
			);
			if (isAnonXccPage) {
				infoIcon = document.createElement('div');
				infoIcon.id = 'infoIcon';
				infoIcon.classList.add('infoIcon');
				div.appendChild(infoIcon);
			}

			// the last top-level page of the wiki is the help page.
			// put the content of the help page to the help icon instead.

			helpWikiLi.style.display="none";
			helpEvent.target=helpHref;
			retrieveUrl(helpWikiHref.id, helpEvent);




		});
		log.log("After doGet wiki page");

		/*
		* 3.) Once navigation has loaded completely, take care of highlighting our navigation
		*/
		document.onreadystatechange = function () {
			if (document.readyState === 'complete') {
				highlightNav();
				// don't make footer sticky because some views e.g. "Edit Community" build the page after everything has happened...
				//stickyFooter(); // also make the footer sticky now, because in XCC pages it takes a while for everything to be generated...
			}

		};
		log.log("document onreadystate change");



		/*
		* 4.) Load additional CSS / scripts
		*/
		// hide the connectionsmal etc. buttons (can't do in header.jsp because reasons...)
		//document.getElementById("lotusBannerMail").style.display="none";
		//document.getElementById("lotusBannerCalendar").style.display="none";

		//Start here
		loadCSS("https://" + window.location.host + "/xcc/rest/public/custom/ConnectionsIntegratedHeader.css");



		log.log("after loadCss");


	});

	// highlights the menu item by adding the selectedClassName to the LI
	function highlightIfNecessary(id){
		var el = document.getElementById(id),
			a = el.firstElementChild;

		//log.log("Element, a", el, a);
		// we need to highlight if the href of the link is the URL
		if (a && (
			window.location.href== a.href ||
			window.location.href == (window.location.origin + a.href))){
			log.log("Set selected",id);
			el.className = selectedClassName;
		}
	}

	try {
		//log.log("Highlights:");
		additionalListItems.forEach(highlightIfNecessary);

		//log.log("Done with highlights.");
	} catch (e){
		log.log("Error - could not highlight menu items",e);
	}
})();
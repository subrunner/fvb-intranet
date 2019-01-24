/**!
 * ActivityStreamWidget.js - IBM Connections Engagement Center (ICEC)
 *
 * Shows the ActivityStream within a Widget.
 *
 * @author Sirius Schmidt (SSD)
 * @depends jQuery, lightbox, moment
 *
 * Changes: - CNO: Fix translation also translates saved Value in WidgetData
 *          - ESD-25: Adjust scrolling height to margins
 *
 *****************************************************************************/
/*jslint devel:true, browser:true*/
/*global window, jQuery, moment*/
(function(W, $) {
	"use strict";

	var X = (function() {
			W.XCC = W.XCC || {};
			return W.XCC; // get or create and expose the XCC Object
		}()),
		localizeString = X.L.get,
		FIXED_HEIGHT = 300;

	// START createActivityStreamWidget
	/**
	 * [createActivityStreamWidget function that ist called at the beginning. Contains the widget container and xcc widgetdata.]
	 * @param  {jqueryObject} container$ [The jQuery Container]
	 * @param  {object} widgetData [xcc WidgetData]
	 * @return {function}            [the whole widget as a big function]
	 */

	function createActivityStreamWidget(container$, widgetData) {

		var ASFilters = createASFilters(), // ASFilters.FILTER is used to specify a URL
			ActivityStreamType = createActivityStreamLoadingType(), // ActivityStreamType Object (Community or Normal, for instance ActivityStreamType. NormalActivityStream
			currentActivityStreamType = "", //The current ActivityStreamType (depends on the "Community" checkbox in the Widget Editor)
			dataArray = [], // Here the data objects (feeds) are stored
			currentDataArray = [], // The current data array with feed objects. this variable is only used to find out whether the "Show more" button should be displayed
			lastloadedDataArray = [], // The lastloaded data array with feed objects. description see currentDataArray. They get compared to decide whether the show more button should be displayed
			jContainer = container$ || {}, // The general Widget Container for all DOM Elements
			ownProfile, // The currently logged in profile (loaded with XCC.P.getProfile)
			lastLoadedFeedType, // This variable is to faciliate the refresh, because we need to know which feedtype has been loaded
			lastLoadedStreamURLPart, // This variable is to faciliate the refresh as well, we need the last stream url part to make a querying possible
			shareTextBox$, // JQuery Object of the share input field
			shareArea$, // JQuery Object of the share input field
			alertMainDiv$, // JQuery Object of the main div to display alerts within
			naviWrappedDiv$, // JQuery Object of the naviWrappedDiv, this div is a wrapper div for share textbox expand effect (done with JQuery animate)
			loading$ = null, // JQuery Object of the loading icon (if feeds are loading)
			fileToUploadFromDialog, // JQuery Fileupload Object
			fileToUploadFromDialogCallback, // JQuery Fileupload Callback Helper
			doRequest, // Function definition for the doRequest function (some ajax requests are done here)
			postStatus, // Function definition postStatus method (new posts are created there)
			refreshResults, // Function definition for the refreshResults method
			toggleSaveEvent, // Function defition for the save functionality for a single feed
			scrollToBottom, // Function to check if scroll to bottom should be done
			forcedRedraw = false,
			mentions = {},
			loadSpecificFeed, // Function definition for the loadSpecificFeed method. This method is called if you click on a navigation item and loads the specific feeds
			registerEvents, // Function definition for the registerEvents method. Here are registered the Widget events , except the item Events
			currentAccess = {
				widgetCommunityUuid: undefined, // The community UUID (if defined) of the Widget Editor.
				isMember: false, // is the currently logged in user member of this community?
				communityRestrictionString: '', // if a community has been selected and is used, the access will be saved here as string (for instance publicInviteOnly)
				canSendJoinRequest: false,
				noSearch: false
			},
			lastItemDataRefId = 0,
			savedSettings = {
				title: '',
				communityUuid: '',
				url: '',
				hasCommunity: false,
				useCommunity: false,
				defaultNaviPoint: "",
				alreadyLoaded: false,
				showJoinComBtn: false,
				showShareBox: false,
				showNavigation: false,
				useDefaultStyle: false
			},
			searchModeActivated = {
				state: false,
				query: "",
				timeStamp: 0
			},
			showMoreMode = false,
			isCommunityMode = function() {
				return (currentActivityStreamType === ActivityStreamType.CommunityActivityStream) && currentAccess.widgetCommunityUuid && savedSettings.useCommunity;
			},
			objectTypeConf = { // Information for different object types taken from feedobject.object.objectType
				repostable: ["link", "note"],
				followable: ["task-list"],
				showable: {
					blog: true,
					wiki: true,
					file: false
				},
				isRepostAble: "",
				isFollowAble: ""
			},
			titleError = localizeString('ASWidget-notificationTitle_error', 'Error'),
			createAlert = X.U.createBootstrapAlert;
		/**Because we have to distinguish between different functions (for community and normal Activitystream), a helper function isCommunityMode() is needed.
		 * For instance the URI's are different on cloud and on premise.
		 */


		// START createASFilters
		/**
		 * [createASFilters Filters to concatenate several URI's later on]
		 * @return {string} [the concatenated URI]
		 */
		function createASFilters() { //
			var basePartUrl = '/activitystreams/',
				communitybasePartUrl = '/activitystreams/urn:lsid:lconn.ibm.com:communities.community:$COMID';

			return {
				MyActivityStream: basePartUrl + "@me/@all",
				BlogsFilter: basePartUrl + "@me/@all/blogs",
				ActivitesFilter: basePartUrl + "@me/@all/activities",
				FilesFilter: basePartUrl + "@me/@all/files",
				ForumsFilter: basePartUrl + "@me/@all/forums",
				WikisFilter: basePartUrl + "@me/@all/wikis",
				ProfilesFilter: basePartUrl + "@me/@all/@people",
				StatusUpdatesFilter: basePartUrl + "@me/@all/@status",
				TagFilter: basePartUrl + "@me/@all/@tags",
				CommunitiesFilter: basePartUrl + "@me/@all/@communities",
				BookMarksFilter: basePartUrl + "@me/@all/bookmarks",
				ThirdPartyAppFilter: basePartUrl + "@me/@all/[generatorid]",
				SingleEventDetailFilter: basePartUrl + "@me/@all/[eventID]",
				ObjectHistoryFilter: basePartUrl + "@me/@all/blogs?filterBy=object&filterOp=equals&filterValue=[blogid]",
				AllForMe: basePartUrl + "@me/@all/@all/",
				Discover: basePartUrl + "@public/@all/@all",


				StatusUpdatesAll: basePartUrl + '@me/@all/@status',
				StatusUpdatesMyNetWorkAndPeopleIFollow: basePartUrl + '@me/@following&@friends/@status',
				StatusUpdatesMyNetwork: basePartUrl + '@me/@friends/@status',
				StatusUpdatesPeopleIFollow: basePartUrl + '@me/@following/@status',
				StatusUpdatesMyUpdates: basePartUrl + '@me/@self/@status',
				StatusUpdatesCommunities: basePartUrl + '@me/@all/communities',

				CommunityStreamAll: communitybasePartUrl + "/@all",
				CommunityStreamStatusUpdates: communitybasePartUrl + "/@all/@status",
				CommunityStreamActivites: communitybasePartUrl + "/@all/activities",
				CommunityStreamBlogs: communitybasePartUrl + "/@all/blogs",
				CommunityStreamFiles: communitybasePartUrl + "/@all/files",
				CommunityStreamForums: communitybasePartUrl + "/@all/forums",
				CommunityStreamWikis: communitybasePartUrl + "/@all/wikis",
				CommunityStreamPeople: communitybasePartUrl + "/@all/@people",
				CommunityStreamStatus: communitybasePartUrl + "/@all/@status",
				CommunityStreamTags: communitybasePartUrl + "/@all/@tags",
				CommunityStreamCommunities: communitybasePartUrl + "/@all/@communities",
				CommunityStreamBookmarks: communitybasePartUrl + "/@all/bookmarks"
			};
		}


		// END createASFilters


		// START createActivityStreamLoadingType
		/**
		 * [createActivityStreamLoadingType There are two modes, community specific and normal activitystream.]
		 * @return {[object]} [The object is instantiated as "ASFilters" and can be accessed by using point notation, for instance ASFilters.NormalActivityStream]
		 */
		function createActivityStreamLoadingType() {
			return {
				NormalActivityStream: "Normal",
				CommunityActivityStream: "CommunityAS"
			};
		}


		// END createActivityStreamLoadingType


		// START getWindowLocation
		function getWindowLocation() {
			if (!W.location.origin) {
				W.location.origin = W.location.protocol + "//" + W.location.hostname + (W.location.port ? ':' + W.location.port : '');
			}
			return W.location.origin;
		}


		// END getWindowLocation

		// START assertChain
		/**
		 * assert path exists as subobject chain within obj
		 *
		 * @param value {object} the object to search for <code>path</code> in
		 * @param path {String} the path to search within <code>obj</code>. oatgh must not start wirth the object itself.
		 * @return {boolean} whether <code>path</code> exists within <code>obj</code> or not
		 * example: to check if the windows document body has a fist item element you would use
		 * if (assertChain(window, "document.body.firstChild")) {}
		 * instead of
		 * if (window && window.document && window.document.body && window.document.body.firstChild) {}
		 */
		function assertChain(value, path) {
			$.each(path.split('.'), function(ignore, key) {
				value = value && value[key];
			});
			return !!value;
		}


		// END assertChain

		// START formatDate
		function formatDate(d) {
			var t = new Date(), // now
				format = localizeString("ASWidget_date_other", "MMM DD");
			if (d.getYear() === t.getYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate()) { // today
				format = localizeString("ASWidget_date_today", "[Today at] h:mm a");
			} else if (d.getTime() > (t.getTime() - (1000 * 60 * 60 * 24 * 7))) {
				format = localizeString("ASWidget_date_last7days", "dddd [at] h:mm a");
			}
			return moment(d).format(format);
		}


		// END formatDate


		// START replaceIt
		function replaceIt(stringA, toReplace, replaceMent) {
			return stringA.split(toReplace).join(replaceMent || "");
		}


		// END replaceIt


		// START endsWith
		function endsWith(stringA, extension) {
			return -1 !== stringA.indexOf(extension, stringA.length - extension.length);
		}


		// END endsWith


		// START startsWith
		function startsWith(stringA, stringB, position) {
			position = position || 0;
			return stringA.indexOf(stringB, position) === position;
		}


		// END startsWith

		// START uniq
		function uniq(a, param) {
			return a.filter(function(item, pos, array) {
				return array.map(function(mapItem) {
					return mapItem[param];
				}).indexOf(item[param]) === pos;
			});
		}


		// END uniq



		objectTypeConf.isRepostAble = function(a) {
			return (-1 !== objectTypeConf.repostable.indexOf(a));
		};

		objectTypeConf.isFollowAble = function(a) {
			return (-1 === objectTypeConf.followable.indexOf(a));
		};

		objectTypeConf.isCommentable = function(a) {
			return (assertChain(a, "target.objectType") && ("note" === a.target.objectType)) || (assertChain(a, "object.objectType") && ("note" === a.object.objectType));
		};



		// START deleteEvents
		/*function deleteEvents(arrayeventIDs) { // NOT implemented yet. Next Version maybe.
			    var targetURL = X.T.getRootPath("WidgetsContainer", false) + ASFilters.AllForMe + arrayeventIDs.join();

			    $.ajax({
			        url: targetURL,
			        headers: {*/
		// Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
		/* },
			        method: "DELETE",
			        contentType: "application/json; charset=UTF-8"
			    }).done(function() {
			        console.log("done");
			    }).fail(function() {
			        console.log("error deleting");
			    });
			}*/

		// END deleteEvents


		// START getLoading$
		/**
		 * [getLoading$ Asserts a loading element exists and returns the loading element as a jquery object]
		 * @return {[jQuery Object]} [The jQuery Object of X.U.createLoadingIcon() (the loading div)]
		 */
		function getLoading$() {
			if (!loading$) { // loading is defined at beginning of scope
				loading$ = savedSettings.useDefaultStyle ? $(X.U.createLoadingIcon()) : $('<div/>').addClass('oM-spinnerWrapper').append($('<i/>').addClass('fa fa-circle-o-notch fa-spin oM-spinner'));
			}
			return loading$;
		}


		// END getLoading$


		// START showVisualLoading
		/**
		 * [showVisualLoading Shows an icon when the Widget is loading or another navigation point is clicked , rather to say another feedtype is loading.]
		 */
		function showVisualLoading(show) {
			var toAppend$,
				showMoreBtn$ = jContainer.find('.ASWidget-Stream-ShowMoreBtn');
			getLoading$().remove();
			if (show) {
				if (showMoreBtn$.length) {
					showMoreBtn$.parents('.ASWidget-Stream-Showmore').after(getLoading$());
				} else {
					jContainer.parents(".wbody").append(getLoading$());
				}
				toAppend$ = $('<li/>').addClass('ASWidgetLoadingLi')
					.append($('<div/>')
						.addClass('activityStreamLoadingContainer ActivityStreamWidgetPost ASWidgetLoadingPost')
						.append(getLoading$()));
				jContainer.find(".streamItems").prepend(toAppend$);
			}
		}


		// END showVisualLoading


		// START extractID
		/**
		 * [extractID Extracts an ID to a UUID]
		 * @param  {[string]} inputID [The ID to extract a UUID of]
		 * @return {[string]}         [The parsed UUID]
		 */
		function extractID(InputID) {
			var uUid = X.T.extractUUID(InputID),
				data = [];
			if ((undefined === uUid) && InputID && (-1 !== InputID.indexOf(":"))) {
				data = InputID.split(":");
				uUid = data[data.length - 1];
			}
			return uUid;
		}


		// END extractID


		// START getspecifiedURL
		/**
		 * [getspecifiedURL Because sbt on cloud and on premise is different, one has to concatenate several URIs manually,
		 * example: getspecifiedURL("NONPARSEDUSERID", "picture")  to retrieve the profile picture URI of a user.]
		 * @param  {[string]} actorID [the unparsed actorID]
		 * @param  {[string]} type    [the type ("picture" or "profile")]
		 * @return {[string]}         [the parsed URL for the profile or picture.]
		 */
		function getspecifiedURL(actorID, type) {
			var parsedID = extractID(actorID),
				specifiedURL = "";
			switch (type) {
				case "picture":
					specifiedURL = (X.S.cloud ? X.S.endPoint + '/contacts/profiles/photo/' + parsedID : getWindowLocation() + '/profiles/photo.do?userid=' + parsedID);
					break;
				default:
					specifiedURL = (X.S.cloud ? X.S.endPoint + '/profiles/html/profileView.do?userid=' + parsedID : getWindowLocation() + '/profiles/html/profileView.do?userid=' + parsedID);
			}
			return specifiedURL;
		}


		// END getspecifiedURL


		// START getAttachmentType
		/**
		 * [getAttachmentType This function is to find out, which media type a feed has in specific cases. The function is used
		 to generate an image or video tag later on, depends on the media type.]
		 * @param  {[object|string]} obj         [A media URI or a json activitystream feed by SBT]
		 * @param  {[boolean]} checknormal [A boolean whether an object or a simple string is given as parameter.]
		 * @return {[object|string]}             [An object or a string can be returned. Depends on the boolean checknormal]
		 */
		function getAttachmentType(obj, checknormal) {

			var extensionA,
				returnObj = {
					type: "",
					extension: ""
				},
				videoFormats = [".mp4", ".webm", ".mkv", ".flv", ".vob", ".ogv", ".ogg", ".drc", ".gif", ".gifv",
					".mng", ".avi", ".mov", ".qt", ".wmv", ".yuv", ".rm", ".rmvb", ".asf", ".amv",
					".m4p", ".m4v", ".mpg", ".mp2", ".mpeg", ".mpe", ".mpv", ".m2v", ".m4v", ".svi", ".3gp", ".3g2", ".mxf",
					".roq", ".nsv", ".flv", ".f4v", ".f4p", ".f4a", ".f4b"
				],
				imageFormats = [".png", ".jpg", ".png", ".jpeg", ".tiff", ".gif", ".ico", ".bmp", ".ani", ".anim", ".apng", ".art", ".bpg", ".bsave", ".cal",
					".cin", ".cpc", ".cpt", ".dds", ".dpx", ".ecw", ".exr", ".fits", ".flic", ".flif", ".fpx", ".hdri", ".hevc", ".icer", ".icns", ".ico", ".cur", ".ics", ".ilbm", ".jbig", ".jbig2", ".jng", ".2000", ".jpeg-ls", ".xr", ".kra", ".mng", ".miff", ".nrrd", ".ora",
					".pam", ".pbm", ".pgm", ".ppm", ".pnm", ".pcx", ".pgf", ".pictor", ".psd", ".psb", ".psp", ".qtvr", ".ras", ".rbe", ".jpeg-hdr", ".logluv", ".tiff", ".sgi",
					".tga", "ep", ".tiff", ".it", ".ufo", ".ufp", ".wbmp", ".webp", ".xbm", ".xcf", ".xpm", ".xwd"
				],
				documentFormats = [".pdf", ".doc", ".dot", ".wbk", ".docx", ".docm", ".dotx", ".dotm", ".docb",
					".xls", ".xlt", ".xlm", ".xlsx", ".xlsm", ".xltx", ".xltm", ".xlsb", ".xla", ".xlam", ".xll", ".xlw",
					".ppt", ".pot", ".pps", ".pptx", ".pptm", ".potx", ".potm", ".ppam", ".ppsx", ".ppsm", ".sldx", ".sldm"
				],
				toCheck = {
					image: {
						url: ""
					},
					url: ""
				};

			if ((checknormal) && (assertChain(obj, "image.url") || assertChain(obj, "url"))) {
				toCheck.image.url = assertChain(obj, "image.url") ? obj.image.url : "";
				toCheck.url = assertChain(obj, "url") ? obj.url : "";
			}
			if ((checknormal) && ((!assertChain(obj, "image.url")) && (!assertChain(obj, "url")))) {
				toCheck.url = obj;
			}

			if (toCheck && (toCheck.image.url.length || (toCheck.url && toCheck.url.length))) {
				$.each(videoFormats, function(ignore, element) {
					if (toCheck && endsWith(toCheck.url.toLowerCase(), element.toLowerCase())) {
						returnObj = {
							type: "Video",
							extension: element
						};
						return true;
					}
				});

				$.each(imageFormats, function(ignore, element) {
					if (toCheck && endsWith(toCheck.url.toLowerCase(), element.toLowerCase())) {
						returnObj = {
							type: "Image",
							extension: element
						};
						return true;
					}
				});


				$.each(documentFormats, function(ignore, element) {
					if (toCheck && endsWith(toCheck.url.toLowerCase(), element.toLowerCase())) {
						returnObj = {
							type: "Document",
							extension: element
						};
						return true;
					}
				});


				if (toCheck.image.url && endsWith(toCheck.image.url, "thumbnail")) {
					returnObj = {
						type: "Image",
						extension: ""
					};
				}

				if ((!returnObj.type.length) && (!returnObj.extension.length)) {
					extensionA = toCheck.url.split(".");
					extensionA = extensionA[extensionA.length - 1];
					returnObj = {
						type: "NotImplemented",
						extension: extensionA
					};
				}

			} else {
				returnObj = {
					type: "NotFound",
					extension: "NotFound"
				};
			}

			return returnObj;
		}


		// END getAttachmentType

		// START generateItemContentAttachmentsHTML
		/**
		 * [generateItemContentAttachmentsHTML This function appends the HTML for several attachments. The function is only used to display the full content of a feed
		 * in a Bootstrap Lightbox later on. This will happen on click on an ActivityStream Item.]
		 * @param  {[grabFeedContent object]} itemToUseContent [An object returned by the grabFeedContent function]
		 * @return {[grabFeedContent object]}                  [The expanded grabFeedContent object (parameter) with some extra objects in the attribute .eventAttachments]
		 */
		function generateItemContentAttachmentsHTML(itemToUseContent) {
			var attachmentPreviewHtml = "",
				attachmentFileIconHtml = "",
				items = [],
				attachment = ['<ul class="ASWidgetPostMainAttachmentDiv">'];

			if (itemToUseContent.mainObject.Attachments.length) {
				items = itemToUseContent.mainObject.Attachments;
			}
			if (itemToUseContent.targetObject.Attachments.length) {
				items = itemToUseContent.targetObject.Attachments;
			}
			if (items && (!items.length)) {
				return false;
			}

			$.each(items, function(ignore, attachmentObject) {
				if (assertChain(attachmentObject, "attachmentBasicUrl.length") || assertChain(attachmentObject, "attachmentDirectUrl.length")) {
					(function checkToAddImageHTML() {
						if ((attachmentObject.attachmentType === "Image") && (attachmentObject.attachmentBasicUrl.length) && (attachmentObject.attachmentDirectUrl.length)) {

							attachment.push('<li><img class="ASWidgetCommentAttachmentactivityStreamImageUpload" src="' +
								attachmentObject.attachmentDirectUrl + '" title="' + attachmentObject.attachmentFileName +
								'" alt="' + attachmentObject.attachmentFileName + '"> </img></li>');
						}
					}()); // Checks if an image has been appended as attachment, if yes -> add html img tag

					(function checkToAddVideoHTML() {
						if (("Video" === attachmentObject.attachmentType) && (attachmentObject.attachmentBasicUrl.length) && (attachmentObject.attachmentDirectUrl.length)) {
							attachment.push('<li><div class="embed-responsive embed-responsive-16by9"><video class="embed-responsive-item ASWidgetVideoAttachment" ' +
								' controls>  <source src="' + attachmentObject.attachmentDirectUrl + '" type="video/' +
								attachmentObject.attachmentExtension.replace(".", "") + '">' + localizeString("ASWidget-video-nosupport", "Your browser does not support the video tag.") + '</video></div></li>');
						}
					}()); // Check if a video has been appended as attachment, if yes -> add html video tag

					(function checkToAddLinkHTML() {
						if (("link" === attachmentObject.attachmentType.toLowerCase()) && (attachmentObject.attachmentBasicUrl.length) && (attachmentObject.attachmentDirectUrl.length)) {
							attachment.push('<li>' +
								'<div class="panel panel-default">' +
								'<div class="panel-heading">' +
								attachmentObject.attachmentFileName +
								'</div>' +
								'<div class="panel-body">' +
								'<span>' +
								'<a href="' + attachmentObject.attachmentBasicUrl + '">' + attachmentObject.attachmentBasicUrl + '</a>' +
								'</span>' +
								'</div>' +
								'</div>' +
								'</li>');
						}
					}()); // Check if a video has been appended as attachment, if yes -> add html video tag

					if ("link" !== attachmentObject.attachmentType.toLowerCase() && ("Image" !== attachmentObject.attachmentType) && ("Video" !== attachmentObject.attachmentType)) {

						attachmentPreviewHtml = '<li class="AsWidget-Attachment-Preview">' + '<a href="' + attachmentObject.attachmentBasicUrl + '" role="button"> ' + '<img class="ASWidget-Attachment-PreviewImg" src="' +
							((attachmentObject.attachmentPreviewUrl && attachmentObject.attachmentPreviewUrl.length) ? attachmentObject.attachmentPreviewUrl : "") + '"></img></a></li>';

						attachmentFileIconHtml = '<li class="ASWidgetCommentAttachmentfileIconLi">' +
							'<a class="ASWidgetCommentAttachmentfileIcon" href="' + attachmentObject.attachmentDirectUrl + '" role="button"> ' +
							((attachmentObject.attachmentIconUrl && attachmentObject.attachmentIconUrl.length) ? ('<img src="' + attachmentObject.attachmentIconUrl + '"></img>') : '<span class="ASWidgetFileIcon lconn-ftype32 lconn-ftype32-' +
								(attachmentObject.attachmentExtension.length ? attachmentObject.attachmentExtension : "file") + '"></span>') +
							'</a>' + '</li>';

						attachment.push(
							'<div class="panel panel-default"><div class="panel-body">' +
							(("Image" !== attachmentObject.attachmentType && attachmentObject.attachmentPreviewUrl.length) ? attachmentPreviewHtml : "") + attachmentFileIconHtml +
							'<li class="ASWidgetCommentAttachmentfileNameLi">' +
							'<a class="ASWidgetCommentAttachmentfileName" href="' + attachmentObject.attachmentBasicUrl + '">' + attachmentObject.attachmentFileName + '</a>' +
							'</li>' +

							'<li>' +
							'<ul class="ASWidgetinlineSepList">' +
							'<li class="ASWidgetfileAuthor">' +
							'<span class="ASWidgetvcard">' +
							'<a href="' + attachmentObject.authorProfileURL + '" class="ASWidgetCommentAttachmentProfileURL" target="_blank" href_bc_="' + attachmentObject.authorProfileURL + '">' + attachmentObject.authorFullName +
							'<span class="x-lconn-userid" style="display: none;">' + attachmentObject.authorID + '</span>' +
							'</a>' +
							'</span>' +
							'</li>' +

							'</div>' +
							'<div class="panel-footer"><li class="ASWidgetHidden ASWidgetCommentAttachmentfileTags">' +

							(attachmentObject.attachmenFileTags.length > 0 ? '<div class="ASWidgetTags">' + localizeString("ASWidget-attachment-tags", "Tags") + ': </div><div class="ASWidget-Attachments-FileTags">' + attachmentObject.attachmenFileTags.join(",") + '</div>' : "") +
							'</div></li>' +

							'</ul></div>' +
							'</li>');
					}

				}

			});
			attachment.push("</ul>");
			return attachment.join("");
		}


		// END generateItemContentAttachmentsHTML

		// START formatToThumbnailImage
		/**
		 * [formatToThumbnailImage Some image URIs cannot be used to display within an image tag, because the thumbnail is needed. This function is for parsing.]
		 * @param  {[string]} toReplace [An image URI]
		 * @return {[string]}           [The parsed thumbnail URI]
		 */
		function formatToThumbnailImage(toReplace) {
			var dataSplitArray = [],
				objecta = toReplace || "";
			objecta = objecta.replace("basic", "form").replace("media/", "");
			dataSplitArray = objecta.split("/");
			objecta = objecta.replace(dataSplitArray[dataSplitArray.length - 1], "thumbnail?renditionKind=largeview");
			return objecta;
		}


		// END formatToThumbnailImage

		// START showLikePopover
		function showLikePopover(toIterate, hasLiked, itemWhereItWillBeDisplayed$) {
			var Liker = [],
				notLikedByMe = (!hasLiked && (1 === toIterate.length) && (toIterate[0].authorID === ownProfile.getUserId()));

			// START getPopOverLikerHTML
			function getPopOverLikerHTML(pFullName, pProfileUrl, pPictureUrl) {
				return pFullName && pProfileUrl && pPictureUrl ? '<li>' +
					'<ul class="ASWidget-LikeBox-Inside">' +
					'<li class="ASWidget-LikeBox-Inside-AuthorPic">' +
					'<a class="bidiAware fn url" title="' + localizeString("ASWidget-openProfile", "Open the Profile of $1", pFullName) + ' ' + '." href="' + pProfileUrl + '">' +
					'<img class="activityStreamPhotoOf" alt="' + localizeString("ASWidget-photo-of", "Photo of $1", pFullName) + '" src="' + pPictureUrl + '"></img>' +
					'</a>' +
					'</li>' +

					'<li class="ASWidget-LikeBox-Inside-Author-Link">' +
					'<a class="bidiAware fn url" title="' + localizeString("ASWidget-openProfile", "Open the Profile of $1", pFullName) + ' ' + '." href="' + pProfileUrl + '">' +
					'<span class="vcard ASWidgetvcard">' +
					'<span class="photo" src="' + pPictureUrl + '" role="presentation" style="display : none"></span>' + pFullName +
					'</span>' +
					'</span>' +
					'</a>' +
					'</li>' +
					'</ul>' +
					'</li>' : $('<li/>').append($('<span>').text(localizeString("ASWidget-noLiker", "No one likes this.")))[0].outerHTML;
			}


			// END getPopOverLikerHTML

			Liker.push('<ul class="ASWidgetModalBoxLikesUL">');
			if (hasLiked) {
				Liker.push(getPopOverLikerHTML(ownProfile.getName(), ownProfile.ownProfileUrl, ownProfile.ownPictureUrl));
			}

			if (!toIterate || notLikedByMe) {
				Liker.push(getPopOverLikerHTML(false, false, false));
			} else {
				if (toIterate && toIterate.length) {
					$.each(uniq(toIterate, "authorID"), function(ignore, l) {
						if (l.authorID !== ownProfile.getUserId()) {
							Liker.push(getPopOverLikerHTML(l.authorFullName, l.authorProfileURL, l.authorPictureURL));
						}
					});
				}
			}

			Liker.push('</ul>');

			itemWhereItWillBeDisplayed$.popover("destroy").popover({
				content: Liker.join(""),
				html: true,
				trigger: 'manual'
			});
			itemWhereItWillBeDisplayed$.popover("show");
			// This will close all Popovers if you click outside the popover!
			$('html').on('mouseup', function closePopover(e) {
				// if we clicked not in the popover!
				if (!$(e.target).closest('.popover').length) {
					// we will close all popovers!
					$('.popover').each(function() {
						$(this).popover('hide');
					});
					// unbind this function from html-element!
					$('html').off('mouseup', closePopover);
				}
			});
		}


		// END showLikePopover


		// START loadLikers
		function loadLikers(eventID, loadLikerCallback) {
			var tempLikerArr = {
				isLiked: false,
				IsClickable: false,
				LikerArr: []
			};
			$.ajax({
				url: getWindowLocation() + "/connections/opensocial/rest/ublog/@all/@all/" + eventID + "/likes?count=25",
				method: "GET",
				contentType: "application/x-www-form-urlencoded"
			}).done(function(data) {
				if (data && data.list.length) {
					tempLikerArr.IsClickable = true;
					$.each(data.list, function(ignore, el) {
						var likerProfileID = extractID(el.author.id);
						tempLikerArr.LikerArr.push({
							authorID: likerProfileID,
							authorProfileURL: getspecifiedURL(el.author.id, "profile"),
							authorPictureURL: getspecifiedURL(el.author.id, "picture"),
							authorFullName: el.author.displayName
						});
						if (likerProfileID && (likerProfileID === ownProfile.getUserId())) {
							tempLikerArr.IsLiked = true;
						}
					});
				}
			}).always(function() {
				if (loadLikerCallback && $.isFunction(loadLikerCallback)) {
					loadLikerCallback(tempLikerArr);
				}
			});
		}


		// END loadLikers

		// START grabFeedContent
		/**
		 * [grabFeedContent This is the main function or rather to say the heart of json feed parsing. Here are all json feeds parsed.]
		 * @param  {[json object]} el [A JSON feed of the activitystream.]
		 * @return {[object]}    [A grabFeedContent object]
		 */
		function grabFeedContent(el, pGrabFeedContentCallback) {
			var obj,
				authorIdFilled,
				oldEventTitle,
				dataSplit = [],
				firstIf,
				secondIf,
				rollUpId = "";

			if (!el) {
				return false;
			}

			obj = {
				originalFeed: el, // The original json feed of the activitystream
				eventOfType: "",

				eventCreatedDateFull: "",
				eventCreatedDateDisplay: "",
				finalHTML: "",

				bools: {
					HasTarget: !!(el.target),
					TargetIsPerson: !!(assertChain(el, "target.author")),
					IsSaved: !!(assertChain(el, "connections.saved") && ("true" === el.connections.saved)),
					IsFollowed: !!(assertChain(el, "connections.followedResource") && ("true" === el.connections.followedResource)),
					IsARepost: !!(assertChain(el, "eventAction") && ("bump" === el.eventAction)),
					IsLiked: false,
					mainObjectActorEqualsAuthor: false,
					mainObjectActorEqualsTargetAuthor: false,
					mainObjectAuthorEqualsTargetAuthor: false,
					LikeServiceAvailable: !!(assertChain(el, "connections.likeService"))
				},

				mainObject: {
					ID: el.id || "", // The main object event ID
					ObjectID: assertChain(el, "object.id") ? el.object.id : "",
					Title: el.title || "", // The event title
					PublishingDate: el.published || "", // The publishing date
					Verb: el.verb || "",
					Type: el.object.objectType || "",
					Url: el.url || "",
					IconUrl: "",
					Content: "",
					hasToLoad: false,
					Liker: {
						IsClickable: false,
						LikerArr: [],
						LikerLoaded: -1,
						LikeTotalAmount: -1
					},
					Replies: {
						RepliesArray: [],
						RepliesTotalAmount: -1,
						LikerTotalAmount: -1,
						Liker: {
							LikerArray: []
						}
					},
					Attachments: [],
					Actor: {
						FullName: (assertChain(el, "actor.displayName")) ? el.actor.displayName : "",
						ProfileId: (assertChain(el, "actor.id") && el.actor.id.length) ? extractID(el.actor.id) : "",
						ProfilePic: getspecifiedURL(el.actor.id, "picture") || "",
						ProfileUrl: getspecifiedURL(el.actor.id, "profile") || ""
					},

					Author: {
						FullName: (assertChain(el, "object.author.displayName")) ? el.object.author.displayName : "",
						ProfileId: (assertChain(el, "object.author.id") && (el.object.author.id.length)) ? extractID(el.object.author.id) : "",
						ProfilePic: (assertChain(el, "object.author.id")) ? getspecifiedURL(el.object.author.id, "picture") : "",
						ProfileUrl: (assertChain(el, "object.author.id")) ? getspecifiedURL(el.object.author.id, "profile") : ""
					},

					attachmentsHTML: ""
				},

				targetObject: {
					hasTargetAuthor: false,
					hasToLoad: false,
					DisplayName: (assertChain(el, "target.displayName") && (el.target.displayName.length)) ? el.target.displayName : "",
					ID: (assertChain(el, "target.id") && (el.target.id.length)) ? el.target.id : "",
					Type: (assertChain(el, "target.objectType") && (el.target.objectType.length)) ? el.target.objectType : "",
					Url: (assertChain(el, "target.url") && (el.target.url.length)) ? el.target.url : "",
					Summary: "",
					Liker: {
						IsClickable: false,
						LikerArr: [],
						LikerLoaded: -1,
						LikeTotalAmount: -1
					},
					Replies: {
						RepliesArray: [],
						RepliesTotalAmount: -1,
						LikerTotalAmount: -1,
						Liker: {
							LikerArray: []
						}
					},
					Attachments: [],
					Author: {
						FullName: "",
						ProfileId: "",
						ProfilePic: "",
						ProfileUrl: ""
					},
					attachmentsHTML: ""
				},

				targetAuthor: {
					eventDestActorFullName: "",
					eventDestActorProfileId: "",
					eventDestActorProfilePic: "",
					eventDestActorProfileUrl: ""
				}

			};

			authorIdFilled = (assertChain(el, "target.author.id") && (el.target.author.id.length));
			obj.targetObject.Author.FullName = (assertChain(el, "target.author.displayName") && (el.target.author.displayName.length)) ? el.target.author.displayName : "";
			obj.targetObject.Author.ProfileId = authorIdFilled ? el.target.author.id : "";
			obj.targetObject.Author.ProfileUrl = authorIdFilled ? getspecifiedURL(el.target.author.id, "profile") : "";
			obj.targetObject.Author.ProfilePic = authorIdFilled ? getspecifiedURL(el.target.author.id, "picture") : "";



			(function targetAuthorFallBacks() {
				if (el.target && ("person" === el.target.objectType)) {
					if (!obj.targetObject.Author.FullName.length) {
						obj.targetObject.Author.FullName = el.target.displayName;
					}

					if (!obj.targetObject.Author.ProfileId.length) {
						obj.targetObject.Author.ProfileId = el.target.id;
					}
					if (!obj.targetObject.Author.ProfileUrl.length) {
						obj.targetObject.Author.ProfileUrl = getspecifiedURL(el.target.id, "profile");
					}
					if (!obj.targetObject.Author.ProfilePic.length) {
						obj.targetObject.Author.ProfilePic = getspecifiedURL(el.target.id, "picture");
					}

				}
			}());




			obj.targetObject.Summary = (assertChain(el, "target.summary") && (el.target.summary.length)) ? el.target.summary : "";
			/**
			 * [eventTargetActorFullName This function is used to find the target actors fullname]
			 * @return {[string]} [The fullname of the target actor.]
			 */
			obj.targetAuthor.eventDestActorFullName = function(mainObjectBool) {

				if (mainObjectBool) {
					if (assertChain(obj, "mainObject.Actor.FullName") && (obj.mainObject.Actor.FullName.length)) {
						return obj.mainObject.Actor.FullName || "";
					}
					if (assertChain(obj, "mainObject.Author.FullName") && (obj.mainObject.Author.FullName.length)) {
						return obj.mainObject.Author.FullName || "";
					}
				} else {
					if (!assertChain(obj, "targetObject.Author.ProfileId")) {

						if (obj.bools.mainObjectActorEqualsAuthor) {
							return obj.mainObject.Actor.FullName;
						}
						return (obj.mainObject.Actor.FullName.length) ? obj.mainObject.Actor.FullName : obj.mainObject.Author.FullName;

					}
				}
				return (assertChain(obj, "targetObject.Author.FullName") && (obj.targetObject.Author.FullName.length)) ? obj.targetObject.Author.FullName : obj.mainObject.Author.FullName;
			};

			/**
			 * [eventTargetActorFullName This function is used to find the target actors profileID]
			 * @return {[string]} [The profileID of the target actor.]
			 */
			obj.targetAuthor.eventDestActorProfileId = function(mainObjectBool) {
				if (mainObjectBool) {
					if (assertChain(obj, "mainObject.Actor.ProfileId") && obj.mainObject.Actor.ProfileId.length) {
						return obj.mainObject.Actor.ProfileId || "";
					}
					if (assertChain(obj, "mainObject.Author.ProfileId") && obj.mainObject.Author.ProfileId.length) {
						return obj.mainObject.Author.ProfileId || "";
					}
				} else {
					if (!assertChain(obj, "targetObject.Author.ProfileId")) {
						if (obj.bools.mainObjectActorEqualsAuthor) {
							return obj.mainObject.Actor.ProfileId;
						}
						return (obj.mainObject.Actor.ProfileId.length) ? obj.mainObject.Actor.ProfileId : obj.mainObject.Author.ProfileId;
					}
					return (assertChain(obj, "targetObject.Author.ProfileId") && (obj.targetObject.Author.ProfileId.length)) ? obj.targetObject.Author.ProfileId : obj.mainObject.Author.ProfileId;
				}
				return "";
			};

			/**
			 * [eventTargetActorFullName This function is used to find the target actors profile picture url]
			 * @return {[string]} [The profile picture url of the target actor.]
			 */
			obj.targetAuthor.eventDestActorProfilePic = function(mainObjectBool) {

				if (mainObjectBool) {
					if (assertChain(obj, "mainObject.Actor.ProfileId") && (obj.mainObject.Actor.ProfileId.length)) {
						return getspecifiedURL(obj.mainObject.Actor.ProfileId, "picture") || "";
					}
					if (assertChain(obj, "mainObject.Author.ProfileId") && (obj.mainObject.Author.ProfileId.length)) {
						return getspecifiedURL(obj.mainObject.Author.ProfileId, "picture") || "";
					}
				} else {
					if (!assertChain(obj, "targetObject.Author.ProfileId")) {
						if (obj.bools.mainObjectActorEqualsAuthor) {
							return getspecifiedURL(obj.mainObject.Actor.ProfileId, "picture");
						}
						return (obj.mainObject.Actor.ProfileId.length) ? getspecifiedURL(obj.mainObject.Actor.ProfileId, "picture") : getspecifiedURL(obj.mainObject.Author.ProfileId, "profile");
					}

					return (assertChain(obj, "targetObject.Author.ProfileId") && (obj.targetObject.Author.ProfileId.length)) ? getspecifiedURL(obj.targetObject.Author.ProfileId, "picture") : getspecifiedURL(obj.mainObject.Author.ProfileId, "picture");
				}
				return "";
			};

			/**
			 * [eventTargetActorFullName This function is used to find the target actors profile url]
			 * @return {[string]} [The profile url of the target actor.]
			 */
			obj.targetAuthor.eventDestActorProfileUrl = function(mainObjectBool) {
				if (mainObjectBool) {
					if (assertChain(obj, "mainObject.Actor.ProfileId") && obj.mainObject.Actor.ProfileId.length) {
						return getspecifiedURL(obj.mainObject.Actor.ProfileId, "profile") || "";
					}
					if (assertChain(obj, "mainObject.Author.ProfileId") && obj.mainObject.Author.ProfileId.length) {
						return getspecifiedURL(obj.mainObject.Author.ProfileId, "profile") || "";
					}
				} else {

					if (assertChain(obj, "targetObject.Author.ProfileId") && (!obj.targetObject.Author.ProfileId.length)) {
						if (obj.bools.mainObjectActorEqualsAuthor) {
							return getspecifiedURL(obj.mainObject.Actor.ProfileId, "profile");
						}
						return (obj.mainObject.Actor.ProfileId.length) ? getspecifiedURL(obj.mainObject.Actor.ProfileId, "profile") : getspecifiedURL(obj.mainObject.Author.ProfileId, "profile");
					}

					return (assertChain(obj, "targetObject.Author.ProfileId") && obj.targetObject.Author.ProfileId.length) ? getspecifiedURL(obj.targetObject.Author.ProfileId, "profile") : getspecifiedURL(obj.mainObject.Author.ProfileId, "profile");
				}
				return "";
			};


			obj.eventCreatedDateDisplay = formatDate(X.T.parseAtomDate(obj.originalFeed.updated));
			obj.eventCreatedDateFull = moment(obj.originalFeed.updated).toISOString();


			obj.mainObject.Content = (assertChain(el, "content") && (!obj.bools.IsARepost)) ? el.content : "";
			if (!obj.mainObject.Content.length) {
				obj.mainObject.Content = (el.openSocial.embed && el.openSocial.embed.context && el.openSocial.embed.context.summary && (el.openSocial.embed.context.summary !== "[object Object]")) ? el.openSocial.embed.context.summary : "";
			}


			if ((-1 !== obj.targetObject.ID.indexOf("person")) && (-1 !== obj.targetObject.ID.indexOf("profiles"))) {
				obj.targetObject.Author.FullName = obj.targetObject.DisplayName;
				obj.targetObject.Author.ProfileId = obj.targetObject.ID;
				obj.targetObject.Author.ProfileUrl = getspecifiedURL(obj.targetObject.ID, "profile");
				obj.targetObject.Author.ProfilePic = getspecifiedURL(obj.targetObject.ID, "picture");
			}

			if (-1 === obj.mainObject.Title.indexOf("vcard")) {
				oldEventTitle = obj.mainObject.Title;

				obj.mainObject.Title = $('<div/>').append(
					$('<span/>').addClass('vcard ASWidgetvcard').append(
						$('<a/>')
							.text(obj.targetAuthor.eventDestActorFullName(true))
							.addClass('bidiAware fn url')
							.attr('title', localizeString("ASWidget-openProfile", "Open the Profile of $1", obj.targetAuthor.eventDestActorFullName(true)))
							.attr('href', obj.targetAuthor.eventDestActorProfileUrl(true))
							.append(
								$('<span/>').addClass('photo')
									.attr('src', obj.targetAuthor.eventDestActorProfilePic(true))
									.attr('role', 'presentation').hide(),
								$('<span/>')
									.addClass('x-lconn-userid')
									.text(obj.targetAuthor.eventDestActorProfileId(true))
									.hide()
							)
					), $('<span/>').html(oldEventTitle))[0].outerHTML;
			}


			obj.bools.mainObjectActorEqualsAuthor = (obj.mainObject.Author.ProfileId === obj.mainObject.Actor.ProfileId);

			obj.bools.mainObjectAuthorEqualsTargetAuthor = (obj.mainObject.Author.ProfileId === obj.targetObject.Author.ProfileId);
			obj.bools.mainObjectActorEqualsTargetAuthor = (obj.mainObject.Actor.ProfileId === obj.targetObject.Author.ProfileId);

			obj.eventOfType = assertChain(el, "generator.displayName") ? el.generator.displayName : "Post";
			if (!obj.eventOfType.length) {
				obj.eventOfType = (assertChain(el, "openSocial.embed.context.openSocial.connections.generator.displayName")) ?
					el.openSocial.embed.context.openSocial.connections.generator.displayName : "";
			}

			obj.mainObject.Liker.LikeTotalAmount = assertChain(el, "object.likes.totalItems") ? el.object.likes.totalItems : 0;
			obj.mainObject.Liker.hasToLoad = assertChain(el, "object.likes.items.length") ? (el.object.likes.items.length !== obj.mainObject.Liker.LikeTotalAmount) : false;

			obj.targetObject.Liker.LikeTotalAmount = assertChain(el, "target.likes.totalItems") ? el.target.likes.totalItems : 0;
			obj.targetObject.Liker.hasToLoad = assertChain(el, "target.likes.items.length") ? (el.target.likes.items.length !== obj.targetObject.Liker.LikeTotalAmount) : false;

			obj.mainObject.IconUrl = el.openSocial.embed.context.iconUrl || ""; // The event icon URL

			// START addCommentToList
			function addCommentToList(repliesObj, toAddTo) {
				var likerArr = [],
					isLikedByMe = false,
					items = repliesObj.items;
				$.each(items, function(ignore, commentObject) {
					isLikedByMe = false;
					if (assertChain(commentObject, "likes.items")) {
						likerArr = [];

						$.each(commentObject.likes.items, function(ignore, el) {
							var likerProfileID;
							if ("person" === el.objectType) {
								likerProfileID = extractID(el.id);
								likerArr.push({
									LikerProfile: {
										authorID: likerProfileID,
										authorProfileURL: getspecifiedURL(likerProfileID, "profile"),
										authorPictureURL: getspecifiedURL(likerProfileID, "picture"),
										authorFullName: el.displayName
									}
								});
								isLikedByMe = (likerProfileID && (likerProfileID === ownProfile.getUserId()));
							}
						});
					}


					toAddTo.push({
						LikeServiceAvailable: obj.bools.LikeServiceAvailable,
						Liker: likerArr,
						iLiked: isLikedByMe,
						commentIsLikable: true === assertChain(commentObject, "connections.likeService"),
						commentsAmountTotal: repliesObj.totalItems || 0,
						likesAmountTotal: assertChain(commentObject, "likes.totalItems") ? commentObject.likes.totalItems : 0,
						authorID: commentObject.author.id || 0,
						authorProfileURL: getspecifiedURL(commentObject.author.id, "profile"),
						authorPictureURL: getspecifiedURL(commentObject.author.id, "picture"),
						authorFullName: commentObject.author.displayName || "",
						commentID: commentObject.id || 0,
						commentEventID: 'urn:lsid:lconn.ibm.com:profiles.person:' + ownProfile.getUserId(),
						commentContent: commentObject.content || "",
						commentCreatedDateUnparsed: commentObject.updated || "",
						commentCreatedDateParsed: formatDate(X.T.parseAtomDate(commentObject.updated) || ""),
						commentCreatedDateParsedFull: moment(commentObject.updated || "").format('LLLL')
					});
				});
			}


			// END addCommentToList

			/**
			 * [generateComments Function to generate comments out of a json feed object]
			 * @return {[object]} [grabFeedContent object with .eventComments attribute filled with new objects]
			 */
			(function generateComments() {
				if (assertChain(obj, "originalFeed.object.replies.items")) {
					obj.mainObject.Replies.RepliesTotalAmount = assertChain(obj, "originalFeed.object.replies.totalItems") ? obj.originalFeed.object.replies.totalItems : 0;
					if (obj.mainObject.Replies.RepliesTotalAmount > 0) {
						addCommentToList(obj.originalFeed.object.replies, obj.mainObject.Replies.RepliesArray);
					}
				}
				if (assertChain(obj, "originalFeed.target.replies.items")) {
					obj.targetObject.Replies.RepliesTotalAmount = assertChain(obj, "originalFeed.target.replies.totalItems") ? obj.originalFeed.target.replies.totalItems : 0;
					if (obj.targetObject.Replies.RepliesTotalAmount > 0) {
						addCommentToList(obj.originalFeed.target.replies, obj.targetObject.Replies.RepliesArray);
					}
				}
			}());

			/**
			 * [checkIfFeedIsCommentOnly Checks whether the feed is a notification of a comment only. This is as well a specific case.]
			 */
			(function checkIfFeedIsCommentOnly() {
				if ("comment" === obj.mainObject.Type) {
					obj.mainObject.Content = (obj.originalFeed.object && obj.originalFeed.target.summary) ? obj.originalFeed.target.summary : "";

					/*
						                            var commentObj = { // fehlerhaft
						                                author: {
						                                    id: assertChain(obj, "originalFeed.author.id") ? obj.originalFeed.author.id : obj.originalFeed.actor.id,
						                                    displayName: assertChain(obj,"originalFeed.author.displayName") ? obj.originalFeed.author.displayName : obj.originalFeed.actor.displayName,
						                                    objectType: assertChain(obj, "originalFeed.author.objectType") ? obj.originalFeed.author.objectType : obj.originalFeed.actor.objectType
						                                },
						                                content: obj.originalFeed.object.summary,
						                                updated: obj.originalFeed.updated
						                            };
						                            addCommentToList([commentObj], obj.mainObject.Comments.Objects);
						                            */

				}
			}());

			/**
			 * [checkForAttachMents A function to check for specific attachments]
			 * @return {[object]} [An object with several attributes]
			 */
			(function checkForAttachMents() {
				var conditionList = [(assertChain(obj, "originalFeed.object.attachments.length") && (obj.originalFeed.object.attachments.length > 0)),
					(assertChain(obj, "originalFeed.target.attachments.length") && (obj.originalFeed.target.attachments.length > 0)),
					(assertChain(obj, "originalFeed.object.image.url.length") && (obj.originalFeed.object.image.url.length > 0)),
					(assertChain(obj, "originalFeed.target.image.url.length") && (obj.originalFeed.target.image.url.length > 0)),
					(assertChain(obj, "originalFeed.object.fileUrl.length") && (obj.originalFeed.object.fileUrl.length > 0)),
					(assertChain(obj, "originalFeed.target.fileUrl.length") && (obj.originalFeed.target.fileUrl.length > 0))
				];



				if (-1 === conditionList.indexOf(true)) {
					return false;
				} // If the json event does not contain any events, then return.

				// START addAttachment
				function addAttachment(pObjectType, pAuthorName, pAuthorId, pAuthorUrl, pFileName, pBasicUrl, pDirectUrl, pPreViewUrl, pIconUrl, isMain) {
					var toAddTo = (isMain) ? obj.mainObject : obj.targetObject,
						toaddToOrig = (isMain) ? obj.originalFeed.object : obj.originalFeed.target,
						fileInfo = getAttachmentType(pDirectUrl, true),
						objectA = {
							authorID: pAuthorId || 0,
							authorFullName: pAuthorName || "",
							authorExtractedID: (pAuthorId && pAuthorId.length) ? extractID(pAuthorId) : "",
							authorProfileURL: pAuthorUrl || "",
							authorPictureURL: (pAuthorId && pAuthorId.length) ? getspecifiedURL(pAuthorId, "picture") : "",

							attachmentFileName: pFileName || "",
							attachmentBasicUrl: pBasicUrl || "",
							attachmentDirectUrl: pDirectUrl || "",
							attachmentPreviewUrl: pPreViewUrl || "",
							attachmentIconUrl: pIconUrl || "",
							attachmentType: fileInfo.type || "",
							attachmentExtension: fileInfo.extension.length ? replaceIt(fileInfo.extension, ".", "") : "",
							attachmenFileTags: [],
							IsMain: isMain
						};

					if (pObjectType && (pObjectType.length)) {
						fileInfo = {
							type: "link",
							extension: "link"

						};
					}

					if (assertChain(toaddToOrig, "tags") && (toaddToOrig.tags.length > 0)) {
						$.each(toaddToOrig.tags, function(ignore, el) {
							objectA.attachmenFileTags.push(el.displayName);
						});
					}

					toAddTo.Attachments.push(objectA);
				}


				// END addAttachment



				// START checkFileObject
				function checkFileObject(pObj) {
					var mustHaveCondition = (assertChain(pObj, "objectType") && ("file" === pObj.objectType)) || (assertChain(pObj, "image.url") && assertChain(pObj, "url.length")),
						normalFileConditions = [
							assertChain(pObj, "mimeType") && (pObj.mimeType.length),
							assertChain(pObj, "fileUrl") && (pObj.fileUrl.length),
							assertChain(pObj, "objectType") && ("file" === pObj.objectType),
							assertChain(pObj, "image.url") && assertChain(pObj, "url.length")
						];
					return (!(-1 === normalFileConditions.indexOf(true))) && (mustHaveCondition);
				}


				// END checkFileObject

				(function checkTargetObject() {
					var sAuthorName,
						sAuthorId,
						sAuthorUrl,
						sFileName,
						sBasicUrl,
						sDirectUrl,
						sPreviewUrl,
						sIconUrl;

					if (!assertChain(obj, "originalFeed.target")) {
						return false;
					}

					// function addAttachment(pObjectType, pAuthorName, pAuthorId, pAuthorUrl, pFileName, pBasicUrl, pDirectUrl, pPreViewUrl, isMain) {
					if (assertChain(obj, "originalFeed.target.attachments") && (obj.originalFeed.target.attachments.length)) {
						$.each(obj.originalFeed.target.attachments, function(ignore, atta) {
							if (checkFileObject(atta)) {
								sAuthorName = atta.author.displayName;
								sAuthorId = atta.author.id;
								sAuthorUrl = atta.author.url;

								sFileName = atta.displayName;
								sBasicUrl = obj.originalFeed.target.url;
								sDirectUrl = atta.url;
								sPreviewUrl = (assertChain(atta, "image.url") && (atta.image.url.length)) ? atta.image.url : "";
								sIconUrl = "";
								addAttachment(undefined, sAuthorName, sAuthorId, sAuthorUrl, sFileName, sBasicUrl, sDirectUrl, sPreviewUrl, sIconUrl, false);
							}
						});
					}


					if (assertChain(obj, "originalFeed.target.fileUrl") && (obj.originalFeed.target.fileUrl.length)) {
						if (checkFileObject(obj.originalFeed.target)) {
							sAuthorName = obj.targetAuthor.eventDestActorFullName(false);
							sAuthorId = obj.targetAuthor.eventDestActorProfileId(false);
							sAuthorUrl = obj.targetAuthor.eventDestActorProfileUrl(false);

							sFileName = obj.originalFeed.target.displayName;
							sBasicUrl = obj.originalFeed.target.url;
							sDirectUrl = obj.originalFeed.target.fileUrl;
							sPreviewUrl = (assertChain(obj, "originalFeed.target.image.url") && (obj.originalFeed.target.image.url.length)) ? obj.originalFeed.target.image.url : "";
							sIconUrl = "";
							addAttachment(undefined, sAuthorName, sAuthorId, sAuthorUrl, sFileName, sBasicUrl, sDirectUrl, sPreviewUrl, sIconUrl, false);
						}
					}
					return false;
				}());

				(function checkMainbject() {
					var sAuthorName,
						sAuthorId,
						sAuthorUrl,
						sFileName,
						sBasicUrl,
						sDirectUrl,
						sPreviewUrl,
						sIconUrl;

					if (!assertChain(obj, "originalFeed.object")) {
						return false;
					}

					if (assertChain(obj, "originalFeed.object.attachments") && (obj.originalFeed.object.attachments.length)) {
						$.each(obj.originalFeed.object.attachments, function(ignore, atta) {

							if (checkFileObject(atta)) {
								sAuthorName = atta.author.displayName;
								sAuthorId = atta.author.id;
								sAuthorUrl = atta.author.url;

								sFileName = atta.displayName;
								sBasicUrl = obj.originalFeed.object.url;
								sDirectUrl = atta.url;
								sPreviewUrl = (assertChain(atta, "image.url") && (atta.image.url.length)) ? atta.image.url : "";
								sIconUrl = "";
								addAttachment(undefined, sAuthorName, sAuthorId, sAuthorUrl, sFileName, sBasicUrl, sDirectUrl, sPreviewUrl, sIconUrl, true);
							}
						});
					}

					if (assertChain(obj, "originalFeed.object.fileUrl") && (obj.originalFeed.object.fileUrl.length)) {
						if (checkFileObject(obj.originalFeed.object)) {
							sAuthorName = obj.targetAuthor.eventDestActorFullName(true);
							sAuthorId = obj.targetAuthor.eventDestActorProfileId(true);
							sAuthorUrl = obj.targetAuthor.eventDestActorProfileUrl(true);

							sFileName = obj.originalFeed.object.displayName;
							sBasicUrl = obj.originalFeed.object.url;
							sDirectUrl = obj.originalFeed.object.fileUrl;
							sPreviewUrl = (assertChain(obj, "originalFeed.object.image.url") && (obj.originalFeed.object.image.url.length)) ? obj.originalFeed.object.image.url : "";
							sIconUrl = "";
							addAttachment(undefined, sAuthorName, sAuthorId, sAuthorUrl, sFileName, sBasicUrl, sDirectUrl, sPreviewUrl, sIconUrl, true);
						}
					}
					return false;
				}());
				return false;
			}());

			// START readResponseLikerData
			function readResponseLikerData(isMainObj, items) {
				var tObj = isMainObj ? obj.mainObject : obj.targetObject,
					tOriginObj = isMainObj ? el.object || {} : el.target || {},
					toIterate = isMainObj ? obj.originalFeed.object.likes.items : obj.originalFeed.target.likes.items;

				if (items) {
					toIterate = items;
				}
				obj.LikeObject = tOriginObj;
				tObj.Liker.IsClickable = (("file" !== tOriginObj.objectType) && ("article" !== tOriginObj.objectType));
				$.each(toIterate, function(ignore, el) {
					var likerProfileID = extractID(el.id);
					tObj.Liker.LikerArr.push({
						authorID: likerProfileID,
						authorProfileURL: getspecifiedURL(el.id, "profile"),
						authorPictureURL: getspecifiedURL(el.id, "picture"),
						authorFullName: el.displayName
					});
					if (likerProfileID && (likerProfileID === ownProfile.getUserId())) {
						obj.bools.IsLiked = true;
					}
				});
				tObj.Liker.LikerLoaded = tObj.Liker.LikerArr.length;
				tObj.Liker.LikeTotalAmount = tOriginObj.likes.totalItems;
				obj.LikeObject.Access = tObj.Liker;
			}


			// END readResponseLikerData

			(function checkWhichLikersAreRelevant() {
				dataSplit = obj.bools.LikeServiceAvailable ? replaceIt(obj.originalFeed.connections.likeService, "/likes", "").split("/") : [];
				rollUpId = dataSplit[dataSplit.length - 1] || obj.originalFeed.connections.rollupid;
			}());


			firstIf = obj.bools.LikeServiceAvailable && assertChain(el, "object.likes.totalItems") && (el.object.likes.totalItems > 0) &&
				(el.object.id === rollUpId);
			secondIf = obj.bools.LikeServiceAvailable && assertChain(el, "target.likes.totalItems") && (el.target.likes.totalItems > 0) &&
				(el.target.id === rollUpId);
			if (firstIf) {
				readResponseLikerData(true, undefined);
			}
			if (secondIf) {
				readResponseLikerData(false, undefined);
			}

			obj.mainObject.attachmentsHTML = generateItemContentAttachmentsHTML(obj); // toAddHTML
			obj.targetObject.attachmentsHTML = generateItemContentAttachmentsHTML(obj); // toAddHTML
			if (pGrabFeedContentCallback && $.isFunction(pGrabFeedContentCallback)) {
				pGrabFeedContentCallback(obj);
			}
			return false;
		}


		// END grabFeedContent


		// START createActionMenuOrientMe
		function createActionMenuOrientMe(expandedObject) {
			var jqObj = $(expandedObject.pregeneratedHTML),
				originalDataItem = expandedObject.originalDataObject,
				grabbedFeedObject = expandedObject.GrabbedFeedObject,
				likeObj = grabbedFeedObject.LikeObject,
				itemWrapper$ = $('<ul/>').addClass('oM-actionDiv'),
				finalActionMenu$,
				rollUpId,
				likedState,
				count = 0,
				likingNotAllowed = ((originalDataItem.connections.likeService && (isCommunityMode() && !currentAccess.isMember)) || (!originalDataItem.connections.likeService)),
				currActionItem$;


			if (originalDataItem.target && objectTypeConf.isCommentable(grabbedFeedObject.originalFeed)) {
				if (!(isCommunityMode() && !currentAccess.isMember)) {

					currActionItem$ = $('<li/>').addClass('oM-entryItem-CommentToggleWrapper').append(
						$('<i/>').addClass('fa fa-long-arrow-up oM-action oM-itemAction oM-CommentToggle CommentToggle').attr('aria-hidden', true)
					).hide();
					itemWrapper$.append(currActionItem$);

					currActionItem$ = $('<li/>').addClass('oM-entryItem-Commentwrapper').append($('<div/>').addClass('oM-action oM-CommentActionWrapper').append(
						$('<i/>').addClass('fa fa-long-arrow-up toggleCommentAction').attr('aria-hidden', true).hide(),
						$('<i/>').addClass('fa fa-comment-o oM-action oM-itemAction oM-CommentAction CommentAction').attr('aria-hidden', true),
						$('<span/>').addClass('oM-itemAction ASWidgetCurrentCommentAmount').text('0').hide()
					));
					itemWrapper$.append(currActionItem$);
				}
			}

			if (likeObj) {
				count = likeObj.likes.totalItems || 0;
				rollUpId = likeObj.id;
				likedState = expandedObject.Liked;
			}


			currActionItem$ = $('<li/>').addClass('oM-entryItem-Likewrapper').append($('<div/>').attr('eventid', rollUpId).addClass('oM-action LikeX').append(
				$('<i/>').addClass(likedState ? 'fa fa-heart LikeAction' : 'fa fa-heart-o LikeAction'),
				$('<span/>').addClass('oM-itemAction ASWidgetCurrentPostLikes oM-action-showLikes').text(count)
			));
			if (likingNotAllowed && (0 === count)) {
				currActionItem$.hide();
			}
			if (likingNotAllowed) {
				currActionItem$.find('.LikeAction').hide();
			}
			itemWrapper$.append(currActionItem$);


			itemWrapper$.append($('<li/>').append(
				$('<div/>').addClass('btn-group dropup')
					.append($('<button/>')
							.text('...')
							.attr('type', 'button')
							.addClass('btn btn-secondary dropdown-toggle')
							.attr('data-toggle', 'dropdown')
							.attr('aria-haspopup', true)
							.attr('aria-expanded', false),
						$('<ul/>').addClass('dropdown-menu oM-dropUpItems'))
			)
			);


			if (objectTypeConf.isRepostAble(grabbedFeedObject.mainObject.Type)) {
				currActionItem$ = $('<li/>').addClass('oM-dropdownItem')
					.append($('<a/>').addClass('oM-action oM-itemAction RepostAction')
						.text(localizeString("ASWidget-streamitems-repost", "Repost")));
				itemWrapper$.find('.oM-dropUpItems').append(currActionItem$);
			}

			if (!(isCommunityMode() && !currentAccess.isMember)) {
				currActionItem$ = $('<li/>').addClass('oM-dropdownItem')
					.append($('<a/>').addClass('oM-action ASWidgetSaveSelectedPost')
						.text(((expandedObject.GrabbedFeedObject.bools.IsSaved) ? localizeString("ASWidget-streamitems-dontsave", "Don't save") : localizeString("ASWidget-streamitems-save", "Save"))));
				itemWrapper$.find('.oM-dropUpItems').append(currActionItem$);
			}


			if (objectTypeConf.isFollowAble(grabbedFeedObject.mainObject.Type) && grabbedFeedObject.bools.IsFollowed) {
				if (!(isCommunityMode() && !currentAccess.isMember)) {
					currActionItem$ = $('<li/>').addClass('oM-dropdownItem')
						.append($('<a/>').addClass('oM-action FollowAction')
							.text(localizeString("ASWidget-streamitems-unfollow", "Unfollow")));
					itemWrapper$.find('.oM-dropUpItems').append(currActionItem$);
				}
			}
			finalActionMenu$ = $('<div/>')
				.addClass('ActivityStreamWidgetInlinelist ActivityStreamWidgetActions ActivityStreamWidgetLeft')
				.attr('role', 'toolbar')
				.append(itemWrapper$);

			return jqObj.find(".ActivityStreamWidgetMetaChunk").prepend(finalActionMenu$).end().get(0).outerHTML;
		}


		// END createActionMenuOrientMes

		// START createActionMenu
		function createActionMenu(expandedObject) {
			var jqObj = $(expandedObject.pregeneratedHTML),
				originalDataItem = expandedObject.originalDataObject,
				grabbedFeedObject = expandedObject.GrabbedFeedObject,
				likeObj = grabbedFeedObject.LikeObject,
				items = ['<div class="btn-group btn-group-xs" role="group" aria-label="ASWidgetPostActionDiv">'],
				likedState,
				rollUpId,
				count,
				toAdd;

			if (!savedSettings.useDefaultStyle) {
				return createActionMenuOrientMe(expandedObject);
			}

			if (likeObj) {
				count = likeObj.likes.totalItems;
				rollUpId = likeObj.id;
				likedState = expandedObject.Liked;

				items.push('<button type="button" ' + ((!likeObj.Access.IsClickable) ? "disabled" : "") +
					' rollUpId="' + rollUpId + '" class="btn btn-primary btn-xs LikeX" ' + (0 === count ? ' style="display:none!important" ' : "") + '><i class="fa fa-thumbs-up" aria-hidden="true"></i><span class="ASWidgetCurrentPostLikes">' +
					'&nbsp' + count + '</span></button>');
			}

			if (originalDataItem.connections.likeService) {
				if (!(isCommunityMode() && !currentAccess.isMember)) {
					items.push('<button type="button" eventid="' + rollUpId + '" class="btn btn-primary btn-xs LikeAction">' +
						(likedState ? localizeString("ASWidget-streamitems-unlike", "Unlike") : localizeString("ASWidget-streamitems-like", "Like")) +
						'</button>');
				}
			}


			if (originalDataItem.target && objectTypeConf.isCommentable(grabbedFeedObject.originalFeed)) {
				if (!(isCommunityMode() && !currentAccess.isMember)) {
					items.push('<button type="button" class="btn btn-primary btn-xs CommentAction">' + localizeString("ASWidget-streamitems-comment", "Comment") +
						'</button>');
				}

			}

			if (objectTypeConf.isRepostAble(grabbedFeedObject.mainObject.Type)) {
				items.push('<button type="button" class="btn btn-primary btn-xs RepostAction">' + localizeString("ASWidget-streamitems-repost", "Repost") +
					'</button>');
			}

			if (!(isCommunityMode() && !currentAccess.isMember)) {
				items.push('<button type="button" class="btn btn-primary btn-xs ASWidgetSaveSelectedPost">' +
					((expandedObject.GrabbedFeedObject.bools.IsSaved) ? localizeString("ASWidget-streamitems-dontsave", "Don't save") : localizeString("ASWidget-streamitems-save", "Save")) +
					'</button>');
			}


			if (objectTypeConf.isFollowAble(grabbedFeedObject.mainObject.Type) && grabbedFeedObject.bools.IsFollowed) {
				if (!(isCommunityMode() && !currentAccess.isMember)) {
					items.push('<button type="button" class="btn btn-primary btn-xs FollowAction">' +
						localizeString("ASWidget-streamitems-unfollow", "Unfollow") +
						'</button>');
				}
			}
			items.push(savedSettings.useDefaultStyle ? '</div>' : '</ul>');

			toAdd = '<div class="ActivityStreamWidgetInlinelist ActivityStreamWidgetActions ActivityStreamWidgetLeft" role="toolbar" aria-label="Elementaktionen">' + items.join("") + '</div>';

			jqObj.find(".ActivityStreamWidgetMetaChunk").prepend(toAdd);
			return jqObj.get(0).outerHTML;
		}


		// END createActionMenu

		// START getMetaChunk
		function getMetaChunk() {
			var commentBtnText = localizeString("ASWidget-post-comment", "Post Comment"),
				postCommentBtn$ = savedSettings.useDefaultStyle ? $('<button/>')
						.attr('type', 'button')
						.addClass('btn btn-primary btn-xs PostCurrentComment')
						.text(commentBtnText)
						.append($('</i>').addClass('fa fa-comment')) :

					$('<a/>')
						.text(commentBtnText)
						.addClass('PostCurrentComment oM-Button-active')
						.append($('</i>').addClass('fa fa-comment'));


			return '<div class="ActivityStreamWidgetMetaChunk">' +
				'<div class="ActivityStreamWidgetHidden likeErrorMessage" role="alert"></div>' +
				'<div class="ASWidgetcommentsSection" data-rel="Main">' +
				'<ul class="ASWidgetcommentsList"></ul>' +
				'</div>' +

				'<div class="form-group shareCurrentCommentDiv">' +
				'<textarea class="form-control" rows="8" placeholder="' + localizeString("ASWidget-comment-placeholder", "Add a comment...") + '" class="CommentCurrentEvent"></textarea>' +

				'<div class="navbar-right btn-group postCommentDiv">' +
				postCommentBtn$[0].outerHTML +
				'</div>' +
				'</div>' +
				'</div>';
		}


		// END getMetaChunk

		// START generateSingleComment
		/**
		 * [modifyItem Function to modify each item. The HTML is generated here.]
		 * @param  {[object]} expandedObject [An expanded, self written object.]
		 * @return {[object]}                [The expanded, self written object with filled attributes.]
		 */

		function generateSingleComment(pCommentInfoObject) {
			var likeText = pCommentInfoObject.Comment.iLiked ? localizeString("ASWidget-streamitems-comment-unlike", "Unlike") : localizeString("ASWidget-streamitems-comment-like", "Like"),
				defaultLikeCount$ = $('<button/>')
					.attr('type', 'button')
					.addClass('btn btn-primary btn-xs smallGrayBtn CommentShowLikes')
					.append($('<i/>').addClass('fa fa-thumbs-up').attr('aria-hidden', 'true'),
						$('<span/>').addClass('ASWidgetCurrentCommentLikes').text(pCommentInfoObject.Comment.LikesAmountTotal)),

				toAdd = '<li ' + 'eventId="' + pCommentInfoObject.Comment.EventId + '" commentId="' + pCommentInfoObject.Comment.Id + '"' +
					(pCommentInfoObject.Comment.iLiked ? 'liked="true"' : 'liked="false"') + ' class="ASWidget-Comment">' +
					'<ul class="ASWidget-Comment-Inside">' +
					'<ul class="ASWidget-Comment-Inside-Author">' +
					'<li class="commentAuthorPic">' + '<img src="' + pCommentInfoObject.Author.PictureUrl +
					'" class="ASWidgetCommentPic" alt="' + localizeString("ASWidget-photo-of", "Photo of $1", pCommentInfoObject.Author.FullName) + '">' +
					'</li>' +

					'<li>' +
					'<span class="ASWidgetvcard">' +
					'<a href="' + pCommentInfoObject.Author.ProfileUrl + '" target="_blank">' + pCommentInfoObject.Author.FullName +
					'</a>' +
					'</span>' +
					'</li>' + '<li class="ASWidget-Comment-Date" data-placement="left" data-toggle="ASWidget-Comment-Tooltip" title="' +
					pCommentInfoObject.Comment.CreatedDateParsedFull + '" data-parseddatefull="' +
					pCommentInfoObject.Comment.CreatedDateParsedFull + '">' +
					'<abbr>' + pCommentInfoObject.Comment.CreatedDateFull +
					'</abbr>' +
					'</li><li class="ASWidget-Like-Comment-BtnGroup"><div class="btn-group btn-group-xs" role="group" aria-label="ASWidgetCommentActionDiv">';

			if (!pCommentInfoObject.LikeServiceAvailable) {
				defaultLikeCount$.hide();
			}
			toAdd += savedSettings.useDefaultStyle ? defaultLikeCount$[0].outerHTML : '';

			toAdd += (pCommentInfoObject.Comment.isLikable && (!(isCommunityMode() && !currentAccess.isMember))) ? (savedSettings.useDefaultStyle ?
				$('<button/>').attr('type','button').addClass('btn btn-primary btn-xs smallGrayBtn LikeComment').text(likeText)[0].outerHTML : '') : '';

			toAdd += '</div></li></ul>' +
				$('<li/>').append($('<div/>').addClass('ASWidgetCommentContent').text(pCommentInfoObject.Comment.Content))[0].outerHTML;
			toAdd += '</ul></li>';

			return toAdd;
		}


		// END generateSingleComment

		// START generateCommentsHtml
		function generateCommentsHtml(pCommentObjects) {
			var items = [];
			if (!pCommentObjects || (pCommentObjects && !pCommentObjects.length)) {
				return [];
			}
			$.each(pCommentObjects, function(ignore, commentObject) {
				var toGenObj = {
					LikeServiceAvailable: commentObject.LikeServiceAvailable,
					Author: {
						FullName: commentObject.authorFullName,
						ProfileUrl: commentObject.authorProfileURL,
						PictureUrl: commentObject.authorPictureURL
					},
					Comment: {
						EventId: commentObject.commentEventID,
						Id: commentObject.commentID,
						iLiked: commentObject.iLiked,
						isLikable: commentObject.commentIsLikable,
						LikesAmountTotal: commentObject.likesAmountTotal,
						CreatedDateParsedFull: commentObject.commentCreatedDateParsedFull,
						CreatedDateFull: commentObject.commentCreatedDateParsed,
						Content: commentObject.commentContent
					}
				};

				items.push(generateSingleComment(toGenObj));
			});
			return items;
		}


		// END generateCommentsHtml

		// START getShowPreviousCommentsIndicator$
		function getShowPreviousCommentsIndicator$(useDefault) {
			var showPrevText = localizeString("ASWidget-comments-showprevious", "Show Previous Comments..."),
				li$ = $('<li/>').addClass('ASWidget-Comment-ShowMoreComments'),

				previousComments$ = li$.append(
					$('<button/>')
						.attr('type', 'button')
						.addClass('btn btn-primary btn-xs AS-Widget-ShowPreviousCommentsBtn')
						.text(showPrevText)
				);

			if (!useDefault) {
				previousComments$ = li$.html('').append(
					$('<a/>')
						.addClass('oM-showpreviousComments AS-Widget-ShowPreviousCommentsBtn')
						.text(showPrevText)
				);
			}
			return previousComments$;
		}


		// END getShowPreviousCommentsIndicator$

		// START modifyItem
		function modifyItem(expandedObject) {
			var jqObj = $(expandedObject.pregeneratedHTML),
				newPostElement = "",
				originalDataItem = expandedObject.originalDataObject,
				grabbedFeedObject = expandedObject.GrabbedFeedObject,
				postObjectInside$ = jqObj.find('.postObject-inside-main');


			jqObj.find(".ASWidgetPostUL").append('<li class="oM-Actions">' + getMetaChunk() + '</li>');

			if (isCommunityMode() && !currentAccess.isMember) {
				jqObj.find('.oM-Actions').remove();
			}

			if (!savedSettings.useDefaultStyle) {
				jqObj.find('.ASWidgetcommentsSection').hide();
				jqObj.find('.oM-Actions').appendTo(postObjectInside$);
			}

			(function generateImagesHTML() {
				var imageSrcUrl = (originalDataItem.object && originalDataItem.object.image && originalDataItem.object.image.url) ? originalDataItem.object.image.url : originalDataItem.object.fileUrl,
					imageTags = "";

				if (originalDataItem.object.tags && originalDataItem.object.tags.length) {
					$.each(originalDataItem.object.tags, function(i, elem) {
						imageTags += elem.displayName + ((i !== originalDataItem.object.tags.length - 1) ? "," : "");
					});
				}
				if (imageSrcUrl && imageSrcUrl.indexOf("files/form") !== -1) {
					imageSrcUrl = formatToThumbnailImage(imageSrcUrl);
				}

				if (imageSrcUrl && originalDataItem.object.mimeType && (originalDataItem.object.mimeType.indexOf("image") !== -1)) {
					newPostElement = '<div class="ActivityStreamWidgetPostDetails ActivityStreamWidgetChunk">' +
						'<div class="ActivityStreamWidgetPostObject"> ' +
						'<a href="' + originalDataItem.object.url + '" class="imageOfPost"><img class="activityStreamImageUpload" src="' +
						imageSrcUrl + '" title="' + originalDataItem.object.displayName +
						'" alt="' + originalDataItem.object.displayName + '">' +
						'</div>' +

						'<div class="ActivityStreamWidgetMeta"> ' +
						'<ul class="ActivityStreamWidgetInlinelist">' +
						'<li class="ActivityStreamWidgetFirst ASWidgetLinkContainer">' + localizeString("ASWidget-from", "From:") + ' ' +

						'<span class="vcard ASWidgetvcard">' +
						'<a href="' + grabbedFeedObject.targetAuthor.eventDestActorProfileUrl() + '" ' +
						' class="fn bidiAware url" target="_blank" _bizcardprocessed_="true" role="button" ' +
						'href_bc_="' + grabbedFeedObject.targetAuthor.eventDestActorProfileUrl() + '">' + grabbedFeedObject.targetAuthor.eventDestActorFullName() +
						'<span class="x-lconn-userid" ' +
						' style="display: none;">' + grabbedFeedObject.targetAuthor.eventDestActorProfileId() +
						'</span>' +
						'</a>' +
						'</span>' +

						'</li>' +

						(imageTags.length > 0 ? '<li class="ASWidget-Post-Image-Tags"><span>Tags:</span> <div class="ASWidget-Post-Image-Tags-InLine">' + imageTags + '</div></li>' : '') +
						'</ul>' +
						'</div>' +
						'</div>';
					jqObj.find(".postContent").html(newPostElement);
				}
			}());


			(function createCommentsinHTML() {
				var items = [],
					commentsList$;
				if ((!grabbedFeedObject.mainObject.Replies.RepliesArray.length) && (!grabbedFeedObject.targetObject.Replies.RepliesArray.length)) {
					jqObj.find("[data-rel=Main]").hide();
					return false;
				}

				if (grabbedFeedObject.mainObject.Replies.RepliesArray.length) {
					if (grabbedFeedObject.mainObject.Replies.RepliesTotalAmount > 2 && ("file" !== grabbedFeedObject.mainObject.Type)) {
						items.push(getShowPreviousCommentsIndicator$(savedSettings.useDefaultStyle)[0].outerHTML);
					}

					items = items.concat(generateCommentsHtml(grabbedFeedObject.mainObject.Replies.RepliesArray));
					commentsList$ = jqObj.find("[data-rel=Main] .ASWidgetcommentsList");
					commentsList$.html(items.join(""));
					if (!savedSettings.useDefaultStyle) {
						commentsList$.parents('.ASWidgetcommentsSection').hide();
					}
					items = [];
				}

				if (grabbedFeedObject.targetObject.Replies.RepliesArray.length) {
					items = [];
					if (grabbedFeedObject.mainObject.Replies.RepliesTotalAmount > 2 && ("file" !== grabbedFeedObject.targetObject.Type)) {
						items.push(getShowPreviousCommentsIndicator$(savedSettings.useDefaultStyle)[0].outerHTML);
					}
					items = items.concat(generateCommentsHtml(grabbedFeedObject.targetObject.Replies.RepliesArray));
					jqObj.find("[data-rel=Main] .ASWidgetcommentsList").html(items.join(""));
				}

				jContainer.find('[data-toggle="ASWidget-Comment-Tooltip"]').tooltip();
				return false;
			}());

			return jqObj.get(0).outerHTML;
		}


		// END modifyItem

		// START generateVCard
		function generateVCard(pFullName, pProfileId, pProfileUrl, pProfilePic, withPic, addProfileUrl, isSubActor) {

			var toReturn = (withPic ? '<div class="ActivityStreamWidgetPostAuthorInfo"> <div class="ActivityStreamWidgetPostAvatar">' +
				' <img class="activityStreamPhotoOf ' + (isSubActor ? 'ASWidgetSubActorPic' : "") + '"alt="' + localizeString("ASWidget-photo-of", "Photo of $1", pFullName) + '" src="' +
				pProfilePic + '"> </div>' : "") +

				((addProfileUrl) ? '<span class="vcard ASWidgetvcard"><a class="bidiAware fn url" title="' + localizeString("ASWidget-openProfile", "Open the Profile of $1", pFullName) + ' ' + '." href="' +
					pProfileUrl + '"><span class="photo" src="' + pProfilePic +
					'" role="presentation" style="display : none"></span>' + pFullName + '</a><span class="x-lconn-userid" style="display : none">' +
					pProfileId + '</span></span></div>' : "");

			return toReturn;

		}


		// END generateVCard

		// START generateSingleFeedHTML
		function generateSingleFeedHTML(itemToUseContent) {

			var tAuthorFullName = itemToUseContent.targetAuthor.eventDestActorFullName(true),
				tAuthorProfileUrl = itemToUseContent.targetAuthor.eventDestActorProfileUrl(true),
				tAuthorProfilePic = itemToUseContent.targetAuthor.eventDestActorProfilePic(true),
				tAuthorProfileId = itemToUseContent.targetAuthor.eventDestActorProfileId(true),
				mainActorVCard = generateVCard(tAuthorFullName, tAuthorProfileId, tAuthorProfileUrl, tAuthorProfilePic, true, false, false),
				toAdd,
				expandedObject,
				embeddedActor = {
					vCard: "",
					id: -1
				},
				embeddedContent = "",
				nTitle = itemToUseContent.mainObject.Title || "",
				eventDateHTML = "",
				tTitleToComp,
				CcontentToComp,

				nCreatedDateDisplay = itemToUseContent.eventCreatedDateDisplay || "",
				nCreatedFullDate = itemToUseContent.eventCreatedDateFull,

				nTargetUrl = itemToUseContent.mainObject.Url,
				nRollUpId = itemToUseContent.originalFeed.connections.rollupid || "",
				nIsSaved = itemToUseContent.bools.IsSaved,
				nIsLiked = itemToUseContent.bools.IsLiked,
				nIsFollowed = itemToUseContent.bools.IsFollowed,
				nDataId = itemToUseContent.mainObject.ID,
				nVerb = itemToUseContent.mainObject.Verb || "",
				nPublishingDate = itemToUseContent.mainObject.PublishingDate || "",

				nEventOf = itemToUseContent.eventOfType || "",

				nObjectType = itemToUseContent.mainObject.Type,
				nContent = itemToUseContent.mainObject.Content,
				nFirstLevelContentAttribute = assertChain(itemToUseContent, "originalFeed.content") ? itemToUseContent.originalFeed.content : "",
				postObject = "",
				insideActorHTML = '<li class="postObject-inside-actor">$MAIN_ACTOR_VCARD</li>',
				insideEmbedded$ = $('<ul/>').addClass('postObject-inside-embedded')
					.append($('<li/>').addClass('postObject-inside-embedded-actor').text('$EMBEDDED_ACTOR'),
						$('<li/>').addClass('postObject-inside-embedded-eventContent').text('$EMBEDDED_CONTENT')),

				insideMain$ = $('<ul/>').addClass('postObject-inside-main')
					.append($('<li/>').addClass('postObject-inside-eventContent').text('$MAIN_CONTENT'),
						$('<li/>').addClass('postObject-inside-eventAttachments').text('$EVENT_ATTACHMENTS')),

				postObjectHtmlTemplate = '<li class="normalPostEntryItem" tabindex="$TAB_INDEX" data-index="$DATA_INDEX">' +
					'<div class="activityStreamNewsItemContainer ActivityStreamWidgetPost" data-targetURL="$DATA_TARGETURL" ' +
					'data-rollupid="$DATA_ROLLUPID" saved="$DATA_SAVED" liked="$DATA_LIKED" followed="$DATA_FOLLOWED" data-verb="$DATA_VERB" data-objectType="$DATA_OBJECTTYPE" data-id="$DATA_ID" data-date="$DATA_DATE">';

			postObjectHtmlTemplate += '<ul class="ASWidgetPostUL">' +

				(savedSettings.useDefaultStyle ? '' : insideActorHTML) +
				'<li class="normalPostEntryItemexpand"><div class="postActionBox"><i class="fa fa-angle-double-' + (X.L.isRTL ? 'left' : 'right') + '" aria-hidden="true"></i></div></li>';


			eventDateHTML = '<div class="panel panel-default ASWidgetDatePanel">' +
				'<div class="panel-body">' +
				'<span>' +
				'<abbr data-toggle="ASWidget-Post-Date" title="$CREATION_DATEFULL" data-placement="left" data-parseddatefull="$CREATION_DATEPARSEDFULL">$EVENT_CREATEDDATE</abbr>' +
				'<span title="' + localizeString("ASWidget-event-from", "Event from $1", nEventOf) + '">$EVENT_ICON' + '</span>' +
				'</span>' +
				'</div>' +
				'</div>';
			postObjectHtmlTemplate += '<li class="postObject">' +

				'<ul class="postObject-inside">' +
				'<ul class="postObject-inside-header">' +
				(savedSettings.useDefaultStyle ? insideActorHTML : '') +
				'<li class="postObject-inside-eventTitle">$EVENT_TITLE</li>' +
				'<li class="postObject-inside-time">' +
				'<ul class="postObject-inside-time-ul">' +
				'<li class="postObject-inside-date">' + eventDateHTML + '</li>' +
				'</ul>' +
				'</li>' +
				'</ul>' +
				'</ul>';

			postObjectHtmlTemplate +=
				'<ul class="postObject-inside-firstLevelContentAttribute">' +
				'<li class="postObject-inside-firstLevelContentAttribute-eventContent">$FIRSTLEVE_CONTENT_ATTRIBUTE</li>' +
				'</ul>' +

				(savedSettings.useDefaultStyle ? insideEmbedded$[0].outerHTML : '') +

				(savedSettings.useDefaultStyle ? insideMain$[0].outerHTML : '') +

				'</ul>' +

				(!savedSettings.useDefaultStyle ? insideEmbedded$[0].outerHTML : '') +

				(!savedSettings.useDefaultStyle ? insideMain$[0].outerHTML : '') +

				'</ul>' +
				'</div>' +
				'</li>';

			(function checkSpecialItemCases() {
				var baseItm = itemToUseContent.originalFeed,
					objectSum = (true === assertChain(baseItm, "object.summary")),
					objectIsPerson = ("person" === baseItm.object.objectType),
					targetIsPerson = (assertChain(baseItm, "object.objectType") && ("person" === baseItm.object.objectType)),

					allFourExisting = baseItm.actor && baseItm.object && baseItm.target && assertChain(baseItm, "object.author");

				if (allFourExisting && objectSum && ("person" !== baseItm.object.objectType) && ("comment" !== baseItm.object.objectType)) {
					nContent = baseItm.object.summary;

					if (objectIsPerson) {
						embeddedActor.id = baseItm.target.author.id;
						embeddedActor.vCard = generateVCard(baseItm.target.author.displayName, baseItm.target.author.id,
							getspecifiedURL(baseItm.target.author.id, "profile"), getspecifiedURL(baseItm.target.author.id, "picture"), true, true, false);
					} else {
						embeddedActor.id = baseItm.object.author.id;
						embeddedActor.vCard = generateVCard(baseItm.object.author.displayName, baseItm.object.author.id,
							getspecifiedURL(baseItm.object.author.id, "profile"), getspecifiedURL(baseItm.object.author.id, "picture"), true, true, false);
					}
				}



				if (allFourExisting && ("comment" === baseItm.object.objectType) && !targetIsPerson) {
					nContent = baseItm.target.summary || "";
					if (assertChain(baseItm, "target.author") && (baseItm.target.author.id !== baseItm.object.author.id)) {
						embeddedActor.id = baseItm.target.author.id;
						embeddedActor.vCard = generateVCard(baseItm.target.author.displayName, baseItm.target.author.id,
							getspecifiedURL(baseItm.target.author.id, "profile"), getspecifiedURL(baseItm.target.author.id, "picture"), true, true, false);
					}
				}

				if (assertChain(baseItm, "actor.id") && assertChain(baseItm, "object.author.id") && (baseItm.actor.id === baseItm.object.author.id) && !(assertChain(baseItm, "target.author"))) {
					embeddedActor.vCard = "";
					embeddedActor.id = 0;
				}

				if (assertChain(baseItm, "actor.id") && assertChain(baseItm, "target.author.id") && (baseItm.target.author.id === baseItm.actor.id)) {
					embeddedActor.vCard = "";
					embeddedActor.id = "";
				}

				if ("todo" === itemToUseContent.mainObject.Type) {
					//embeddedActor.vCard = "";
					//embeddedActor.id = 0;
				}


				if (("question" === itemToUseContent.mainObject.Type) || ("todo" === itemToUseContent.mainObject.Type)) {
					if ((assertChain(itemToUseContent, "mainObject.Actor.ProfileId") && assertChain(itemToUseContent, "mainObject.Author.ProfileId") &&
						itemToUseContent.mainObject.Actor.ProfileId === itemToUseContent.mainObject.Author.ProfileId) || ($(nContent).first().text().length <= 10)) {
						embeddedActor.vCard = "";
						embeddedActor.id = 0;
					}
				}


				if (nFirstLevelContentAttribute === nContent) {
					nFirstLevelContentAttribute = "";
				}
			}
			());


			postObject = replaceIt(postObjectHtmlTemplate, "$TAB_INDEX", lastItemDataRefId.toString());
			postObject = replaceIt(postObject, "$DATA_INDEX", lastItemDataRefId.toString());
			lastItemDataRefId += 1;
			postObject = replaceIt(postObject, "$DATA_TARGETURL", nTargetUrl);
			postObject = replaceIt(postObject, "$DATA_ROLLUPID", nRollUpId);
			postObject = replaceIt(postObject, "$DATA_SAVED", nIsSaved.toString());
			postObject = replaceIt(postObject, "$DATA_LIKED", nIsLiked.toString());
			postObject = replaceIt(postObject, "$DATA_FOLLOWED", nIsFollowed.toString());
			postObject = replaceIt(postObject, "$DATA_ID", nDataId);
			postObject = replaceIt(postObject, "$DATA_DATE", nPublishingDate);
			postObject = replaceIt(postObject, "$DATA_VERB", nVerb);
			postObject = replaceIt(postObject, "$CREATION_DATEFULL", nCreatedFullDate);
			postObject = replaceIt(postObject, "$CREATION_DATEPARSEDFULL", nCreatedDateDisplay);
			postObject = replaceIt(postObject, "$EVENT_CREATEDDATE", nCreatedDateDisplay);

			postObject = replaceIt(postObject, "$EMBEDDED_ACTOR", embeddedActor.vCard);
			postObject = replaceIt(postObject, "$EMBEDDED_CONTENT", embeddedContent);
			postObject = replaceIt(postObject, "$MAIN_ACTOR_VCARD", mainActorVCard);

			tTitleToComp = startsWith(nTitle, "<", 0) ? $($(nTitle)[2]).text() : nTitle;
			CcontentToComp = $("<span/>").append(nContent).text();

			if (tTitleToComp && CcontentToComp && (tTitleToComp === CcontentToComp)) {
				nContent = "";
			}

			postObject = replaceIt(postObject, "$EVENT_TITLE", nTitle);

			postObject = replaceIt(postObject, "$FIRSTLEVE_CONTENT_ATTRIBUTE", nFirstLevelContentAttribute);

			postObject = replaceIt(postObject, "$DATA_OBJECTTYPE", nObjectType);

			if (nContent === "[object Object]") {
				nContent = "";
			}
			postObject = replaceIt(postObject, "$MAIN_CONTENT", nContent);

			toAdd = '<img src="' + itemToUseContent.mainObject.IconUrl + '" alt="' + localizeString("ASWidget-event-from", "Event from $1", nEventOf) + ' ">';
			if (!(itemToUseContent.mainObject.IconUrl && itemToUseContent.mainObject.IconUrl.length && (-1 === itemToUseContent.mainObject.IconUrl.indexOf("thumbnail")))) {
				toAdd = '<i class="fa fa-square" aria-hidden="true" alt="' + localizeString("ASWidget-event-from", "Event from $1", nEventOf) + '"></i>';
			}
			postObject = replaceIt(postObject, "$EVENT_ICON", toAdd);


			if (assertChain(itemToUseContent, "mainObject.attachmentsHTML") && (itemToUseContent.mainObject.Attachments.length) && (itemToUseContent.mainObject.attachmentsHTML.length)) {
				postObject = replaceIt(postObject, "$EVENT_ATTACHMENTS", itemToUseContent.mainObject.attachmentsHTML);
			}

			if (assertChain(itemToUseContent, "targetObject.attachmentsHTML") && (itemToUseContent.targetObject.Attachments.length) && (itemToUseContent.targetObject.attachmentsHTML.length)) {
				postObject = replaceIt(postObject, "$EVENT_ATTACHMENTS", itemToUseContent.targetObject.attachmentsHTML);
			}

			if (-1 !== postObject.indexOf("$EVENT_ATTACHMENTS")) {
				postObject = replaceIt(postObject, "$EVENT_ATTACHMENTS", "");
			}

			expandedObject = {
				originalDataObject: itemToUseContent.originalFeed,
				pregeneratedHTML: postObject,
				Liked: itemToUseContent.bools.IsLiked,
				GrabbedFeedObject: itemToUseContent
			};
			postObject = modifyItem(expandedObject); // Add some needed HTML
			postObject = createActionMenu({
				originalDataObject: itemToUseContent.originalFeed,
				pregeneratedHTML: postObject,
				Liked: itemToUseContent.bools.IsLiked,
				GrabbedFeedObject: itemToUseContent
			});


			(function AddFinalHTMLAttribute() {
				var ind = itemToUseContent.mainObject.ID || 0,
					obj = dataArray[ind];
				if (obj) {
					obj.finalHTML = '<ul class="ASWidgetLightBoxUL">' + postObject + '</ul>';
					dataArray[ind] = obj;
				}
			}()); // Here the final HTML will be stored in an attribute. This is used later on to show content in the lightbox (fallback for the EE)
			return postObject;
		}


		// END generateSingleFeedHTML

		// START getNoAccessNotification
		function getNoAccessNotification() {
			var resultMsg = localizeString("ASWidget-no-access-to-entries", "You do not have permission to access this page."),
				noAccessMsg = '<ul class="ASWidget-NoEntries-Ul"><li class="normalPostEntryItem">' +
					$('<div/>').addClass('container-ASWidgetAlert').append(createAlert(resultMsg, 'danger'))[0].outerHTML + '</li></ul>';
			return noAccessMsg;
		}




		// END getNoAccessNotification

		// START getCustomNotification
		function getCustomNotification(customMsg) {
			var resultMsg = customMsg,
				customMsgT = '<ul class="ASWidget-customMsg-Ul"><li class="normalPostEntryItem">' +
					$('<div/>').addClass('container-ASWidgetAlert').append(createAlert(resultMsg, 'danger'))[0].outerHTML + '</li></ul>';
			return customMsgT;
		}


		// END getCustomNotification

		// START getNoEntriesNotification
		function getNoEntriesNotification() {
			var resultMsg = searchModeActivated.state ? localizeString("ASWidget-no-search-entries-found", "No entries found with your search parameter $1.", searchModeActivated.query) : localizeString("ASWidget-no-entries-found", "There are no updates to display."),
				nothingToDisplay$ = $('<ul/>').addClass('ASWidget-NoContent-Ul')
					.append(
						$('<li/>').addClass('normalPostEntryItem')
							.append($('<div/>').addClass('container-ASWidgetAlert')
								.append($('<div/>').addClass('alert').text(resultMsg)))
					);
			return nothingToDisplay$[0].outerHTML;
		}


		// END getNoEntriesNotification

		// START generateHTMLItems
		/**
		 * [generateHTMLItems Main function to generate all HTML items]
		 * @param  {[json object]} data [a json object (SBT activitystream feed)]
		 * @return {[string]}      [All items as string. (Every element is a separate <li> element.)]
		 */
		function generateHTMLItems(items, data) {
			var deferredArr = [],
				j;
			jContainer.find(".ASWidget-NoContent-Ul").remove();

			if (undefined === data) {
				return false;
			}

			// START addShowMoreBtnIfNeeded
			function addShowMoreBtnIfNeeded(mainObj$) {
				var toaddTo$ = mainObj$.clone(),
					heightContainer$ = $('<div class="ASWidget-All-Items" style="position:absolute;top: -99999px; left: -99999px;"></div>').append(toaddTo$),
					height,
					postDiv$,
					showMore,
					maxHeight = FIXED_HEIGHT;

				jContainer.append(heightContainer$);
				height = heightContainer$.innerHeight();

				if (height >= (maxHeight - 42)) {
					postDiv$ = mainObj$.find(".activityStreamNewsItemContainer.ActivityStreamWidgetPost").data("fullheight", height);
					postDiv$.css({
						"max-height": (maxHeight + "px"),
						"overflow": "hidden"
					});

					showMore = savedSettings.useDefaultStyle ? $('<div/>').addClass('postExpandClass').append(
						$('<button>').attr('type', 'button')
							.addClass('btn btn-default btn-xs').text(localizeString("ASWidget-post-show-more", "Show more"))) :

						$('<div/>').addClass('postExpandClass')
							.append($('<span/>').addClass('oM-showMoreDots').text('...'),
								$('<a/>').addClass('postExpandClass oM-expandItem').text(localizeString("ASWidget-post-show-more", "Show more")));
					postDiv$.parents(".normalPostEntryItem").append(showMore);
				}
				heightContainer$.remove();
			}


			// END addShowMoreBtnIfNeeded

			j = 0;
			$.each(data, function(ignore, el) {
				var mainObj$;
				deferredArr[j] = new $.Deferred();
				el.j = j;
				grabFeedContent(el, function callback(gFeedObj) {
					dataArray[el.id].GrabbedFeedObject = gFeedObj;

					mainObj$ = $(generateSingleFeedHTML(gFeedObj));
					addShowMoreBtnIfNeeded(mainObj$);
					items[el.j] = mainObj$.get(0).outerHTML;
					deferredArr[el.j].resolve(items);
				});
				j += 1;
			});
			return deferredArr;
		}


		// END generateHTMLItems

		// START getRelationObject
		/**
		 * [getRelationObject This method is used to get the data object for a specific html item that has been clicked. dataArray is the array which contains all the json feed objects.]
		 * @param  {[dom object]} eventObjectToSearchIn [The dom element to search in. It has to contain a div with a data-index attribute.]
		 * @return {[json object]}                       [The specific json object for the dom element]
		 */
		function getRelationObject(eventObjectToSearchIn, loadNew) {
			var index = $(eventObjectToSearchIn.target).parents(".ActivityStreamWidgetPost").first().data().id || 0,
				itemToReturn = dataArray[index];

			if (!itemToReturn.GrabbedFeedObject || loadNew) {
				grabFeedContent(itemToReturn, function(result) {
					itemToReturn.GrabbedFeedObject = result;
					dataArray[index] = itemToReturn;
				});
			}
			return itemToReturn;
		}


		// END getRelationObject

		// START showEEFunc
		/**
		 * [showEEFunc Function to show item content in the embedded experience or lightbox.]
		 * @param  {[json object]} dataItem [A json object]
		 */
		function showEEFunc(dataItem, originalEvent) {
			var parsedContent = dataItem.GrabbedFeedObject,
				isCreatedBlog = ("community" === parsedContent.targetObject.Type),
				currTarget$ = $(originalEvent.currentTarget),
				itemToDisplay$ = currTarget$.hasClass('normalPostEntryItem') ? currTarget$.clone(true) : currTarget$.parents('.normalPostEntryItem').clone(true);

			/*

			                if ("file" === dataItem.GrabbedFeedObject.mainObject.Type || "file" === dataItem.GrabbedFeedObject.targetObject.Type) {
			                    var targetEl = $(domObject).find(".ASWidgetCommentAttachmentfileName").first(),
			                        imageUrl = assertChain(dataItem, "object.url") ? dataItem.object.url : "";
			                    if (assertChain(targetEl, "length")) {
			                        targetEl[0].click();
			                    } else {
			                        if (imageUrl.length) {
			                            W.location = imageUrl;
			                        }
			                    }

			                    return false;
			                }
			                */

			// START showBlogEntry
			function showBlogEntry() {
				var blogData,
					blogUuid,
					entryName,
					atom$ = $(dataItem.xcc.atom).find("entry").first(),
					targetUrl = atom$.find("link[rel=self]").attr("href"),
					targetTitle = parsedContent.mainObject.Title,
					firstPart = targetUrl ? (targetUrl.split("/page/")[0] || "") : "";
				if (atom$ && (0 !== atom$.length)) {

					if (X.S.mobile) {

						blogData = dataItem.object.url.split("/blogs/")[1];
						blogUuid = blogData.split("/entry/")[0];
						entryName = blogData.split("/entry/")[1].split("#")[0];
						W.location = X.SCP.B.getBlogsSingleEntry(blogUuid, entryName);
					} else {

						if (!isCreatedBlog) {

							if (firstPart.length && (-1 !== firstPart.indexOf("wiki"))) {
								X.EE.showWikiEntry({
									tn: atom$,
									wikiFeed: dataItem.xcc.atom,
									entry: atom$,
									post: {
										commLink: targetUrl,
										commTitle: targetTitle
									}
								});
							} else {
								X.EE.showBlogEntry({
									tn: atom$,
									entry: atom$,
									post: {
										commLink: targetUrl,
										commTitle: targetTitle
									}
								});
							}

						}

					}

				}

			}


			// END showBlogEntry

			// END showIt
			function showIt() {
				showBlogEntry();
			}


			// END showIt

			if (("Blogs" === parsedContent.eventOfType || "Wikis" === parsedContent.eventOfType) && (!isCreatedBlog)) {
				dataItem.xcc = dataItem.xcc || {};


				if (!dataItem.xcc.atom) {
					$.ajax({
						url: dataItem.openSocial.embed.context.connectionsContentUrl,
						cache: false
					}).done(function(atom) {
						dataItem.xcc.atom = atom;
						showIt();
					}).fail(function(xhr, ignore, thrownError) {
						if (404 === xhr.status) {
							X.T.notifyError('Cannot open the item: ' + thrownError, titleError);
						}
					});
				}
				showIt();
			} else {
				// CUSTOM EMBEDDED EXPERIENCE ENTRY SHOWING
				itemToDisplay$ = $('<div/>').addClass('ASWidget-CustomEE').attr('rel', (savedSettings.useDefaultStyle ? 'default' : 'orientme')).append(itemToDisplay$);
				if (savedSettings.useDefaultStyle) {
					itemToDisplay$.find('.ActivityStreamWidgetActions').remove();
				} else {
					itemToDisplay$.find('.oM-actionDiv li:not(.oM-entryItem-CommentToggleWrapper):not(.oM-entryItem-Commentwrapper)').remove();
				}

				itemToDisplay$.find('.normalPostEntryItemexpand').remove();
				X.EE.show($("#xccMain"), null, parsedContent.mainObject.Title, itemToDisplay$);
			}
			return false;
		}


		// END showEEFunc

		// START showEEFunc

		// START postComment
		/**
		 * [postComment Post a comment for an event.]
		 * @param  {[string]} commentText [The comment text.]
		 * @param  {[string]} rollUpID    [The json rollUpId]
		 */
		function postComment(commentText, rollUpID, callback) {

			$.ajax({
				url: X.T.getRootPath("WidgetsContainer", false) + "/basic/rest/ublog/@all/@all/" + rollUpID + "/comments",
				method: "POST",
				dataType: 'json',
				contentType: "application/json; charset=UTF-8",
				data: JSON.stringify({
					content: commentText
				})
			}).always(function(xhr, ignore, thrownMessage) {
				if ($.isFunction(callback)) {
					callback.call(this, xhr, (200 === thrownMessage.status));
				}
			});
		}


		// END postComment

		// START rePostEvent
		/**
		 * [rePostEvent Function to repost an event.]
		 * @param  {[string]} eventID [The event ID]
		 */
		function rePostEvent(eventID, callback) {
			$.ajax({
				headers: {
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
				},
				url: X.T.getRootPath("WidgetsContainer", false) + "/basic/rest" + ASFilters.AllForMe,
				method: "POST",
				dataType: 'json',
				contentType: "application/json; charset=UTF-8",
				data: JSON.stringify({
					verb: 'bump',
					id: eventID
				})
			}).always(function(xhr, ignore, thrownMessage) {
				if ($.isFunction(callback)) {
					callback.call(this, (200 === thrownMessage.status));
				}
			});
		}


		// END rePostEvent

		// START clearDataList
		function clearDataList() {
			lastItemDataRefId = 0;
			dataArray = [];
		}


		// END clearDataList

		// START toggleLikeEvent
		/**
		 * [toggleLikeEvent Function to like an event.]
		 * @param  {[string]} eventID     [The event ID]
		 * @param  {[string]} rollUpID    [The rollup ID]
		 * @param  {[boolean]} BooleanLike [The boolean whether to like it or not.]
		 */
		function toggleLikeEvent(eventID, rollUpID, BooleanLike, callback) {
			$.ajax({
				headers: {
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
				},
				url: X.T.getRootPath("WidgetsContainer", false) + "/basic/rest/ublog/@all/@all/" + rollUpID + "/likes/" + eventID,
				method: (BooleanLike ? "POST" : "DELETE"),
				contentType: (BooleanLike ? "application/json" : "application/x-www-form-urlencoded")
			}).always(function(xhr, ignore, thrownMessage) {
				if ($.isFunction(callback)) {
					callback.call(this, (200 === thrownMessage.status));
				}
			});
		}


		// END toggleLikeEvent

		// START getActivityStreamEntries
		/**
		 * [getActivityStreamEntries Main function to load all activitystream entries.]

		 * @param  {[ActivityStreamType]} activityStreamType  [An activitystreamtype that has been set at the beginning (for instance ActivityStreamType.CommunityActivityStream).]
		 * @param  {[string]} asFilterURLPart     [description]
		 * @param  {[string]} queryParam          [A search query parameter.]
		 * @param  {[string]} showBeforeTimeStamp [A timestamp to load items that have been created before the timestamp. (Only for the show more button)]
		 * @param  {[function]} callback         [A callback function]
		 */
		function getActivityStreamEntries(activityStreamType, asFilterURLPart, queryParam, showBeforeTimeStamp, pScrollToBottom) {
			var targetURL = X.T.getRootPath("WidgetsContainer", false) + "/basic/rest" + asFilterURLPart + "?shortStrings=true&rollup=true",
				oldObj = searchModeActivated;

			scrollToBottom = pScrollToBottom;

			currentActivityStreamType = activityStreamType; // For refreshing, we have to know which stream type is relevant

			if (isCommunityMode()) {
				targetURL = targetURL.replace("$COMID", currentAccess.widgetCommunityUuid);
			} // If we have a community set in the Widget Editor


			searchModeActivated = {
				state: (assertChain(queryParam, "length") && (queryParam.length > 0)),
				query: queryParam || "",
				timeStamp: showBeforeTimeStamp
			};

			if (oldObj.timeStamp && (oldObj.timeStamp.length > 0)) {
				lastLoadedStreamURLPart = replaceIt(lastLoadedStreamURLPart, "&updatedBefore=" + oldObj.timeStamp, "");
			}

			if (searchModeActivated.state) {
				clearDataList();
				if (lastLoadedStreamURLPart.indexOf("query=") !== -1) {
					lastLoadedStreamURLPart = replaceIt(lastLoadedStreamURLPart, "&query=" + oldObj.query, "");
				}
				targetURL = lastLoadedStreamURLPart + "&query=" + searchModeActivated.query;
			} else {
				if (searchModeActivated.timeStamp && (searchModeActivated.timeStamp.length > 2)) {
					targetURL += '&updatedBefore=' + searchModeActivated.timeStamp;
				} // For the show more button
			}
			lastLoadedStreamURLPart = targetURL; // For refreshing
			lastLoadedFeedType = asFilterURLPart; // For refreshing
			doRequest(targetURL); // Load requests
		}


		// END getActivityStreamEntries

		// START clearPostingArea
		function clearPostingArea() {
			shareTextBox$.val("");
			shareTextBox$.trigger("focus").trigger("change");

			jContainer.find('.ASWidgetUploadNewFileDiv')
				.find('.ASWidgetUploadNewFileName').removeClass("fa fa-file")
				.end().find('.ASWidgetCurrentSelectedFileName').text('');

			fileToUploadFromDialog = undefined;
			fileToUploadFromDialogCallback = undefined;
		}


		// END clearPostingArea

		// START addMemberToCommunity
		function addMemberToCommunity(isPublic, communityUuid, profileId, joiningText, addMemberToComCallback) {
			var joinRequest = '',
				requestToJoinWithText = '';
			if (isPublic) {
				joinRequest = '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:app="http://www.w3.org/2007/app" ' +
					'xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/" xmlns:snx="http://www.ibm.com/xmlns/prod/sn">    ' +
					'<contributor> <email>' + ownProfile.ownEmail + '</email> ' +
					'<snx:userid xmlns:snx="http://www.ibm.com/xmlns/prod/sn">' + ownProfile.ownUserId + '</snx:userid>' +
					'<snx:userState xmlns:snx="http://www.ibm.com/xmlns/prod/sn">active</snx:userState>' +
					'<snx:isExternal xmlns:snx="http://www.ibm.com/xmlns/prod/sn">false</snx:isExternal><name>' + ownProfile.getName() + '</name>' +
					'</contributor> <snx:role xmlns:snx="http://www.ibm.com/xmlns/prod/sn" ' +
					'component="http://www.ibm.com/xmlns/prod/sn/communities">member</snx:role> ' +
					'<category term="person" scheme="http://www.ibm.com/xmlns/prod/sn/type">    </category>    ' +
					'<snx:orgId xmlns:snx="http://www.ibm.com/xmlns/prod/sn">a</snx:orgId>  </entry>';
				if ((!communityUuid || !profileId) && $.isFunction(addMemberToComCallback)) {
					addMemberToComCallback.call(this, "error", -1);
				}
				$.ajax({
					url: X.T.getRootPath("Communities", false) + "/service/atom/community/members?communityUuid=" + communityUuid,
					method: "POST",
					contentType: "application/atom+xml",
					data: joinRequest
				}).always(function(xhr, ignore, thrownMessage) {
					if ((201 === thrownMessage.status) && (profileId === ownProfile.ownUserId) && (communityUuid === savedSettings.communityUuid)) {
						currentAccess.isMember = true;
					}
					if ($.isFunction(addMemberToComCallback)) {
						addMemberToComCallback.call(this, thrownMessage.responseText, (201 === thrownMessage.status));
					}
				});
			} else {
				requestToJoinWithText = '<?xml version="1.0" encoding="UTF-8"?>' +
					'<entry xmlns:thr="http://purl.org/syndication/thread/1.0" xmlns="http://www.w3.org/2005/Atom" xmlns:snx="http://www.ibm.com/xmlns/prod/sn">' +
					'<title type="text">ignored</title><content type="html">' + joiningText + '</content><contributor> ' +
					'<email>' + ownProfile.ownEmail + '</email></contributor></entry>';

				$.ajax({
					url: X.T.getRootPath("Communities", false) + "/service/atom/community/requestsToJoin?communityUuid=" + communityUuid,
					method: "POST",
					contentType: "application/atom+xml",
					data: requestToJoinWithText
				}).always(function(xhr, ignore, thrownMessage) {
					if ($.isFunction(addMemberToComCallback)) {
						addMemberToComCallback.call(this, thrownMessage.responseText, (201 === thrownMessage.status));
					}
				});

			}
		}


		// END addMemberToCommunity

		// START getCommunityFeed
		function getCommunityFeed(communityUuid, getCommunityFeedCalback) {
			if (!communityUuid && $.isFunction(getCommunityFeedCalback)) {
				getCommunityFeedCalback.call(this, "nocommunityUuid", -1);
			}
			$.ajax({
				url: X.T.getRootPath("Communities", false) + "/service/atom/community/instance?communityUuid=" + communityUuid,
				method: "GET",
				contentType: "application/atom+xml"
			}).always(function(xhr, ignore, thrownMessage) {
				if ($.isFunction(getCommunityFeedCalback)) {
					getCommunityFeedCalback.call(this, thrownMessage.responseText, (200 === thrownMessage.status));
				}
			});
		}


		// END getCommunityFeed

		// START getCommunityRestrictions
		function getCommunityRestrictions(communityUuid, getCommunityRestrictionsCalback) {
			getCommunityFeed(communityUuid, function(data, pRequestOk) {
				var state = "request_error";
				if (pRequestOk) {
					state = $($(data).get(2)).find("snx\\:communitytype,communitytype").text() || "";
				}
				if ($.isFunction(getCommunityRestrictionsCalback)) {
					getCommunityRestrictionsCalback.call(this, state);
				}
			});
		}


		// END getCommunityRestrictions


		// START checkIfUserisCommunityMember
		function checkIfUserisCommunityMember(communityUuid, userId, checkIfIsMemberOfComCallback) {
			if (!communityUuid || !userId) {
				if ($.isFunction(checkIfIsMemberOfComCallback)) {
					checkIfIsMemberOfComCallback.call(this, false);
				}
			}
			$.ajax({
				url: X.T.getRootPath("Communities", false) + "/service/atom/community/members?communityUuid=" + communityUuid + "&userid=" + userId,
				method: "GET",
				contentType: "application/x-www-form-urlencoded",
				cache: false
			}).always(function(xhr, ignore, thrownMessage) {
				if ($.isFunction(checkIfIsMemberOfComCallback)) {
					checkIfIsMemberOfComCallback.call(this, (200 === thrownMessage.status));
				}
			});
		}


		// END checkIfUserisCommunityMember

		// START checkEvent
		function checkEvent(pEvent) {
			if ($.isFunction(pEvent.stopPropagation)) {
				pEvent.stopPropagation();
			}
			if ($(pEvent.target).is('a')) {
				pEvent.preventDefault();
			}
		}


		// END checkEvent

		// START bindLikeCommentEvents
		function bindLikeCommentEvents() {
			jContainer.find(".LikeComment").unbind("click").on("click", function(event) {
				var this$,
					dataObject,
					eventID,
					rollUpID,
					newLikedState,
					likeObject$,
					oldLikeCount,
					newLikeCount;

				checkEvent(event);

				this$ = $(event.currentTarget);
				dataObject = $(event.target).parents(".ASWidget-Comment").first();
				eventID = dataObject.attr("eventid") || "0";
				rollUpID = dataObject.attr("commentid") || "0";
				newLikedState = !("true" === dataObject.attr("liked"));
				likeObject$ = savedSettings.useDefaultStyle ?
					this$.parents("[aria-label=ASWidgetCommentActionDiv]").first().find(".ASWidgetCurrentCommentLikes") :
					this$.parents('.ASWidget-Comment-Inside-Author').find('.ASWidgetCurrentPostLikes');

				oldLikeCount = parseInt(likeObject$.text());

				toggleLikeEvent(eventID, rollUpID, newLikedState, function(successfully) {
					if (!successfully) {
						X.T.notifyError((newLikedState ? localizeString("ASWidget-like-comment-fail", 'Liking the comment has failed [request error]') : localizeString("ASWidget-unlike-comment-fail", "Unliking the comment has failed [request error]")), titleError);
						return false;
					}

					if (newLikedState) {
						likeObject$.text(oldLikeCount + 1);
					} else {
						newLikeCount = (oldLikeCount > 0 ? oldLikeCount - 1 : 0);
						likeObject$.text(newLikeCount.toString());
					}

					if (savedSettings.useDefaultStyle) {
						this$.text(newLikedState ? localizeString("ASWidget-streamitems-comment-unlike-btn", "Unlike") : localizeString("ASWidget-streamitems-comment-like-btn", "Like"));
					} else {
						likeObject$.parents('.ASWidget-Comment-Inside-Author')
							.find('i')
							.removeAttr('class')
							.addClass((0 === newLikeCount || !newLikedState) ? 'fa fa-heart-o' : 'fa fa-heart');
					}

					dataObject.attr("liked", newLikedState.toString());
					return true;
				});
				return false;
			});
		}


		// END bindLikeCommentEvents

		// START stopFollowing
		function stopFollowing(eventID, callback) {
			var callTheCallBack = function callBackTrigger(pSuccess, hasEntries) {
				if ($.isFunction(callback)) {
					callback.call(this, pSuccess, hasEntries);
				}
			};
			$.ajax({
				url: getWindowLocation() + "/homepage/web/doFetchFollowingData.action?storyId=" + eventID,
				method: "GET",
				contentType: "application/x-www-form-urlencoded"
			}).done(function(data) {
				if (!data.length) {
					callTheCallBack(true, false);
					return false;
				}
				if (data && data.length) {
					$.ajax({
						url: getWindowLocation() + "/homepage/web/doUnfollowResources.action",
						method: "POST",
						contentType: "application/json",
						dataType: 'json',
						data: JSON.stringify(data)
					}).always(function(xhr, ignore, thrownMessage) {
						callTheCallBack((200 === thrownMessage.status), true);
					});
				}
				return true;
			}).fail(function(xhr, ignore) {
				if (404 === xhr.status) {
					callTheCallBack(false, true);
				}
			});
		}


		// END stopFollowing

		// START checkWhichNavigationToDisplay
		/**
		 * [checkWhichNavigationToDisplay If one clicks on "Status Updates" different navigation points have to be displayed.]
		 */
		function checkWhichNavigationToDisplay() {
			var nonStatusUpdates$ = jContainer.find(".ASWidgetActionDropdown li:not(.ASWidgetStatusUpdatesNaviPoint)"),
				statusUpdates$ = jContainer.find(".ASWidgetActionDropdown li.ASWidgetStatusUpdatesNaviPoint");
			if (jContainer.find(".ASWidgetstatusUpdates.active").length) {

				if (!isCommunityMode()) {
					nonStatusUpdates$.hide();
					statusUpdates$.show();
				} else {
					statusUpdates$.hide();
				}
			} else {
				nonStatusUpdates$.show();
				statusUpdates$.hide();
			}
		}


		// END checkWhichNavigationToDisplay

		// START setSelectedFilter
		function setSelectedFilter(th) {
			jContainer.find(".ASWidgetLeftNaviPart li.active").removeClass("active");
			$(th).addClass("active");
			checkWhichNavigationToDisplay();
		}


		// END setSelectedFilter

		/**
		 * [registerItemEvents All item specific events are registered here. Item events for all <li> elements within the .streamItems unordered list.]
		 */

		// START getShareBoxDiv$
		function getShareBoxDiv$(useDefault) {
			return $('<div/>').addClass('ASWidgetShareSomethingDiv').append(
				$('<span/>').addClass('ASWidgetShareSomething').text(useDefault ? localizeString('ASWidget-header-sharesomething', 'Share Something: update your status or upload a file.') : '')
			);
		}


		// END getShareBoxDiv$


		// START getShareDivWrapper$
		function getShareDivWrapper$() {
			return $('<div/>').addClass('form-group shareDiv').append(
				$('<textarea/>').addClass('form-control ASWidgetshareBoxInput')
					.attr('placeholder', localizeString("ASWidget-share-sharebox-placeholder", "What do you want to share?"))
			);
		}


		// END getShareDivWrapper$

		// START getActionDiv$
		function getActionDiv$(useDefault) {
			var postBtn$ = $('<a/>').addClass('oM-ASWidgetPostNewEntry oM-Button-active').text(localizeString("ASWidget-share-postnewentrybtn", "Post")),
				clearBtn$ = $('<a/>').addClass('oM-ASWidgetClearNewEntry oM-Button-default').text(localizeString("ASWidget-share-clearnewentrycontentbtn", "Clear")),

				addFileBtn$ = $('<div/>')
					.addClass('oM-Button-default btn-fileupload')
					.text(localizeString("ASWidget-share-addFile", "Add a File"))
					.append($('<input/>').addClass('oM-fileUploadInput').attr('name', 'file').attr('type', 'file').attr('maxlength', 100000)),
				deleteFileBtn$ = $('<a/>').addClass('oM-deleteAttachment oM-Button-default').append($('<i/>').addClass('fa fa-times')).hide(),

				fileNameInfo$ = $('<span/>')
					.addClass('oM-ASWidgetCurrentSelectedFile')
					.append($('<img/>').addClass('oM-attachmentIcon lconnSprite lconnSprite-iconAttachment16 ' + (X.L.isRTL ? 'icon-mirrored' : '')),
						$('<span/>').addClass('oM-attachmentFileName').hide()),

				actionDiv = '<div class="ASWidgetHeaderActionDiv"><ul class="ASWidgetHeaderActionUL"><li class="ASWidgetLeftPostandClear"><div class="btn-group btn-group-sm" role="group" aria-label="PostAndClear">' +
					'<button type="button" class="btn btn-success ASWidgetPostNewEntry">' + localizeString("ASWidget-share-postnewentrybtn", "Post") + '</button>' +
					'<button type="button" class="btn btn-default ASWidgetClearNewEntry">' + localizeString("ASWidget-share-clearnewentrycontentbtn", "Clear") +
					'</button></div>  </li><li class="ASWidgetRightPostandClear">' +
					'<div class="btn-group btn-group-sm ASWidgetUploadNewFileDiv" role="group" aria-label="ASWidgetUploadNewFileArea">' +

					'<span class="btn btn-block btn-primary btn-fileupload"><i class="fa fa-upload"></i><span>' + localizeString("ASWidget-share-selectfile", "Select file") + '</span>' +
					'<input type="file" name="file" maxlength="100000"><i class="ASWidgetUploadNewFileName"></i><span class="ASWidgetCurrentSelectedFileName"></span></span></div>' +
					'<button type="button" disabled class="btn btn-default ASWidgetShareboxPositiveCount">999</button>  </li></ul></div>';

			addFileBtn$.find('.oM-Button-default').click(function(e) {
				$(e.currentTarget).find('input[type=file]').trigger('click');
			});

			if (!useDefault) {
				actionDiv = $('<div/>')
					.addClass('oM-ASWidgetHeaderActionDiv ASWidgetHeaderActionDiv')
					.append($('<ul/>').addClass('oM-ASWidgetHeaderActionUL ASWidgetHeaderActionUL')
						.append($('<li/>').addClass('actionItem oM-ASWidgetPost ASWidgetPostNewEntry').append(postBtn$))
						.append($('<li/>').addClass('actionItem oM-ASWidgetClear ASWidgetClearNewEntry').append(clearBtn$))
						.append($('<li/>').addClass('actionItem oM-ASWidgetAddFile btn-fileupload').append(addFileBtn$, fileNameInfo$, deleteFileBtn$))
					);
			}
			return useDefault ? $(actionDiv) : actionDiv;
		}


		// END getActionDiv$

		// START getStreamHeaderHTML
		function getStreamHeaderHTML() {
			var joinCommunity$ = $('<div/>').addClass('ASWidget-Join-Community-Div').append($('<button/>').attr('type', 'button').attr('rel', 'sendjoin').addClass('ASWidgetCnxBtn ASWidgetjoinCommunityBtn')),
				shareSomething$,
				streamHeader,
				isCommunityModeAndNotMember = isCommunityMode() && !currentAccess.isMember,
				shareAllowed = !isCommunityModeAndNotMember;

			if (isCommunityModeAndNotMember) {
				if (currentAccess.canSendJoinRequest) {
					joinCommunity$.find('.ASWidgetjoinCommunityBtn').text(localizeString("ASWidget-join-community-text", "Join this community to post a message."));
				} else {
					joinCommunity$.find('.ASWidgetjoinCommunityBtn')
						.remove().end()
						.append($(createAlert(localizeString("ASWidget-join-community-private", "The selected community is private. Please ask a community owner to add you."), 'info')));
					currentAccess.noSearch = true; // it does not make sense to search in an empty stream
				}
			}
			if (!savedSettings.showJoinComBtn) {
				joinCommunity$.hide();
			}

			shareSomething$ = (savedSettings.showShareBox && shareAllowed) ? getShareBoxDiv$(savedSettings.useDefaultStyle) : $('<p style="display:none !important;"></p>');

			streamHeader = ((isCommunityMode() && !currentAccess.isMember) ? joinCommunity$[0].outerHTML : shareSomething$.append(shareArea$)[0].outerHTML) +
				'<div class="ASWidgetAlertMainDiv"></div>';

			shareArea$ = (savedSettings.showShareBox && shareAllowed) ? $('<div class="ASWidgetWrappedDiv">' +
				getShareDivWrapper$()[0].outerHTML +
				getActionDiv$(savedSettings.useDefaultStyle)[0].outerHTML +
				'</div>') : $('<p style="display:none !important;"></p>');

			if (savedSettings.showNavigation) {
				streamHeader += '<nav class="ASWidgetMainNavi navbar navbar-default">  <div class="container-fluid">' +
					'    <!-- Brand and toggle get grouped for better mobile display -->   <!-- Collect the nav links, forms, and other content for toggling -->    ' +
					'<div class="" id="bs-example-navbar-collapse-1">    <ul class="ASWidgetLeftNaviPart nav navbar-nav"' + (savedSettings.useDefaultStyle ? '' : 'rel="orientme"') + '> ';

				(function checkIfCommunityHeaderGenerate() {
					if (!isCommunityMode()) {
						streamHeader += '<li class="ASWidgetImFollowing oM-mainNaviItem active"><a href="javascript:;">' + localizeString("ASWidget-navigation-imfollowing", "I'm Following") + '<span class="sr-only">(current)</span></a></li> ' +
							'<li class="ASWidgetstatusUpdates oM-mainNaviItem"><a href="javascript:;">' + localizeString("ASWidget-navigation-statusupdates", "Status Updates") + '</a></li>' +
							'<li class="ASWidgetdiscover oM-mainNaviItem"><a href="javascript:;">' + localizeString("ASWidget-navigation-discover", "Discover") + '</a></li>';

					} else {
						streamHeader += '<li class="ASWidgetImFollowing oM-mainNaviItem active"><a href="javascript:;">' + localizeString("ASWidget-navigation-all", "All") + ' <span class="sr-only">(current)</span></a></li> ' +
							'<li class="ASWidgetstatusUpdates oM-mainNaviItem"><a href="javascript:;">' + localizeString("ASWidget-navigation-statusupdates", "Status Updates") + '</a></li>';
					}
				}
				());

				streamHeader += '</ul>  <ul class="ASWidgetRightNaviPart nav navbar-nav navbar-right"> ' +
					(currentAccess.noSearch ? '' : '<li class="ASWidgetSearchOpen"><a href="javascript:;"><i class="fa fa-search" aria-hidden="true"></i></a></li>') +
					'<li class="ASWidgetRefresh"><a href="javascript:;"><i class="fa fa-refresh" aria-hidden="true"></i></a></li>' +
					'<li class="dropdown">  <a href="javascript:;" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">' +
					localizeString("ASWidget-navigation-dropdown-all", "All") + '<span class="caret"></span></a> <ul class="ASWidgetActionDropdown dropdown-menu">' +
					'<li class="ASWidgetFilterAll"><a href="javascript:;">' +
					localizeString("ASWidget-navigation-dropdown-all", "All") + '</a></li>   ' +
					'<li role="separator" class="divider"></li>' +
					'<li class="ASWidgetStatusUpdatesNaviPoint ASWidgetFilterStatusUpdatesAll"><a href="javascript:;">' +
					localizeString("ASWidget-navigation-dropdown-statusupdatesall", "All") + '</a></li>' +

					'<li class="ASWidgetStatusUpdatesNaviPoint ASWidgetFilterStatusUpdatesMyNetworkAndPeople"><a href="javascript:;">' +
					localizeString("ASWidget-navigation-dropdown-mynetworkandpeopleifollowcommunities", "My Network and People I Follow") + '</a></li>' +

					'<li class="ASWidgetStatusUpdatesNaviPoint ASWidgetFilterStatusUpdatesMyNetwork"><a href="javascript:;">' +
					localizeString("ASWidget-navigation-dropdown-mynetworkcommunities", "My Network") + '</a></li>' +
					'<li class="ASWidgetStatusUpdatesNaviPoint ASWidgetFilterStatusUpdatesPeopleIFollow"><a href="javascript:;">' +
					localizeString("ASWidget-navigation-dropdown-peopleifollowcommunities", "People I Follow") + '</a></li>' +
					'<li class="ASWidgetStatusUpdatesNaviPoint ASWidgetFilterStatusUpdatesMyUpdates"><a href="javascript:;">' +
					localizeString("ASWidget-navigation-dropdown-myupdatescommunities", "My Updates") + '</a></li>' +
					'<li class="ASWidgetStatusUpdatesNaviPoint ASWidgetFilterStatusUpdatesCommunities"><a href="javascript:;">' +
					localizeString("ASWidget-navigation-dropdown-statusupdatescommunities", "Communities") + '</a></li>' +

					'<li class="ASWidgetFilterStatusUpdates"><a href="javascript:;">' + localizeString("ASWidget-navigation-dropdown-statusupdates", "Status Updates") +
					'</a></li>  <li class="ASWidgetFilterActivities"><a href="javascript:;">' + localizeString("ASWidget-navigation-dropdown-activities", "Activities") +
					'</a></li>  ' + '<li class="ASWidgetFilterBlogs"><a href="javascript:;">' + localizeString("ASWidget-navigation-dropdown-blogs", "Blogs") +
					'</a></li>  <li class="ASWidgetFilterBookmarks"><a href="javascript:;">' + localizeString("ASWidget-navigation-dropdown-bookmarks", "Bookmarks") +
					'</a></li>  <li class="ASWidgetFilterCommunities"><a href="javascript:;">' + localizeString("ASWidget-navigation-dropdown-communities", "Communities") +
					'</a></li><li class="ASWidgetFilterFiles"><a href="javascript:;">' + localizeString("ASWidget-navigation-dropdown-files", "Files") + '</a></li>' +
					'<li class="ASWidgetFilterForums"><a href="javascript:;">' + localizeString("ASWidget-navigation-dropdown-forums", "Forums") +
					'</a></li><li class="ASWidgetFilterPeople"><a href="javascript:;">' + (X.S.cloud ? localizeString("ASWidget-navigation-dropdown-people", "People") : localizeString("ASWidget-navigation-dropdown-profiles", "Profiles")) +
					'</a></li><li class="ASWidgetFilterWikis"><a href="javascript:;">' + localizeString("ASWidget-navigation-dropdown-wikis", "Wikis") +
					'</a></li><li class="ASWidgetFilterTags"><a href="javascript:;">' + localizeString("ASWidget-navigation-dropdown-tags", "Tags") + '</a></li> </ul> </li> </ul> ' +
					'</div><!-- /.navbar-collapse -->  ' +

					' <div class="form-group ASWidgetSearchStreamDiv">    <input type="text" class="form-control searchInputBox" placeholder="' +
					localizeString("ASWidget-streamitems-searchstreamplaceholder", "Search this stream") + '"> <i class="fa fa-search searchStreamReq" aria-hidden="true"></i>  </div>' +
					'</div>' +
					'<!-- /.container-fluid --></nav>';
			}
			return streamHeader;
		}


		// END getStreamHeaderHTML

		// START toggleSearchField
		function toggleSearchField() {
			var searchStreamDiv = jContainer.find(".ASWidgetSearchStreamDiv");
			searchStreamDiv.toggle();
			jContainer.find(".streamItems").css("margin-top", ((searchStreamDiv).is(":visible")) ? "70px" : "12px");
		}


		// END toggleSearchField

		// START mainRendering
		function mainRendering(itemsToRender, entriesExistingBool) {
			var heightContainer$ = $('<div class="ASWidget-All-Items" style="position:absolute;top: -99999px; left: -99999px;"></div>').append($(getStreamHeaderHTML())),
				searchOpened = jContainer.find(".ASWidgetSearchStreamDiv").is(":visible"),
				toSubtract,
				newSize,
				HTMLTORENDER;
			jContainer.append(heightContainer$);

			toSubtract = heightContainer$.height();
			newSize = widgetData.height.replace(/\D/g, "") - toSubtract - 125; // ESD-25: -125 different margins result in a different container height
			HTMLTORENDER = '<div class="maindiv" ' + (savedSettings.useDefaultStyle ? '' : 'rel="orientme"') + '>' +
				' <div class="stream">' + getStreamHeaderHTML() +
				'<ul class="streamItems streamItemsUL" ' + ("auto" !== widgetData.height ? ' style="max-height: ' + newSize + 'px; height: ' + newSize + 'px;"' : "") + '>' + itemsToRender + ' <ul></div></div>';

			jContainer.html(HTMLTORENDER);

			if (400 < jContainer.width()) {
				jContainer.find('.ASWidgetLeftNaviPart').show();
			} // Show navigation only if the width is greater or equals 400.

			if (!entriesExistingBool && searchOpened) {
				toggleSearchField();
			}
			shareTextBox$ = jContainer.find(".ASWidgetshareBoxInput");
			naviWrappedDiv$ = jContainer.find(".ASWidgetWrappedDiv");
			alertMainDiv$ = jContainer.find(".ASWidgetAlertMainDiv");

			if (!savedSettings.alreadyLoaded) {
				switch (savedSettings.defaultNaviPoint.toLowerCase().trim().replace(/\s/g, '')) {
					case "statusupdates": //CNO: Fix translation also translates saved Value in WidgetData
						setSelectedFilter(jContainer.find(".ASWidgetstatusUpdates"));
						break;
					case "discover":
						if (savedSettings.useCommunity) {
							setSelectedFilter(jContainer.find(".ASWidgetstatusUpdates"));
						} else {
							setSelectedFilter(jContainer.find(".ASWidgetdiscover"));
						}
						break;
					default:
						setSelectedFilter(jContainer.find(".ASWidgetImFollowing"));
				}
			}

			savedSettings.alreadyLoaded = true;
			registerEvents(function() {
				if ($.isFunction(X.T.triggerEventsForWidget)) {
					X.T.triggerEventsForWidget(widgetData, container$);
				}
			}); // Non item specific events (general Events)
		}


		// END mainRendering

		// START expandItem
		function expandItem(event) {
			var targetElement = event,
				targetElement$ = $(targetElement),
				newHeight = (targetElement && targetElement.data("fullheight")) ? targetElement.data("fullheight") : "";

			targetElement$.height(newHeight).removeAttr("style");
			targetElement$.parents(".normalPostEntryItem").first().find(".postExpandClass").remove();
		}


		// END expandItem

		// START registerItemEvents
		function registerItemEvents() {




			// START showEE
			function showEE(eventObjectToSearchIn) {
				showEEFunc(getRelationObject(eventObjectToSearchIn), eventObjectToSearchIn);
			}


			// END showEE

			jContainer.find('[data-toggle="ASWidget-Post-Date"]').tooltip();

			jContainer.find('img').bind('error', function(event) {
				var this$ = $(event.currentTarget);
				if (this$.is(":visible")) {
					this$.hide().after('<i class="fa fa-exclamation-triangle" aria-hidden="true"> &nbsp ' +
						localizeString("ASWidget-image-preview-notavailable", "Preview has not been loaded. May it has been deleted or no preview is available.") + '</i>');
				}
			});

			jContainer.find(".normalPostEntryItem .postExpandClass").on("click", function(event) {
				expandItem($(event.currentTarget).parents(".normalPostEntryItem").first().find(".ActivityStreamWidgetPost"));
				return false;
			});


			jContainer.find(".AS-Widget-ShowPreviousCommentsBtn").on("click", function(event) {
				var dataItem = getRelationObject(event),
					objectId = dataItem.object.id || "",
					pObject = event.currentTarget,
					currentBtn$ = $(event.currentTarget),
					items = [],
					oldObj$;

				if (objectId.length) {
					$.ajax({
						url: X.T.getRootPath("WidgetsContainer", false) + "/basic/rest/ublog/@all/@all/" + objectId + "/comments?sortBy=published&sortOrder=ascending&startIndex=0&count=100"
					}).done(function(data) {
						if (data && data.list && data.list.length) {

							$.each(data.list, function(ignore, el) {
								items.push({
									authorID: el.author.id,
									authorProfileURL: getspecifiedURL(el.author.id, "profile"),
									authorPictureURL: getspecifiedURL(el.author.id, "picture"),
									authorFullName: el.author.displayName,
									commentContent: el.content,
									commentCreatedDateUnparsed: el.updated || "",
									commentCreatedDateParsed: formatDate(X.T.parseAtomDate(el.updated) || ""),
									commentCreatedDateParsedFull: moment(el.updated || "").format('LLLL')
								});
							});
							items = generateCommentsHtml(items).join("");

							oldObj$ = $(dataItem.finalHTML);
							oldObj$.find(".ASWidgetcommentsList").html(items);

							dataItem.finalHTML = oldObj$.get(0).outerHTML;
							$(pObject).parents(".ASWidgetcommentsList").first().html(items);

						}
					}).fail(function(jqXHR) {
						if (403 === jqXHR.status) {
							currentBtn$.remove();
							X.T.notifyError(localizeString("ASWidget-comments-no-permission", "You do not have permission to load further comments."), titleError);
						} else {
							X.T.notifyError(localizeString("ASWidget-comments-request-failed", "Requesting further comments has failed [request error]"), titleError);
						}
					});

				}

				return false;
			});

			jContainer.find(".ASWidget-Stream-Showmore").on("click", function() {
				var searchQueryText,
					lastItemTimeStamp;
				showMoreMode = true;
				(function appendTimeStampToQueryAndRefresh() {
					searchQueryText = jContainer.find(".searchInputBox");
					lastItemTimeStamp = jContainer.find(".streamItems li .ActivityStreamWidgetPost").last().data().date || "";
					getActivityStreamEntries(currentActivityStreamType, lastLoadedFeedType, (jContainer.find(".ASWidgetSearchStreamDiv").is(":visible") && searchQueryText.val().length) ? searchQueryText : undefined, lastItemTimeStamp, true);
				}
				());
				return false;
			});

			jContainer.find(".ASWidgetSaveSelectedPost").on("click", function(event) {
				var dataItem,
					dataObject,
					newSavedState,
					saveBTN$;

				checkEvent(event);
				dataItem = getRelationObject(event);
				dataObject = $(event.target).parents(".ActivityStreamWidgetPost").first();
				newSavedState = !("true" === dataObject.attr("saved"));
				saveBTN$ = $(event.currentTarget);

				toggleSaveEvent(dataItem.id, newSavedState, function(successfully) {
					if (!successfully) {
						X.T.notifyError(((newSavedState) ? localizeString("ASWidget-save-post-fail", 'Saving your content has failed. [request error]') : localizeString("ASWidget-unsave-post-fail", "Unsaving your content has failed [request error].")), titleError);
						return false;
					}
					dataObject.attr("saved", newSavedState.toString());
					saveBTN$.text(newSavedState ? localizeString("ASWidget-streamitems-dontsave", "Don't save") : localizeString("ASWidget-streamitems-save", "Save"));
					return true;
				});
				return false;
			});

			jContainer.find(".LikeX").on("click", function(event) {
				var dataItem,
					this$,
					LikedState,
					dataSplit,
					rollUpId,
					likerCache,
					likersForThisItem,
					itemsToShow;

				checkEvent(event);
				dataItem = getRelationObject(event);
				this$ = $(event.currentTarget);
				LikedState = ("true" === this$.parents(".ActivityStreamWidgetPost").first().attr("liked"));
				dataSplit = assertChain(dataItem, "connections.likeService") ? replaceIt(dataItem.connections.likeService, "/likes", "").split("/") : [];
				rollUpId = dataSplit[dataSplit.length - 1] || dataItem.connections.rollupid;
				likerCache = assertChain(dataItem, "LikerCache");
				likersForThisItem = (likerCache && dataItem.LikerCache[rollUpId]) ? dataItem.LikerCache[rollUpId] : false;
				itemsToShow = "No items";

				if (likerCache && likersForThisItem) {
					itemsToShow = dataItem.LikerCache[rollUpId];

					if (itemsToShow.LikerArr.length) {
						showLikePopover(itemsToShow.LikerArr, LikedState, this$);
					}
				} else {
					dataItem.LikerCache = [];
					loadLikers(rollUpId, function(loadedLikers) {
						if (loadedLikers.LikerArr.length) {
							itemsToShow = loadedLikers;
							dataItem.LikerCache[rollUpId] = itemsToShow;
							showLikePopover(itemsToShow.LikerArr, LikedState, this$);
						} else {
							showLikePopover(false, false, this$);
						}
					});
				}
				return false;

			});


			jContainer.find(".PostCurrentComment").on("click", function(event) {
				var this$,
					textField$,
					toPostComment,
					toGenObj,
					relatedObj,
					oldObj$,
					newItem,
					domElement$;

				checkEvent(event);

				this$ = $(this);
				textField$ = this$.parents().eq(3).find("textarea");
				toPostComment = textField$.val();

				if (!toPostComment.length) {
					return false;
				}
				textField$.prop("disabled", true);

				relatedObj = getRelationObject(event);
				oldObj$ = $(relatedObj.finalHTML);
				domElement$ = this$.parents(".ActivityStreamWidgetMetaChunk").first().find(".ASWidgetcommentsSection");


				postComment(toPostComment, relatedObj.connections.rollupid, function(createdEntry, successfully) {
					if (!successfully) {
						X.T.notifyError(localizeString("ASWidget-comment-post-fail", 'Posting your comment has failed [request error]'), titleError);
						return false;
					}

					toGenObj = {
						Author: {
							FullName: ownProfile.getName(),
							ProfileUrl: ownProfile.ownProfileUrl,
							PictureUrl: ownProfile.ownPictureUrl
						},
						Comment: {
							EventId: createdEntry.entry.author.id,
							Id: createdEntry.entry.id,
							iLiked: false,
							isLikable: true,
							LikesAmountTotal: 0,
							CreatedDateParsedFull: X.T.parseAtomDate(createdEntry.entry.published),
							CreatedDateFull: formatDate(X.T.parseAtomDate(createdEntry.entry.published)),
							Content: toPostComment
						}
					};
					newItem = generateSingleComment(toGenObj);
					domElement$.show().find(".ASWidgetcommentsList").append(newItem);
					oldObj$.find(".ASWidgetcommentsList").append(newItem); // modify object
					relatedObj.finalHTML = oldObj$.get(0).outerHTML;
					bindLikeCommentEvents();
					bindCommentShowLikesEvents();
					textField$.val("");
					textField$.prop("disabled", false);
					return true;
				});
				return false;

			});

			jContainer.find('.oM-entryItem-CommentToggleWrapper').on('click', function(event) {
				var this$ = $(event.currentTarget).hide(),
					actionLi$ = this$.parents('.oM-Actions'),
					actionDiv$ = actionLi$.find('.ActivityStreamWidgetActions');

				actionLi$.find('.ASWidgetcommentsSection').hide();
				actionLi$.find('.shareCurrentCommentDiv').hide();
				actionLi$.find('.oM-CommentAction').show();
				actionLi$.append(actionDiv$.clone(true));
				actionDiv$.remove();
			});

			jContainer.find(".CommentAction").on("click", function(event) {
				var this$,
					shareCurrentCommentDiv$,
					actionDiv$;

				checkEvent(event);
				this$ = $(event.currentTarget);
				actionDiv$ = this$.parents('.ActivityStreamWidgetActions');
				shareCurrentCommentDiv$ = savedSettings.useDefaultStyle ? this$.parents().eq(3).find(".shareCurrentCommentDiv") : this$.parents('.oM-Actions').find('.shareCurrentCommentDiv');

				expandItem(this$.parents(".ActivityStreamWidgetPost").first());

				if (savedSettings.useDefaultStyle) {
					this$.remove();
				} else {
					this$.hide();
					actionDiv$.find('.oM-entryItem-CommentToggleWrapper').show();
					shareCurrentCommentDiv$.after(actionDiv$);
				}

				this$.parents('.oM-Actions').find('.ASWidgetcommentsSection').show();
				shareCurrentCommentDiv$.slideToggle();

				if (shareCurrentCommentDiv$.val() === localizeString("ASWidget-comment-placeholder", "Add a comment...")) {
					shareCurrentCommentDiv$.val("");
				}
				return false;
			});

			jContainer.find(".FollowAction").on("click", function(event) {
				var dataItem,
					dataObject,
					newFollowingState,
					storyId,
					followBTN$;

				checkEvent(event);
				dataItem = getRelationObject(event);
				dataObject = $(event.target).parents(".ActivityStreamWidgetPost").first();
				newFollowingState = !("true" === dataObject.attr("followed"));
				storyId = dataItem.id;
				followBTN$ = $(event.currentTarget);

				stopFollowing(storyId, function(successfully, hasEntries) {
					if (!successfully) {
						X.T.notifyError(localizeString("ASWidget-following-stop-fail", 'Stopping to unfollow has failed. [request error]'), titleError);
						return false;
					}
					if (!hasEntries) {
						X.T.notifySuccess(localizeString("ASWidget-following-noItems", "You are not currently following any items for this story.."), localizeString('ASWidget-notificationTitle_succes', 'Success'));
					} else {
						followBTN$.remove();
						dataObject.attr("followed", newFollowingState.toString());
					}
					return true;
				});
				return false;
			});

			jContainer.find(".RepostAction").on("click", function(event) {
				checkEvent(event);
				rePostEvent(getRelationObject(event).id, function(successfully) {
					if (!successfully) {
						X.T.notifyError(localizeString("ASWidget-repost-fail", 'Reposting has failed [request error]'), titleError);
						return false;
					}
					W.setTimeout(refreshResults, 800);
					return true;
				});
				return false;
			});

			// START bindCommentShowLikesEvents
			function bindCommentShowLikesEvents() {
				jContainer.find(".CommentShowLikes").unbind('click').on("click", function(event) {
					var dataItem,
						this$,
						dataObject,
						rollUpID,
						LikedState,
						likerCache,
						likersForThisItem,
						itemsToShow;

					checkEvent(event);
					dataItem = getRelationObject(event);
					this$ = $(event.currentTarget);
					dataObject = $(event.target).parents(".ASWidget-Comment").first();
					rollUpID = dataObject.attr("commentid") || "0";
					LikedState = ("true" === dataObject.attr("liked"));
					likerCache = assertChain(dataItem, "CommentLikerCache");
					likersForThisItem = (likerCache && dataItem.CommentLikerCache[rollUpID]) ? dataItem.CommentLikerCache[rollUpID] : false;
					itemsToShow = "No items";

					if (likerCache && likersForThisItem && likersForThisItem.LikerArr && (likersForThisItem.LikerArr.length > 0)) {
						itemsToShow = dataItem.CommentLikerCache[rollUpID];
						if (itemsToShow.LikerArr.length) {
							showLikePopover(itemsToShow.LikerArr, LikedState, this$);
						}
					} else {
						dataItem.CommentLikerCache = [];
						loadLikers(rollUpID, function(loadedLikers) {
							if (loadedLikers.LikerArr.length) {
								itemsToShow = loadedLikers;
								dataItem.CommentLikerCache[rollUpID] = itemsToShow;
								showLikePopover(itemsToShow.LikerArr, LikedState, this$);
							} else {
								showLikePopover(false, false, this$);
							}
						});
					}
					return false;
				});
			}


			// END bindCommentShowLikesEvents

			bindCommentShowLikesEvents();
			bindLikeCommentEvents();


			jContainer.find(".LikeAction").on("click", function(event) {
				var dataItem,
					this$,
					dataObject,
					newLikedState,
					likeObject$,
					oldLikeCount,
					likerBtn$,
					eventId,
					newLikeCount;

				checkEvent(event);
				dataItem = getRelationObject(event);
				this$ = $(event.currentTarget);
				dataObject = $(event.target).parents(".ActivityStreamWidgetPost").first();
				newLikedState = !("true" === dataObject.attr("liked"));
				likeObject$ = savedSettings.useDefaultStyle ?
					this$.parents("[aria-label=ASWidgetPostActionDiv]").first().find(".ASWidgetCurrentPostLikes") :
					this$.parents('.oM-actionDiv').find('.ASWidgetCurrentPostLikes'),

				oldLikeCount = parseInt(likeObject$.text());
				likerBtn$ = this$.parents("[aria-label=ASWidgetPostActionDiv]").first().find(".LikeX");
				eventId = this$.attr("eventid");

				toggleLikeEvent(eventId, dataItem.connections.rollupid, newLikedState, function(successfully) {
					if (!successfully) {
						X.T.notifyError((newLikedState ? localizeString("ASWidget-like-fail", 'Liking the event has failed [request error]') : localizeString("ASWidget-unlike-fail", "Unlike the event has failed [request error]")), titleError);
						return false;
					}

					if (newLikedState) {
						likeObject$.text(oldLikeCount + 1);
						likerBtn$.show();
					} else {
						newLikeCount = (oldLikeCount > 0 ? oldLikeCount - 1 : 0);
						if (1 === oldLikeCount) {
							likerBtn$.hide();
						}
						likeObject$.text(newLikeCount.toString());
					}

					if (savedSettings.useDefaultStyle) {
						this$.text(newLikedState ? localizeString("ASWidget-streamitems-unlike", "Unlike") : localizeString("ASWidget-streamitems-like", "Like"));
					} else {
						likeObject$.parents('.LikeX')
							.find('i')
							.removeAttr('class')
							.addClass((0 === newLikeCount || !newLikedState) ? 'fa fa-heart-o' : 'fa fa-heart');
					}

					dataObject.attr("liked", newLikedState.toString());
					return true;
				});
				return false;
			});


			jContainer.find(".postActionBox").on("click", function(event) {
				expandItem($(event.currentTarget).parents(".ActivityStreamWidgetPost").first());
				showEE(event);
				return false;
			});

			jContainer.find(".normalPostEntryItem").on("click", function(event) {
				if ("normalPostEntryItem" === $(event.currentTarget).attr("class") && !$(event.target).is("a") && !$(event.target).is("i") &&
					!$(event.target).is("textarea") && !$(event.target).is("button") && !$(event.target).is("video") && !$(event.target).is("img") &&
					!$(event.target).is("span")) {
					expandItem($(event.currentTarget).parents(".ActivityStreamWidgetPost").first());
					showEE(event);
				}
			});

			jContainer.find(".streamItems li .ActivityStreamWidgetPost").hover(function() {
				$(this).find(".postActionBox").css("visibility", "visible");
				return false;
			},
				function() {
					$(this).find(".postActionBox").css("visibility", "hidden");
					return false;
				});
		}


		// END registerItemEvents

		// START removeExistingAlerts
		function removeExistingAlerts() {
			var existingAlerts = jContainer.find(".container-ASWidgetAlert");
			if (existingAlerts) {
				existingAlerts.remove();
			}
		}


		// END removeExistingAlerts

		// START doScroll
		function doScroll(itemIndex) {
			var lastItem$ = jContainer.find('[data-index="' + itemIndex + '"]').first();
			lastItem$.focus().blur(); // Call .focus() to scroll to the last item and then blur it.
		}


		// END doScroll

		// START generateEntries
		/**
		 * [generateEntries description]
		 * @param  {[json object]} data   [The json object of a feed]
		 * @param  {[boolean]} append [Append items or not]
		 */

		function generateEntries(data, appendIt) {

			/*
				(function filterItems() {
					var acceptedVerbs = ["add", "share", "post"];
					$.each(data, function(i, el) {
						if(-1 === acceptedVerbs.indexOf(data[i].verb)) {
							delete data[data[i].id];
						}
					});

				})(); // TK anforderung
				*/


			var streamItems$ = jContainer.find(".streamItems"),
				items = [],
				itemsToRender,
				nothingToDisplay,
				resultMsg,
				deferredObj = generateHTMLItems(items, data) || [],
				lastItemIndex = -1,
				allItems = jContainer.find(".streamItems li.normalPostEntryItem"),

				removeLast = (assertChain(dataArray, "length") && (1 === dataArray.length)), // does not make sense
				oldBtn$ = jContainer.find(".ASWidget-Stream-Showmore"),
				lastloadedDataIdMatches = lastloadedDataArray.list &&
					lastloadedDataArray.list[0] &&
					lastloadedDataArray.list[0].id &&
					lastloadedDataArray.list[lastloadedDataArray.list.length - 1].id === currentDataArray.list[0].id;


			$.whenAll.apply($, deferredObj).always(function(itemArray) {

				if (itemArray && itemArray.length) {

					if (oldBtn$.length) {
						oldBtn$.remove();
					}

					if (currentDataArray.itemsPerPage >= 20) {
						if ((!lastloadedDataIdMatches) && !removeLast && !$(items[items.length - 1]).hasClass("ASWidget-Stream-Showmore")) {
							items.push('<li class="ASWidget-Stream-Showmore" tabindex="9999999"><div>' +
								'<button type="button" class="ASWidget-Stream-ShowMoreBtn btn btn-primary">' +
								localizeString("ASWidget-posts-load-more", "Load More") + '</button></div></li>');
						}

					} else {
						if (removeLast && lastloadedDataIdMatches && (1 === currentDataArray.itemsPerPage)) {
							items.pop(); // If the show more button won't be displayed because there are no feeds anymore,
							//we remove the last added item to handle a last item duplicate.
						}
					}
					itemsToRender = itemArray[0];
				}

				if (!itemsToRender && allItems.length && (0 === allItems.length)) {
					resultMsg = localizeString("ASWidget-no-entries-found", "No entries found.");
					nothingToDisplay = '<ul class="ASWidget-NoContent-Ul"><li class="normalPostEntryItem"><div class="container-ASWidgetAlert">' +
						createAlert(resultMsg, 'error') + '</div></li></ul>';
					itemsToRender = [];
					itemsToRender.push(nothingToDisplay);
				}

				if (!forcedRedraw && streamItems$.length && (assertChain(allItems, "length"))) {
					lastItemIndex = jContainer.find(".streamItems li.normalPostEntryItem").last().data().index || 0;
					if (appendIt) {
						itemsToRender = itemsToRender.slice(1, itemsToRender.length);
						streamItems$.append(itemsToRender.join(""));
					} else {
						streamItems$.html(itemsToRender.join(""));
					}

					if (scrollToBottom) {
						doScroll(lastItemIndex);
					}
					registerItemEvents();
					if ($.isFunction(X.T.triggerEventsForWidget)) {
						X.T.triggerEventsForWidget(widgetData, container$);
					}
					return false;
				}
				forcedRedraw = false;
				mainRendering(itemsToRender.join(""), false);
				return true;
			});

		}


		// END generateEntries

		// START bindExistingAlerts
		/**
		 * [bindExistingAlerts bind several alerts]
		 */
		function bindExistingAlerts() {
			var allAlertsCloseBtns$ = jContainer.find(".container-ASWidgetAlert .close");
			allAlertsCloseBtns$.unbind("click").on("click", function(event) {
				$(event.currentTarget).parents(".container-ASWidgetAlert").first().remove();
				return false;
			});
		}


		// END bindExistingAlerts

		// START doAPost
		/**
		 * [doAPost helperfunction to perform a post to the activitystream]
		 * @param  {[string]} toPostContent           [the content to post]
		 * @param  {[object]} pFileToUploadFromDialog [the pFileToUploadFromDialog object]
		 */
		function doAPost(toPostContent, pFileToUploadFromDialog) {
			// START callback
			function callback() {
				var replacedAMentionContent = toPostContent;
				fileToUploadFromDialogCallback = null;

				//build commenthtml
				// get all patterns of [~XYZ] and replace with corresponding html markup for XYZ
				replacedAMentionContent = replacedAMentionContent.replace(/\[~.+?\]/g, function(e, ignore) {
					var shortName = e.replace(/\[~|\]/g, "");
					if (mentions[shortName]) {
						return mentions[shortName].unchangedHTML;
					}
					return e;

				});
				replacedAMentionContent = X.T.parseHTMLContent(replacedAMentionContent);

				postStatus(replacedAMentionContent, pFileToUploadFromDialog);
			}


			// END callback
			if (fileToUploadFromDialog) {
				fileToUploadFromDialogCallback = callback;
				showVisualLoading(true);
				fileToUploadFromDialog.submit();
			} else {
				callback();
			}
		}


		// END doAPost

		// START transFormDataArray
		/**
		 * [transFormDataArray to transform the dataarray to a better usable array]
		 * @param  {[array]} pDataArray [the source data array with all entries]
		 * @return {[array]}            [the new generated data array]
		 */
		function transFormDataArray(pDataArray) {
			var newArray = {};
			$.each(pDataArray.list, function(ignore, el) {
				newArray[el.id] = el;
			});
			return newArray;
		}


		// END transFormDataArray

		/**
		 * [doRequest function to perform several ajax requests to load data entries from the activitystream]
		 * @param  {[string]} url [the data uri to perform the request on]
		 */
		doRequest = function(url) {
			showVisualLoading(true);
			$.ajax({
				url: url,
				cache: false
			}).always(function(data, ignore, responseObj) {
				var transformedItems;
				showVisualLoading(false);

				if (!data.status && (200 === responseObj.status)) {
					currentDataArray = data;
					lastloadedDataArray = data;

					if (showMoreMode) {
						transformedItems = transFormDataArray(data);
						$.each(transformedItems, function(i, el) {
							dataArray[i] = el;
						});
						generateEntries(transformedItems, true);
						showMoreMode = false;
						jContainer.find(".ASWidgetLoadingLi").remove();
						return false;
					}
					clearDataList();

					if (data && data.list && (!data.list.length)) {
						mainRendering(getNoEntriesNotification(), false);
					} else {
						dataArray = transFormDataArray(data);
						generateEntries(dataArray, false); // Generate Entries after loading
					}
				}



				if (data.status) {
					removeExistingAlerts();
					X.console.error("Could not perform the request correctly");
					jContainer.find(".streamItems").html('<li><div class="ASWidgetRequestError container-ASWidgetAlert"><i class="fa fa-times" aria-hidden="true">' +
						'</i> ' + localizeString("ASWidget-request-error", "While performing a request an error has occured.") + '</div></li>');

					if (403 === data.status) {
						mainRendering(getNoAccessNotification(), false);
					} else {
						mainRendering(getCustomNotification(responseObj.responseText), false);
					}
				}
				return true;
			});
		};

		// START closeSearchStreamField

		function closeSearchStreamField() {
			jContainer.find(".ASWidgetSearchStreamDiv").hide();
		}


		// END closeSearchStreamField

		// START checkStreamTypeAndLoadIt
		/**
		 * [checkStreamTypeAndLoadIt Check whether to load the normal activitystream or community specific stream.]
		 */
		function checkStreamTypeAndLoadIt(savedSettings) {
			var targetStream,
				communityModeSaved = (savedSettings.useCommunity && savedSettings.hasCommunity);
			currentAccess.widgetCommunityUuid = communityModeSaved ? savedSettings.communityUuid : undefined;
			checkIfUserisCommunityMember(currentAccess.widgetCommunityUuid, ownProfile.getUserId(), function(isMemberState) {
				currentAccess.isMember = isMemberState;

				getCommunityRestrictions(savedSettings.communityUuid, function(restriction) {
					currentAccess.communityRestrictionString = restriction || '';
					currentAccess.canSendJoinRequest = (currentAccess.communityRestrictionString && currentAccess.communityRestrictionString.length && (-1 !== ['publicInviteOnly', 'public'].indexOf(currentAccess.communityRestrictionString)));
					if (isCommunityMode() && !currentAccess.isMember) {
						jContainer.find('.ASWidgetShareSomethingDiv').remove();
					} // If a community is selected, "Use Community" is checked and the user is not member of the community, remove sharebox.

					targetStream = communityModeSaved ? ActivityStreamType.CommunityActivityStream : ActivityStreamType.NormalActivityStream;

					switch (savedSettings.defaultNaviPoint) {
						case XCC.L.get("ASWidget-editor-StatusUpdates", "Status Updates"):
							getActivityStreamEntries(targetStream, communityModeSaved ? ASFilters.CommunityStreamStatusUpdates : ASFilters.StatusUpdatesAll);
							break;
						case XCC.L.get("ASWidget-editor-Discover", "Discover"):
							getActivityStreamEntries(targetStream, ASFilters.Discover);
							break;
						default:
							getActivityStreamEntries(targetStream, communityModeSaved ? ASFilters.CommunityStreamAll : ASFilters.AllForMe);
					}
				});

			});
		}


		// END checkStreamTypeAndLoadIt

		registerEvents = function(callbackfinish) { // Start registerEvents
			registerItemEvents();

			/**
			 * [require fileupload function - to upload files]
			 */
			X.require(["fileupload"], function() {

				var uploadUrlStandard = "/files/basic/api/myuserlibrary/feed?format=html&label=",
					uploadUrlCommunity = "/files/basic/api/communitylibrary/" + savedSettings.communityUuid + "/feed?&mediaNotification=on&label=",
					label = "";
				jContainer.find((savedSettings.useDefaultStyle ? '.ASWidgetUploadNewFileDiv' : '.oM-ASWidgetAddFile') + " input[type=\"file\"]").fileupload({
					url: getWindowLocation() + (isCommunityMode() ? uploadUrlCommunity : uploadUrlStandard),
					type: "POST",
					multipart: false,
					dropZone: jContainer.find(".ASWidgetWrappedDiv"),
					beforeSend: function modifyHeaders(xhr, settings) {
						this.url = getWindowLocation() + (isCommunityMode() ? uploadUrlCommunity : uploadUrlStandard) + encodeURIComponent(label);
						xhr.setRequestHeader("Content-Type", settings.contentType || "image/jpeg");
					},
					add: function(ignore, data) {
						var currentSelectedFile$,
							currentSelectedFileName$,
							deleteAttachmentBtn$;
						label = (data && data.files && data.files[0] && data.files[0].name) ? data.files[0].name : ("image" + moment().unix());
						fileToUploadFromDialog = data;

						if (savedSettings.useDefaultStyle) {
							currentSelectedFileName$ = jContainer.find(".ASWidgetUploadNewFileName");
							currentSelectedFileName$
								.addClass("fa fa-file " + (X.L.isRTL ? 'icon-mirrored' : ''))
								.parents('.ASWidgetUploadNewFileDiv').find('.ASWidgetCurrentSelectedFileName').text(label);
						} else {
							deleteAttachmentBtn$ = jContainer.find('.oM-deleteAttachment');
							currentSelectedFile$ = jContainer.find('.oM-ASWidgetCurrentSelectedFile');
							if (label && label.length) {
								currentSelectedFile$.show();
								deleteAttachmentBtn$.show();
							} else {
								currentSelectedFile$.hide();
								deleteAttachmentBtn$.hide();
							}
							currentSelectedFile$.find('.oM-attachmentFileName').show().text(decodeURIComponent(label));
						}
						shareTextBox$.focus();
					},
					done: function uploadDone(ignore, data) {
						var data$ = $(data.result);
						fileToUploadFromDialog.targetRollUpUrl = data$.find("link[rel='alternate']").attr("href");
						fileToUploadFromDialog.targetURL = data$.find("link[rel='enclosure']").attr("href") || "";
						fileToUploadFromDialog.targetURLThumbnail = data$.find("link[rel='thumbnail']").attr("href") || "";
						fileToUploadFromDialog.targetID = data$.find("td\\:uuid,uuid").first().text();
						fileToUploadFromDialog.targetDisplayName = data$.find("title").first().text();
						fileToUploadFromDialog.targetLibraryId = data$.find("td\\:libraryId,libraryId").first().text();

						fileToUploadFromDialog.fileType = getAttachmentType(fileToUploadFromDialog.targetURL, true);

						if ($.isFunction(fileToUploadFromDialogCallback)) {
							fileToUploadFromDialogCallback.call(this, arguments);
						}
						showVisualLoading(false);
					}
				});
			});

			shareTextBox$.keypress(function(e) {
				removeExistingAlerts();
				if (X.T.ctrlOrMetaKeyPressed(e) && (13 === e.keyCode || 10 === e.keyCode)) {
					jContainer.find(".ASWidgetPostNewEntry").trigger("click");
				}
			});

			shareTextBox$.on("change keydown keyup paste propertychange", function() {
				var inputLength,
					displayCounter;
				removeExistingAlerts();
				inputLength = shareTextBox$.val().length;
				displayCounter = jContainer.find(".ASWidgetShareboxPositiveCount");

				displayCounter.text(999 - inputLength);
			});


			shareTextBox$.on("input", function(e) {
				var target$ = $(e.target),
					cursorPos = target$.prop("selectionStart");

				// START composeUserSearchQuery
				function composeUserSearchQuery(term) { // TODO branch out? To XCC.UTIL
					var searchFields = "FIELD_DISPLAY_NAME,FIELD_TELEPHONE_NUMBER,FIELD_MOBILE,FIELD_IP_TELEPHONE_NUMBER,FIELD_JOB_RESPONSIBILITIES,FIELD_DEPARTMENT_TITLE,FIELD_TAG,FIELD_PHYSICAL_DELIVERY_OFFICE",
						//			regex = /(\+|\-|\&\&|\|\||\!|\(|\)|\{|\}|\[|\]|\^|\"|\~|\*|\?|\:|\\)/g,
						regex = /(\+|-|&&|\|\||!|\(|\)|\{|\}|\[|\]|\^|"|~|\*|\?|:|\\)/g,
						luceneQuery = "", // return value
						escapedTerm = X.T.distinctArray($.trim(term).replace(regex, "\\$1").split(" ")),
						bracketOpen = escapedTerm.length > 1 ? "(" : "",
						bracketClose = escapedTerm.length > 1 ? ")" : "";
					$.each(searchFields.split(","), function(i, field) {
						luceneQuery += (i ? " OR " : "") + bracketOpen;
						// if we want a fuzzy search for the term given, we would use
						// the ~ operator instead of the * operator
						// that would find Mustermann on entering musermann
						// and would find Meier on entering Muser
						// but would still not be able to find phone numbers containing
						// a - character
						$.map(escapedTerm, function(term, j) {
							luceneQuery += j ? " AND " : "";
							luceneQuery += field + ":" + term + '*';
						});
						luceneQuery += bracketClose;
					});
					return luceneQuery;
				}


				// END composeUserSearchQuery

				// START getUsers
				/*from XCC-ADMINPANEL*/ // TODO branch out?
				function getUsers(term, opt) {
					var ajaxOptions = $.extend({
						url: X.T.getRootPath("Profiles") + "/atom/search.do",
						cache: false,
						data: {
							activeUsersOnly: true,
							search: composeUserSearchQuery(term),
							ps: 25
						}
					}, opt);
					return $.ajax(ajaxOptions);
				}


				// END getUsers

				// START addUserAutocomplete
				/**
				 * create an autocomplete on a input control that allows for typing in a name
				 * and suggesting existing users during type
				 *
				 * @param input$ {jQuery} the input to create the autocomplete on
				 */
				function addUserAutocomplete(input$) {
					// act on the given input field
					var timer;
					input$
						.autocomplete({
							create: function() {
								// register a custom renderItem function that displays the users image
								var ac = this,
									ac$ = $(ac),
									ri = ac$.data('ui-autocomplete')._renderItem, // pointer to the old function
									oldVal = 0,
									newVal = 0;
								timer = setInterval(function() {
									newVal = input$.val().match(/@/g) ? input$.val().match(/@/g).length : 0;
									if (oldVal > newVal) {
										clearInterval(timer);
										input$.autocomplete("destroy");
									}
									oldVal = newVal;
								}, 100);
								if (ri) {
									ac$.data('ui-autocomplete')._renderItem = function customRenderItem(ignore, item) {
										var atom$ = item.entry$,
											ret$ = ri.apply(ac, arguments); // 1. invoke old function
										// as of jQueryUI 1.11 the li has no anchor anymore!
										// https://github.com/jquery/jquery-ui/commit/e08791d2c1be7628b7fd6ca2398cff195cb2e2c2
										// 2. modify the result
										ret$ // 2. modify the result
											.attr("title", atom$.find(".email").first().text())
											.prepend($("<img/>", {
												src: atom$.find("[type=image]").attr("href").split("&")[0], //caching-parameter will not work for IE9
												"class": "ac-icon"
											}));
										return ret$; // 3. and return that
									};
								}
							},
							position: {
								my: "left top",
								at: "left bottom",
								collision: "flip flip"
							},
							source: function(request, responseCallback) {
								getUsers(request.term)
									.done(function(data) {
										// return an array with Objects like {label:"", uuid:""}
										var ret = [];
										$(data).find(">feed>entry").each(function(i, v) {
											var entry$ = $(v);
											ret.push({
												label: entry$.find("title").first().text(),
												name: entry$.find("title").first().text(),
												uuid: entry$.find(".uid").first().text(),
												shortName: entry$.find(".x-profile-uid").first().text(),
												pos: i,
												entry$: entry$ // used in renderitem
											});
										});
										responseCallback(ret);
									})
									.error(function() {
										responseCallback([]);
									});
							},
							focus: function() {
								return false;
							},
							autoFocus: true,
							select: function select(event, ui) {
								var user = ui.item,
									inpV$ = input$.val(),
									mentionHtml = '<span class="vcard ASWidgetvcard"><span class="fn">@' + user.name + '</span>' +
										'<span class="x-lconn-userid">' + user.uuid + '</span></span>',
									cursorPosition = input$.prop("selectionStart"),
									textBefore = inpV$.substring(0, cursorPosition),
									textAfter = inpV$.substring(cursorPosition, input$.val().length),
									positionMention = inpV$.lastIndexOf("@"),
									mentionTrashLength = positionMention - cursorPosition;
								user.value = $("<i/>").text(mentionHtml).html();
								user.unchangedHTML = mentionHtml;
								user.stringifiedJson = JSON.stringify(mentionHtml).slice(1, -1);
								textBefore = textBefore.slice(0, mentionTrashLength);
								mentions[user.shortName] = user;
								input$.val(textBefore + '[~' + user.shortName + ']' + textAfter);
								input$.autocomplete("destroy");
								clearInterval(timer);
								return false;
							} // END select
						}); // END autocomplete
				}


				// END addUserAutocomplete

				/**
				 * @mentions
				 *
				 * markup for request:
				 * test <span class="vcard"><span class="fn">@Peter Lustig</span><span class="x-lconn-userid">07148318-A0C7-4356-C125-7FD5007B67EE</span></span> test
				 * &lt;span class="vcard"&gt;&lt;span class="fn"&gt;@Peter Lustig&lt;/span&gt;&lt;span class="x-lconn-userid"&gt;07148318-A0C7-4356-C125-7FD5007B67EE&lt;/span&gt;&lt;/span&gt; GEHT ALLES - KEIN THEMA
				 */



				if (27 === e.keyCode) {
					target$.autocomplete("destroy");
				}


				if (((1 === cursorPos) && ("@" === target$.val().substr(0, 1))) || (" @" === target$.val().substr(cursorPos - 2, 2))) {
					/*from XCC-ADMINPANEL*/
					addUserAutocomplete($(e.target));

					// Show Dropdown of names and bring to front
					$(".ui-autocomplete").show();
					$(".ui-autocomplete").css("z-index", "9999");

				}
			}); // END @ mentions

			shareTextBox$.focusin(function() {
				var baseCondition = jContainer.find(".ASWidgetHeaderActionDiv").is(":visible"),
					baseText = localizeString("ASWidget-share-sharebox-placeholder", "What would you like to share?");
				if ((baseCondition && shareTextBox$.val().length) || (75 === shareTextBox$.height() && baseCondition)) {
					return false;
				}
				if (shareTextBox$.val() === baseText) {
					shareTextBox$.val("");
				}
				if (savedSettings.useDefaultStyle) {
					shareTextBox$.css({
						"border-bottom-left-radius": "0",
						"border-bottom-right-radius": "0"
					});
				}
				shareTextBox$.removeAttr("placeholder").animate({
					height: savedSettings.useDefaultStyle ? 200 : 72
				});
				jContainer.find(".ASWidgetHeaderActionDiv").show();
				return true;
			});

			shareTextBox$.focusout(function(event) {
				var ta$;
				// if the click target is inside the wrapperdiv
				if (event && !naviWrappedDiv$.has(event.relatedTarget).length) {
					ta$ = $(this);
					X.T.debounce(function() {

						if (ta$.val().length) {
							return false;
						}
						ta$.attr("placeholder", localizeString("ASWidget-share-sharebox-placeholder", "What do you want to share?"));
						if (42 !== ta$.height()) {
							ta$.animate({
								height: 42
							});
						}
						ta$.css({
							"border-bottom-left-radius": "4px",
							"border-bottom-right-radius": "4px"
						});
						jContainer.find(".ASWidgetHeaderActionDiv").hide();
						return true;
					}, 100)();
				}
			});

			jContainer.find(".searchInputBox").keypress(function(e) {
				if (13 === e.keyCode || 10 === e.keyCode) {
					jContainer.find(".searchStreamReq").trigger("click");
				}
			});

			jContainer.find(".ASWidgetjoinCommunityBtn").on("click", function(event) {
				var this$ = $(event.currentTarget),
					restriction = currentAccess.communityRestrictionString,
					statusBox$ = $('<div/>').addClass('container-ASWidgetAlert'),
					infoMessageText;

				checkEvent(event);
				forcedRedraw = true;

				if ("publicInviteOnly" === restriction) {
					addMemberToCommunity(false, savedSettings.communityUuid, ownProfile.ownUserId, "", function(ignore, isOk) {
						if (isOk) {
							this$.remove();
							infoMessageText = createAlert(localizeString("ASWidget-joiningCommunity-request-success-msg", "Your request was sent to the community owners."), 'info');
						} else {
							infoMessageText = createAlert(localizeString("ASWidget-joiningCommunity-request-fail-msg", "Your request was not sent to the community owners."), 'error');
						}
						alertMainDiv$.html("").append(statusBox$.html(infoMessageText));
					});

					/*
														new X.T.MsgBox({
															flags: X.T.MBFLAGS.OK,
															title: localizeString("ASWidget-JoinComDialog-Title", "Join community"),
															msg: '<div class="newJoinCom">' +
																'<div class="form-group" style="margin-bottom:5px;">' +
																'<label for="joinComTitleLabel">' + localizeString("ASWidget-JoinComDialog-msg", "Request text") + "</label>" +
																'<textarea class="form-control" name="joinComInput" rows="5" id="comment"></textarea>' +
																"</div>",
															btn1Text: localizeString("ASWidget-JoinComDialog-BtnText", "Send join request"),
															btn1Callback: function(e) {
																e.preventDefault();
																var joinRequestText = $('[name="joinComInput"]').val();



															}
														});
														*/
				}

				if ("public" === restriction) {
					addMemberToCommunity(("public" === restriction), savedSettings.communityUuid, ownProfile.ownUserId, "", function(ignore, isOk) {
						if (isOk) {
							this$.remove();
							checkStreamTypeAndLoadIt(savedSettings);
						} else {
							alertMainDiv$.html("").append(
								$('<div/>')
									.addClass('container-ASWidgetAlert')
									.append(createAlert(localizeString("ASWidget-joiningCommunity-fail-msg", "Joining the community has failed."), 'error'))
							);
						}
					});
				}
				return false;
			});


			jContainer.find(".ASWidgetRefresh").on("click", function() {
				refreshResults();
				return false;
			});

			jContainer.find(".ASWidgetSearchStreamDiv .searchStreamReq").on("click", function() {
				var searchQuery = X.T.sanitizeHTML(jContainer.find(".ASWidgetSearchStreamDiv .searchInputBox").val());
				if (!searchQuery.length) {
					return false;
				}
				getActivityStreamEntries(currentActivityStreamType, (isCommunityMode() ? ASFilters.CommunityStreamAll : ASFilters.AllForMe), searchQuery);

				return false;
			});

			jContainer.find(".ASWidgetSearchOpen").on("click", function() {
				toggleSearchField();
				return false;
			});

			jContainer.find(".ASWidgetActionDropdown li").click(function(event) {
				loadSpecificFeed($(event.currentTarget).attr("class"));
			});

			jContainer.find('.oM-deleteAttachment').on('click', function(e) {
				var fileUpload$ = jContainer.find('.oM-fileUploadInput'),
					fileInfo$ = jContainer.find('.oM-ASWidgetCurrentSelectedFile').hide();
				fileUpload$.replaceWith(fileUpload$.val('').clone(true));
				fileInfo$.find('.oM-attachmentFileName').text('');
				fileToUploadFromDialog = undefined;
				fileToUploadFromDialogCallback = undefined;
				$(e.currentTarget).hide();
			});

			jContainer.find(".ASWidgetPostNewEntry").on("click", function(event) {
				var toPostContent;
				checkEvent(event);
				toPostContent = shareTextBox$.val();

				if (!toPostContent.length) {

					new X.T.MsgBox({
						title: localizeString("ASWidget-newPost-empty-title", "Fields cannot be empty."),
						msg: localizeString("ASWidget-newPost-empty-content", "You have to provide some content."),
						btn1Text: localizeString("ASWidget-newPost-empty-OK", "OK")
					});
				} else {
					doAPost(toPostContent, fileToUploadFromDialog);
					shareTextBox$.focus();
				}
				return false;
			});

			jContainer.find(".ASWidgetdiscover").on("click", function() {
				closeSearchStreamField();
				setSelectedFilter(this);
				getActivityStreamEntries(currentActivityStreamType, ASFilters.Discover);
				return false;
			});

			jContainer.find(".ASWidgetImFollowing").on("click", function() {
				closeSearchStreamField();
				setSelectedFilter(this);
				getActivityStreamEntries(currentActivityStreamType,
					(isCommunityMode() ? ASFilters.CommunityStreamAll : ASFilters.AllForMe));
				return false;
			});

			jContainer.find(".ASWidgetstatusUpdates").on("click", function() {
				closeSearchStreamField();
				setSelectedFilter(this);
				getActivityStreamEntries(currentActivityStreamType,
					(isCommunityMode() ? ASFilters.CommunityStreamStatusUpdates : ASFilters.StatusUpdatesFilter));
				return false;
			});



			jContainer.find(".ASWidgetClearNewEntry").on("click", function() {
				clearPostingArea();
				return false;
			});

			jContainer.find(".ASWidgetUploadFileNewEntry").on("click", function() {
				shareTextBox$.focus();
				return false;
			});

			if ($.isFunction(callbackfinish)) {
				callbackfinish();
			}
		}; // END registerEvents


		/**
		 * [refreshResults function to refresh the current results]
		 */
		refreshResults = function() {
			var searchQueryText = "";
			closeSearchStreamField();
			searchQueryText = jContainer.find(".searchInputBox");
			getActivityStreamEntries(currentActivityStreamType, lastLoadedFeedType, ((jContainer.find(".ASWidgetSearchStreamDiv").is(":visible") && (searchQueryText.val().length)) ? searchQueryText : undefined));
		};



		/**
		 * [postStatus Function to post a status to the activitystream]
		 * @param  {[string]} content                 [the content to post]
		 * @param  {[object]} pFileToUploadFromDialog [the pFileToUploadFromDialog object]
		 */
		postStatus = function(pContent, pFileToUploadFromDialog) {
			var postNormal = {content: pContent},
				successBox = "",
				fileName = "",
				postingURL = X.T.getRootPath("WidgetsContainer", false) + '/basic/rest/ublog/@me/@all',
				libraryPart = "",
				imageThumbnail = "",
				attachmentObj;

			if (pContent && pContent.length > 999) { // Check if the entered post is too long.
				removeExistingAlerts();

				alertMainDiv$.html("").append(
					$('<div/>')
						.addClass('container-ASWidgetAlert')
						.append(createAlert(localizeString("ASWidget-toolongpost", "The entered post is too long."), 'danger'))
				);
				bindExistingAlerts();
				return false;
			}

			(function checkForPostAttachment() { // check whether file attachments have to be included into the post
				if (fileToUploadFromDialog) {
					imageThumbnail = '{files}/form/anonymous/api/library/' + fileToUploadFromDialog.targetLibraryId + '/document/' + fileToUploadFromDialog.targetID + '/thumbnail?renditionKind=largeview';
					libraryPart = fileToUploadFromDialog.targetURL.split("api/")[1] || "";
					fileName = ((fileToUploadFromDialog.data && fileToUploadFromDialog.data.files &&
						fileToUploadFromDialog.data.files[0] && fileToUploadFromDialog.data.files[0].name) ? fileToUploadFromDialog.data.files[0].name : pFileToUploadFromDialog.targetDisplayName);

					attachmentObj = {
						author: {
							id: ownProfile.getUserId()
						},
						id: fileToUploadFromDialog.targetID,
						displayName: fileName,
						url: '{files}/form/anonymous/api/' + libraryPart,
						summary: '',
						published: moment().utc().format()
					};

					postingURL = X.T.getRootPath("WidgetsContainer", false) + "/basic/rest/ublog/" + ownProfile.getUserId() + "/@all";

					if (("Image" === fileToUploadFromDialog.fileType.type)) {
						attachmentObj = $.extend(attachmentObj, {objectType: 'file', img: {url: imageThumbnail}});
					} else {
						attachmentObj = $.extend(attachmentObj, {objectType: 'file'});
					}
					postNormal = {
						content: pContent,
						attachments: [attachmentObj]
					};
				}
			}
			());

			if (isCommunityMode()) { // If Communitymode
				postingURL = X.T.getRootPath("WidgetsContainer", false) + '/basic/rest/ublog/urn:lsid:lconn.ibm.com:communities.community:' + currentAccess.widgetCommunityUuid + '/@all';
			}

			$.ajax({
				headers: {
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
				},
				url: postingURL,
				method: "POST",
				dataType: 'json',
				contentType: "application/json; charset=UTF-8",
				data: JSON.stringify(postNormal)
			}).done(function() {
				removeExistingAlerts();
				successBox = $("<div/>").addClass("ASWidgetnotifySuccessPost").css({
					clear: "both"
				}).html(
					$('<div/>')
						.addClass('container-ASWidgetAlert')
						.append(
							createAlert(localizeString("ASWidget-message-posted-success", "Your message has been posted"), 'success'))
				);

				alertMainDiv$.html("").append(successBox);
				bindExistingAlerts();
				clearPostingArea();
				W.setTimeout(refreshResults, 800);
			}).fail(function(jqXHR, textStatus) {
				X.console.error("[Post status] " + textStatus);
				X.T.notifyError(localizeString("ASWidget-content-posted-fail", "Posting your content has failed."), titleError);

			});
			return true;
		};

		/**
		 * [toggleSaveEvent This function toggles the save or don't save state of an event.]
		 * @param  {[string]} eventID       [The event ID to save or don't save any more]
		 * @param  {[boolean]} boolSaveOrNot [The state (save or don't save) as boolean.]
		 * @param  {[function]} callback [The callback that is called after the ajax request]
		 */
		toggleSaveEvent = function(eventID, boolSaveOrNot, callback) {
			var dataForRequest = {
				id: '',
				actor: {
					id: ''
				},
				verb: '',
				object: {
					id: ''
				},
				connections: {
					saved: (boolSaveOrNot).toString()
				}
			};
			$.ajax({
				url: X.T.getRootPath("WidgetsContainer", false) + "/basic/rest" + ASFilters.AllForMe + eventID,
				method: "PUT",
				dataType: 'json',
				contentType: "application/json; charset=UTF-8",
				data: JSON.stringify(dataForRequest)
			}).always(function(xhr, ignore, thrownMessage) {
				if ($.isFunction(callback)) {
					callback.call(this, (200 === thrownMessage.status));
				}
			});
		};

		/**
		 * [loadSpecificFeed Click within the navigation and load a different feed. Here it will be distinguished between the feed types.]
		 * @param  {[string]} ID [The classname of the navigation element without dot]
		 */
		loadSpecificFeed = function(ID) {
			var isCommunity = isCommunityMode(),
				cont = function(b) {
					return ID.indexOf(b) !== -1;
				};
			switch (true) {
				case (cont("ASWidgetFilterAll")):
					getActivityStreamEntries(currentActivityStreamType, (isCommunity ? ASFilters.CommunityStreamAll : ASFilters.AllForMe));
					setSelectedFilter(jContainer.find(".ASWidgetImFollowing"));
					break;
				case (cont("ASWidgetFilterStatusUpdatesAll")):
					getActivityStreamEntries(currentActivityStreamType, ASFilters.StatusUpdatesAll);
					break;

				case (cont("ASWidgetFilterStatusUpdatesMyNetworkAndPeople")):
					getActivityStreamEntries(currentActivityStreamType, ASFilters.StatusUpdatesMyNetWorkAndPeopleIFollow);
					break;

				case (cont("ASWidgetFilterStatusUpdatesMyNetwork")):
					getActivityStreamEntries(currentActivityStreamType, ASFilters.StatusUpdatesMyNetwork);
					break;

				case (cont("ASWidgetFilterStatusUpdatesPeopleIFollow")):
					getActivityStreamEntries(currentActivityStreamType, ASFilters.StatusUpdatesPeopleIFollow);
					break;

				case (cont("ASWidgetFilterStatusUpdatesMyUpdates")):
					getActivityStreamEntries(currentActivityStreamType, ASFilters.StatusUpdatesMyUpdates);
					break;

				case (cont("ASWidgetFilterStatusUpdatesCommunities")):
					getActivityStreamEntries(currentActivityStreamType, ASFilters.StatusUpdatesCommunities);
					break;

				case (cont("ASWidgetFilterStatusUpdates")):
					getActivityStreamEntries(currentActivityStreamType, (isCommunity ? ASFilters.CommunityStreamStatusUpdates : ASFilters.StatusUpdatesFilter));
					setSelectedFilter(jContainer.find(".ASWidgetstatusUpdates"));
					break;
				case (cont("ASWidgetFilterActivities")):
					getActivityStreamEntries(currentActivityStreamType, (isCommunity ? ASFilters.CommunityStreamActivites : ASFilters.ActivitesFilter));
					break;
				case (cont("ASWidgetFilterBlogs")):
					getActivityStreamEntries(currentActivityStreamType, (isCommunity ? ASFilters.CommunityStreamBlogs : ASFilters.BlogsFilter));
					break;
				case (cont("ASWidgetFilterBookmarks")):
					getActivityStreamEntries(currentActivityStreamType, (isCommunity ? ASFilters.CommunityStreamBookmarks : ASFilters.BookMarksFilter));
					break;
				case (cont("ASWidgetFilterCommunities")):
					getActivityStreamEntries(currentActivityStreamType, (isCommunity ? ASFilters.CommunityStreamCommunities : ASFilters.CommunitiesFilter));
					break;
				case (cont("ASWidgetFilterFiles")):
					getActivityStreamEntries(currentActivityStreamType, (isCommunity ? ASFilters.CommunityStreamFiles : ASFilters.FilesFilter));
					break;
				case cont("ASWidgetFilterForums"):
					getActivityStreamEntries(currentActivityStreamType, (isCommunity ? ASFilters.CommunityStreamForums : ASFilters.ForumsFilter));
					break;
				case cont("ASWidgetFilterPeople"):
					getActivityStreamEntries(currentActivityStreamType, (isCommunity ? ASFilters.CommunityStreamPeople : ASFilters.ProfilesFilter));
					break;
				case cont("ASWidgetFilterWikis"):
					getActivityStreamEntries(currentActivityStreamType, (isCommunity ? ASFilters.CommunityStreamWikis : ASFilters.WikisFilter));
					break;
				case cont("ASWidgetFilterTags"):
					getActivityStreamEntries(currentActivityStreamType, (isCommunity ? ASFilters.CommunityStreamTags : ASFilters.TagFilter));
					break;
				default:
					getActivityStreamEntries(currentActivityStreamType, (isCommunity ? ASFilters.CommunityStreamAll : ASFilters.AllForMe));
			}
		};


		// START checkSavedSettings
		function checkSavedSettings() { // read a Widget editor configuration in case there is a conf set.
			var readSettingsFunc = X.T.getCustomPropertieValue,
				community;
			if ($.isFunction(X.T.getXccPropertyByName) && (!$.isFunction(X.T.getCustomPropertieValue))) {
				readSettingsFunc = X.T.getCustomPropertyValue;
			}
			community = widgetData.communitiesContentString && widgetData.communitiesContentString.length ? JSON.parse(widgetData.communitiesContentString) : {};
			savedSettings.useCommunity = readSettingsFunc('useCommunity', widgetData);
			savedSettings.showShareBox = readSettingsFunc('showShareBox', widgetData);
			savedSettings.showNavigation = readSettingsFunc('showNavigation', widgetData);
			savedSettings.showJoinComBtn = readSettingsFunc('showJoinComBtn', widgetData);
			savedSettings.defaultNaviPoint = readSettingsFunc('naviPoints', widgetData);
			savedSettings.useDefaultStyle = !(localizeString("ASWidget-layout-orientMe", "OrientMe").toLowerCase() === (readSettingsFunc('layout', widgetData) || '').toLowerCase());
			savedSettings.communityUuid = community && community[0] && community[0].uid ? community[0].uid : 0;
			savedSettings.hasCommunity = (0 !== savedSettings.communityUuid) && savedSettings.communityUuid.length;
			return true;
		}


		// END checkSavedSettings

		X.require(["embedded", "profiles"], function() {
			//X.T.loadCSS('/xcc/rest/public/custom/ASWidget.css');
			ownProfile = X.P.getProfile(); // save the own profile object in a global variable to access it several times
			ownProfile.ownUserId = ownProfile.getUserId();
			ownProfile.ownPictureUrl = getspecifiedURL(ownProfile.ownUserId, "picture");
			ownProfile.ownProfileUrl = getspecifiedURL(ownProfile.ownUserId, "profile");
			ownProfile.ownEmail = ownProfile.getEmail();

			checkSavedSettings();
			checkStreamTypeAndLoadIt(savedSettings);
		});
	}


	// END createActivityStreamWidget

	X.define([], function() {
		return createActivityStreamWidget;
	});
}(window, jQuery));
<%--

Meine Aktivitäten - als weiteren Menüpunkt einfügen

--%><tr><%--
--%><td class="lotusNowrap" id="headerMyActivities"><%--
	--%><lc-ui:serviceLink serviceName="activities" var="urlActivities" /><%--
		--%><a href="<c:out value="${urlActivities}" />/service/html/mainpage#dashboard,myactivities"><%--
			 --%><strong><fmt:message key="connections.component.name.activities" /></strong><%--
		--%></a><%--
      --%></td><%--
   --%></tr><%--
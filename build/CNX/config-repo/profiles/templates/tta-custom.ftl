<#import "commonUtil.ftl" as util>
<#compress>


<#function intranetLanguages>
	<#local params=[]/>
	<#return
		[
		{ "label": util.bundleResource(nls.customBundle, "tta.languages.english", params), "value":"en" },
        { "label": util.bundleResource(nls.customBundle, "tta.languages.german", params), "value":"de" }


		]
	/>
</#function>

</#compress>

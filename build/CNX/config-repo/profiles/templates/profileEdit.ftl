-----------

Code, der in ProfileEdit eingefügt werden muss!

direkt unter <#import "commonUtil.ftl" as util>

------------------------------


<#import "tta-custom.ftl" as custom>


-----------------------------
Language selection - im contactInformation Bereich
-----------------------------

<#-- Custom TTA Language form control -->
<@util.renderFormControl ref="language" options=custom.intranetLanguages() isSelect=true singleColumnLayout=false nlsKey="tta.label.language" nlsBundle="customBundle"/>

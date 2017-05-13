var args = $.args;
Alloy.Globals.deaRegNum = null;
var orderId = args.orderId;
var deaRegNum = args.deaRegNum;

Alloy.Globals.deaRegNum = args.deaRegNum;

alert(Alloy.Globals.deaRegNum);

$.lblPageTitle.text = L('pending_order_form_title');
$.lblDeclaration.text = L('pending_order_declaration');
$.btnSign.title = L('sign_order');
$.lblSellerDeaRegistrationNumber.text = "Supplier's DEA Registration No. RA0314562";
$.lblInstructionsForUse.text = L('pending_order_instructions');

getSessionServiceThenOrderDetail(orderId);

function getSessionServiceThenOrderDetail(orderId){
	var url = "http://"+Alloy.Globals.hostIP+":6080/cyclone/services/SessionService";
	
	var sessionRequest = 
		"<x:Envelope xmlns:x='http://schemas.xmlsoap.org/soap/envelope/' xmlns:ses='http://cyclonecommerce.com/cyclone/services/sessionService'>
			<x:Header/>
			<x:Body>
				<ses:login>
					<ses:userId>"+Alloy.Globals.username+"</ses:userId>
					<ses:password>"+Alloy.Globals.password+"</ses:password>
				</ses:login>
			</x:Body>
		</x:Envelope>";
	
	var xhr = Ti.Network.createHTTPClient({
	    onload: function(e) {
			
			var xml = this.responseXML;
			var session = xml.documentElement.getElementsByTagName("loginReturn").item(0).textContent;

			getOrderDetailWebService(session, orderId);

			$.activityIndicator.hide();
	    },
	    onerror: function(e) {
            alert("Failed to obtain session token.");
            $.activityIndicator.hide();
	        return false;
	    },
	    timeout:10000  /* in milliseconds */
	});
	
	xhr.open("POST", url, false);
	xhr.setRequestHeader('Content-Type','text/xml');
	xhr.setRequestHeader('SOAPAction','login');
	xhr.send(sessionRequest);
}

function getOrderDetailWebService(session, orderId){

	var url = "http://"+Alloy.Globals.hostIP+":6080/cyclone/services/MessageQueryService";
	
	var pendingOrdersQuery = 
	"<x:Envelope xmlns:x='http://schemas.xmlsoap.org/soap/envelope/' xmlns:mes='http://cyclonecommerce.com/cyclone/services/messageQueryService'>
	    <x:Header/>
	    <x:Body>
	        <mes:getMessages>
	            <mes:cookie>"+session+"</mes:cookie>
	            <mes:request>
	                <mes:fromPage>1</mes:fromPage>
	                <mes:maxResults>100</mes:maxResults>
	                <mes:queryInfo>
	                	<mes:coreId>"+orderId+"</mes:coreId>
	                    <mes:sortOption>
	                        <mes:ascendingOrder>true</mes:ascendingOrder>
	                        <mes:sortOption>0</mes:sortOption>
	                    </mes:sortOption>
	                </mes:queryInfo>
	            </mes:request>
	        </mes:getMessages>
	    </x:Body>
	</x:Envelope>";
	
	var xhr = Ti.Network.createHTTPClient({
	    onload: function(e) {
			
			var xml = this.responseXML;
			orderedItems = [];
			
			var xmlMessages = xml.documentElement.getElementsByTagName("messages");
			var xmlMessagesCount = xmlMessages.length;

			for (var i=0; i < xmlMessagesCount; i++){
				
				var oDate = xmlMessages.item(i).getElementsByTagName("originationDate").item(0).textContent;

				// Convert originationDate to MM-DD-YYYY format (no i18n/L10n is needed as this is a US only regulation)
				var date = new Date(oDate);
				
				//var tzo = (Number(date.getTimezoneOffset())/-60)
				
				$.lblOrderDate.text = ("0"+(date.getMonth()+1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2) + "-" + date.getFullYear();
								
				var coreId = xmlMessages.item(i).getElementsByTagName("coreId").item(0).textContent;
				var senderPartyId = xmlMessages.item(i).getElementsByTagName("senderPartyId").item(0).textContent;
				var senderPartyName = xmlMessages.item(i).getElementsByTagName("senderPartyName").item(0).textContent;
				var senderRoutingId = xmlMessages.item(i).getElementsByTagName("senderRoutingId").item(0).textContent;

				var receiverPartyId = xmlMessages.item(i).getElementsByTagName("receiverPartyId").item(0).textContent;
				var receiverRoutingId = xmlMessages.item(i).getElementsByTagName("receiverRoutingId").item(0).textContent;				
				
				$.lblSellerName.text = "To: "+xmlMessages.item(i).getElementsByTagName("receiverPartyName").item(0).textContent+", 2915 Weston Rd, Weston, FL 33331";

				var xmlMetadataAttributes = xmlMessages.item(i).getElementsByTagName("metaDataAttributes").item(0).getElementsByTagName("item");
				var xmlMetadataAttributesCount = xmlMetadataAttributes.length;

				for (var j=0; j < xmlMetadataAttributesCount; j++){
					if(xmlMetadataAttributes.item(j).getElementsByTagName("name").item(0).textContent == "CsosPoNumber"){
						var po = xmlMetadataAttributes.item(j).getElementsByTagName("value").item(0).textContent;
						$.lblOrderNumber.text = "No. of this Order Form "+po;
					}
					if(xmlMetadataAttributes.item(j).getElementsByTagName("name").item(0).textContent == "CsosDeaRegistrationNumber"){
						var pdrn = xmlMetadataAttributes.item(j).getElementsByTagName("value").item(0).textContent;
						$.lblPurchaserDeaRegistrationNumber.text = "Purchaser's DEA Registration No. "+pdrn;
					}
				}
				$.lblPurchaserNameAndAddress.text = "MEDICAL PARK PHARMACY LTC 4118 5TH STREET ROAD HUNTINGTON, WV, 25701";
				
				for (var k=1; k < 11; k++){
					var line = k;
					var quantity = "5";
					var packageSize = "946 ml";
					var itemName = "KADIAN 30 MG SR CAP 100";
					var ndc = "46987032511";
					
					orderedItems.push({
						lineNumber:{text:line},
						quantityOrdered:{text:quantity},
						sizeOfPackages:{text:packageSize},
						itemName:{text:itemName},
						ndc:{text:ndc},
						template:'orderedItemsTemplate'}
					);
				}
			}
			$.orderedItemsListSection.setItems(orderedItems);
			$.activityIndicator.hide();
	    },
	    onerror: function(e) {
            alert("Failed to obtain message detail.");
            $.activityIndicator.hide();
	        return false;
	    },
	    timeout:10000  /* in milliseconds */
	});
	xhr.open("POST", url, false);
	xhr.setRequestHeader('Content-Type','text/xml');
	xhr.setRequestHeader('SOAPAction','getMessages');
	xhr.send(pendingOrdersQuery);
}
function btnSignClicked(){

	getCertificateId(
		Alloy.Globals.deaRegNum,
		function signOrder(certificateId){
			var url = "http://"+Alloy.Globals.hostIP+":6080/rest/v1/csos/document/sign/";
			
			var xhr = Ti.Network.createHTTPClient({
			    onload: function(e) {
					var response = JSON.parse(this.responseText);
					alert(this.responseText);
					alert("Order hase been successfully signed.")
					// close orderDetailWindow and re-open ViewPendingOrders...
					$.activityIndicator.hide();
				},
			    onerror: function(e) {
					$.activityIndicator.hide();
		            alert("Sign Clicked Error: "+e.error);
			        return false;
			    },
			    timeout:10000  /* in milliseconds */
			});
			$.activityIndicator.show();
			xhr.setRequestHeader('certificatePassword',$.txtCertificatePassword.text);
			xhr.setRequestHeader('certificateId',certificateId);
			xhr.setRequestHeader('Authorization','Basic '+Alloy.Globals.creds);
			xhr.open("POST", url);
			xhr.send();
		}
	);
}
function mnuLogoutClicked() {
	var rememberMeFromProperties = Ti.App.Properties.getBool('remember'); 
	Ti.App.fireEvent('cleanUpAfterLogoutEvent');
	Alloy.createController('login').getView().open();
}
function mnuAboutClicked() {
	alert("about");
}
function getCertificateId(deaRegNum, callback) {
	var url = "http://"+Alloy.Globals.hostIP+":6080/rest/v1/users/security/certificate/private?limit=50&offset=0";
	
	var xhr = Ti.Network.createHTTPClient({
	    
	    onload: function(e) {
	    	
			var response = JSON.parse(this.responseText);

			for(var i in response.results){
				
				// Using the @ symbol in a key value pair key requires a two step process
				var id = "@id";
				var certificateId = response.results[i][id];
				var deaRegistrationNumber = response.results[i].metadata.DEA;

				alert("CertId "+certificateId+", deaReg "+deaRegistrationNumber);

				if (deaRegistrationNumber == deaRegNum){
					callback && callback(certificateId);
				}
			}
		},
	    onerror: function(e) {
			$.activityIndicator.hide();
            alert("Get Cert Error: "+e.error);
	        return false;
	    },
	    timeout:10000  /* in milliseconds */
	});
	$.activityIndicator.show();
	xhr.open("GET", url);
	xhr.send();
}
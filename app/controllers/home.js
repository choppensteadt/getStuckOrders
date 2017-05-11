var args = arguments[0];
var deaRegNum = args.deaRegistrationNumber;

$.activityIndicator.show();

$.btnPendingOrders.setBorderColor("#407CA0");

getSessionServiceThenPendingOrders(deaRegNum);

function btnPendingOrdersPressed(){
	getSessionServiceThenPendingOrders(deaRegNum);
}
function getSessionServiceThenPendingOrders(deaRegNum){
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

			getPendingOrdersWebService(session, deaRegNum);

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

function getPendingOrdersWebService(session, deaRegNum){

	$.btnCertificates.setBorderColor("white");	
	$.btnPendingOrders.setBorderColor("#407CA0");

	$.lvwCertificates.hide();
	$.lvwOrders.show();	

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
	                	<mes:messageDirection>0</mes:messageDirection>
	                    <mes:metaDataAttribute>
	                        <mes:name>CsosIsPendingOrder</mes:name>
	                        <mes:value>true</mes:value>
	                        <mes:name>CsosDeaRegistrationNumber</mes:name>
	                        <mes:value>"+deaRegNum+"</mes:value>
	                    </mes:metaDataAttribute>
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
			messages = [];
			
			var xmlMessages = xml.documentElement.getElementsByTagName("messages");
			var xmlMessagesCount = xmlMessages.length;

			for (var i=0; i < xmlMessagesCount; i++){
				
				var oDate = xmlMessages.item(i).getElementsByTagName("originationDate").item(0).textContent;

				// Convert originationDate to MM-DD-YYYY format (no i18n/L10n is needed as this is a US only regulation)
				var date = new Date(oDate);
				var tzo = (Number(date.getTimezoneOffset())/-60)
				
				var originationDate = ("0"+(date.getMonth()+1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2) + "-" + date.getFullYear()+ " " +date.getHours() + ":" + date.getMinutes() + " (" + tzo.toString() + ")";

				var coreId = xmlMessages.item(i).getElementsByTagName("coreId").item(0).textContent;
				var senderPartyId = xmlMessages.item(i).getElementsByTagName("senderPartyId").item(0).textContent;
				var senderPartyName = xmlMessages.item(i).getElementsByTagName("senderPartyName").item(0).textContent;
				var senderRoutingId = xmlMessages.item(i).getElementsByTagName("senderRoutingId").item(0).textContent;

				var receiverPartyId = xmlMessages.item(i).getElementsByTagName("receiverPartyId").item(0).textContent;
				var receiverPartyName = xmlMessages.item(i).getElementsByTagName("receiverPartyName").item(0).textContent;
				var receiverRoutingId = xmlMessages.item(i).getElementsByTagName("receiverRoutingId").item(0).textContent;

				var senderReceiverString = senderPartyName+" > "+receiverPartyName;

				var xmlMetadataAttributes = xmlMessages.item(i).getElementsByTagName("metaDataAttributes").item(0).getElementsByTagName("item");
				var xmlMetadataAttributesCount = xmlMetadataAttributes.length;

				for (var j=0; j < xmlMetadataAttributesCount; j++){
					if(xmlMetadataAttributes.item(j).getElementsByTagName("name").item(0).textContent == "CsosPoNumber"){
						var csosPoNumber = xmlMetadataAttributes.item(j).getElementsByTagName("value").item(0).textContent;
						var poNumberString = "PO #: "+csosPoNumber;
					}
					if(xmlMetadataAttributes.item(j).getElementsByTagName("name").item(0).textContent == "CsosDeaRegistrationNumber"){
						var csosDeaRegistrationNumber = xmlMetadataAttributes.item(j).getElementsByTagName("value").item(0).textContent;
						var deaRegistrationNumberString = "DEA #: "+csosDeaRegistrationNumber;
					}
				}
				messages.push({
					senderRoutingID:{text:senderReceiverString},
					originationDate:{text:originationDate},
					csosPoNumber:{text:poNumberString},
					csosDeaRegistrationNumber:{text:deaRegistrationNumberString},
					id:{text:coreId},
					template:'orderDetailTemplate'
				});
			}
			$.orderListSection.setItems(messages);
			$.activityIndicator.hide();
	    },
	    onerror: function(e) {
            alert("Failed to obtain messages.");
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
function openOrderDetail(e) {
	var order = $.orderListSection.getItemAt(e.itemIndex);
	var orderId = order.id.text;
	var args = {"orderId":orderId};
	var signing = Alloy.createController('signing',args).getView();
	signing.open();
}
function getCertificates() {
	$.btnPendingOrders.setBorderColor("#white");
	$.btnCertificates.setBorderColor("#407CA0");

	$.lvwOrders.hide();	
	$.lvwCertificates.show();

	var url = "http://"+Alloy.Globals.hostIP+":6080/rest/v1/users/security/certificate/private?limit=50&offset=0";
	
	var xhr = Ti.Network.createHTTPClient({
	    
	    onload: function(e) {
	    	
			var response = JSON.parse(this.responseText);
			var certificates = [];

			for(var i in response.results){
				
				// Using the @ symbol in a key value pair key requires a two step process
				var id = "@id";
				var certificateId = response.results[i][id];
				var certificateName = response.results[i].friendlyName;
				var certificateState = response.results[i].certificateState;
				var validFrom = response.results[i].validFrom;
				var validTo = response.results[i].validTo;
				var deaRegistrationNumber = response.results[i].metadata.DEA;

				// Convert date to MM-DD-YYYY format (no i18n/L10n is needed as this is a US only regulation)
				var date = new Date(validTo);
				var validToDate = "Expires: "+("0"+(date.getMonth()+1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2) + "-" + date.getFullYear();
				
				var deaRegistrationNumberString = "DEA #: "+deaRegistrationNumber;

				certificates.push({
					id:{text:certificateId},
					certificateName:{text:certificateName},
					certificateState:{text:certificateState},
					validFrom:{text:validFrom},
					validTo:{text:validToDate},
					deaRegistrationNumber:{text:deaRegistrationNumberString},
					template:'certificatesTemplate'}
				);
					
				// Sort in ascending order
				certificates.sort(function(a, b) {
				return a[0] - b[0];
				});
			}
			$.certificateListSection.setItems(certificates);
			$.activityIndicator.hide();
		},
	    onerror: function(e) {
			$.activityIndicator.hide();
            alert(e.error);
	        return false;
	    },
	    timeout:10000  /* in milliseconds */
	});
	$.activityIndicator.show();
	xhr.open("GET", url);
	xhr.send();
}
function mnuLogoutClicked() {
	var rememberMeFromProperties = Ti.App.Properties.getBool('remember'); 
	Ti.App.fireEvent('cleanUpAfterLogoutEvent');
	Alloy.createController('login').getView().open();
}
function mnuAboutClicked() {
	alert("about");
}
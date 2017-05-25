getSessionServiceThenStuckFiles();

function getSessionServiceThenStuckFiles(){
	
	var url = "http://208.67.130.145:6080/cyclone/services/SessionService";
	
	var sessionRequest = 
		"<x:Envelope xmlns:x='http://schemas.xmlsoap.org/soap/envelope/' xmlns:ses='http://cyclonecommerce.com/cyclone/services/sessionService'>
			<x:Header/>
			<x:Body>
				<ses:login>
					<ses:userId>admin</ses:userId>
					<ses:password>Secret2</ses:password>
				</ses:login>
			</x:Body>
		</x:Envelope>";
	
	var xhr = Ti.Network.createHTTPClient({
	    onload: function(e) {
			var xml = this.responseXML;
			var session = xml.documentElement.getElementsByTagName("loginReturn").item(0).textContent;
			getStuckFiles(session);
	    },
	    onerror: function(e) {
            alert("Failed to obtain session token.");
	        return false;
	    },
	    timeout:10000  /* in milliseconds */
	});
	xhr.open("POST", url, false);
	xhr.setRequestHeader('Content-Type','text/xml');
	xhr.setRequestHeader('SOAPAction','login');
	xhr.send(sessionRequest);
}
function getStuckFiles(session){

	var url = "https://208.67.130.162:8065/cyclone/services/MessageQueryService";

	var stuckMessagesQuery = 
	"<x:Envelope xmlns:x='http://schemas.xmlsoap.org/soap/envelope/' xmlns:mes='http://cyclonecommerce.com/cyclone/services/messageQueryService'>
	    <x:Header/>
	    <x:Body>
	        <mes:getMessages>
	            <mes:cookie>"+session+"</mes:cookie>
	            <mes:request>
	                <mes:fromPage>1</mes:fromPage>
	                <mes:maxResults>100</mes:maxResults>
	                <mes:queryInfo>
						<mes:originationDate>
							<mes:beginDate>2017-01-01T14:53:48.819Z</mes:beginDate>
							<mes:endDate>2017-06-09T14:53:48.819Z</mes:endDate>
						</mes:originationDate>
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
	    	var rows = [];
			var xml = this.responseXML;			
			var xmlMessages = xml.documentElement.getElementsByTagName("messages");
			var xmlMessagesCount = xml.documentElement.getElementsByTagName("messages").item(0).getChildNodes().length;

			for (var i=0; i < xmlMessagesCount; i++){
				
				var oDate = xmlMessages.item(0).getElementsByTagName("originationDate").item(i).textContent;
				var date = new Date(oDate);
				var tzo = (Number(date.getTimezoneOffset())/-60)
				
				var originationDate = ("0"+(date.getMonth()+1)).slice(-2) + "-" + ("0" + date.getDate()).slice(-2) + "-" + date.getFullYear()+ " " +date.getHours() + ":" + date.getMinutes() + " (" + tzo.toString() + ")";

				var coreId = xmlMessages.item(0).getElementsByTagName("coreId").item(i).textContent;
				var deliveredTF = xmlMessages.item(0).getElementsByTagName("delivered").item(i).textContent;
				var senderPartyName = xmlMessages.item(0).getElementsByTagName("senderPartyName").item(i).textContent;
				var receiverPartyName = xmlMessages.item(0).getElementsByTagName("receiverPartyName").item(i).textContent;
				var senderReceiverString = senderPartyName+" > "+receiverPartyName;

				var xmlMetadataAttributes = xmlMessages.item(0).getElementsByTagName("metaDataAttributes").item(i).getElementsByTagName("item");
				var xmlMetadataAttributesCount = xmlMetadataAttributes.length;

				for (var j=0; j < xmlMetadataAttributesCount; j++){
					if(xmlMetadataAttributes.item(j).getElementsByTagName("name").item(0).textContent == "Direction"){
						var messageDirection = xmlMetadataAttributes.item(j).getElementsByTagName("value").item(0).textContent;
					}
					if(xmlMetadataAttributes.item(j).getElementsByTagName("name").item(0).textContent == "ConsumptionFilename"){
						var fileName = xmlMetadataAttributes.item(j).getElementsByTagName("value").item(0).textContent;
					}					
				}

				if(deliveredTF == "false"){
					rows.push({
						senderReceiverString:{text:senderReceiverString},
						messageDirection:{text:messageDirection},
						fileName:{text:fileName},
						originationDate:{text:originationDate},
						template:'stuckMessagesTemplate'
					});
				}
			}
			$.mListSection.setItems(rows);	
	    },
	    onerror: function(e) {
            alert("Failed to obtain messages.");
	        return false;
	    },
	    timeout:10000  /* in milliseconds */
	});
	xhr.open("POST", url, false);
	xhr.setRequestHeader('Content-Type','text/xml');
	xhr.setRequestHeader('SOAPAction','getMessages');
	xhr.setRequestHeader('KeyId','a20dc82c-3899-4441-bdc2-dad4da576c36');
	xhr.send(stuckMessagesQuery);
}

var username = localStorage.getItem("username");
if(!username){
  username = prompt("Please enter Display Name");
  localStorage.setItem("username", username);
}

var currentChannel = localStorage.getItem("channel");
// if (!currentChannel){
//   currentChannel = "General";
//   localStorage.setItem("channel", currentChannel);
// }


function changeChannel(){
  const request = new XMLHttpRequest();
  request.open('POST','/changechannel');
  request.onload = () => {
    const data = JSON.parse(request.responseText);
    var message = data.message;
    const length = message.length;
    messageBody = document.getElementById("messages");
    while (messageBody.firstChild) {
      messageBody.removeChild(messageBody.lastChild);
    }
    for (var i =0 ; i<length;i++){
      let messageElement = document.createElement('p');
      let curr_data = message[i];
      let curr_message = curr_data["text"];
      let curr_user = curr_data["username"];
      let curr_type = curr_data['type'];
      if (curr_type === "text") {
        messageElement.innerHTML = `${curr_user}: ${curr_message}`;
        messageBody.appendChild(messageElement);
      }

      if (curr_type === 'file') {
        messageElement.innerHTML=`${curr_user}: ${curr_message} (FILE)`;
        let messageAnchor = document.createElement('a');
        messageAnchor.setAttribute('file-name', curr_message);
        messageAnchor.setAttribute('class',"files");
        messageAnchor.setAttribute('href','#');
        messageAnchor.appendChild(messageElement);
        messageBody.appendChild(messageAnchor);
      }

    }

    messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight;
  };

  const data_ = new FormData();
  data_.append('channelName', localStorage.getItem("channel"));
  request.send(data_);
  return false;
}



document.addEventListener('DOMContentLoaded', () => {



  //populate side bar with channels
  var channelRequest = new XMLHttpRequest();
  var channelsElement = document.getElementById('channels');
  channelRequest.open('GET','/requestchannels');
  channelRequest.onload = () => {
    const channelData = JSON.parse(channelRequest.responseText);
    channelsList = channelData.channels;
    for (var i = 0; i<channelsList.length; i++){
      let channelSpan = document.createElement('span');
      let channelButton = document.createElement('button');
      channelButton.setAttribute('class','channels__button');
      channelSpan.innerHTML = channelsList[i];
      channelButton.appendChild(channelSpan);

      if (currentChannel === channelsList[i]){
        channelButton.style.backgroundColor = "#bdd0f6";
      }

      channelsElement.appendChild(channelButton);
    }
  }



  channelRequest.send();

  if (!currentChannel){
    document.getElementById('submitButton').disabled = true;
    document.getElementById('message').disabled = true;
    document.forms.namedItem("fileinfo").disabled = true;
    document.getElementById('chooseFile').disabled = true;
    document.getElementById('submitFile').disabled = true;
  }
  else{
    changeChannel();
  }



  var userElement = document.getElementById('username');

  userElement.innerHTML = username;
  //connect websocket
  var socket = io.connect(location.protocol + "//" + document.domain + ':' + location.port);

  socket.on('connect', () => {
    submitButton = document.getElementById('submitButton');
    createChannelButton = document.getElementById('createChannel');
    submitButton.onclick = () => {

      //emit message
      var messageElement = document.getElementById('message');
      let message = messageElement.value;
      messageElement.value = "";
      socket.emit('textSubmit',{"text":message, "username":username, "currentChannel":currentChannel, "type": "text"});


    };

    //create new channel
    createChannelButton.onclick = () => {
      var channelname = prompt("Enter new Channel name")
      if (channelname != null && channelname != ""){
        socket.emit('createChannelReq',{"channelName":channelname});
      }
    };

    //send file
    var form = document.forms.namedItem("fileinfo");
    form.addEventListener('submit', function(ev){
      var fileData = new FormData(form);
      var request = new XMLHttpRequest();
      request.open('POST','/uploadfile');
      //onload, emit text submit
      request.onload = () => {
        const data = JSON.parse(request.responseText);
        let message = data.message;
        socket.emit('textSubmit',{"text":message, "username":username, "currentChannel":currentChannel, "type": "file"});
      }
      request.send(fileData);
      ev.preventDefault();
    })

    //receive file

    document.getElementById('messages').addEventListener("click",function(button){
      // alert(button.target.parentNode.nodeName)
      if (button.target.parentNode.nodeName === 'A') {
        parent = button.target.parentNode;
        var filename = parent.getAttribute("file-name");
        var request = new XMLHttpRequest();
        request.open('POST','/downloadfile');
        request.responseType = "blob";
        request.onload = () => {
          if (request.status === 200) {
            const blob = new Blob([request.response]);
            var a = document.createElement("a");
            a.href = window.URL.createObjectURL(blob);
            a.download = filename;
            document.body.appendChild(a); // won't work in firefox otherwise
            a.click();
          }
          else{
            alert('Error');
          }
        }

        let data_ = new FormData();
        data_.append('filename',filename);
        request.send(data_);
        return false;
      }
    });


  });

  //use enter key to submit button
  var input = document.getElementById("message");
  input.addEventListener("keyup", function(event) {
  if (event.keyCode === 13) {
   event.preventDefault();
   document.getElementById("submitButton").click();
  }
});


  //change channel
  document.getElementById('channels').addEventListener("click", function(button){

    if(button.target.parentNode.nodeName.toLowerCase() == "button"){
      var children = button.target.parentNode.parentNode.children;
      for (var i = 0; i < children.length; i++) {
        children[i].style.backgroundColor = 'transparent';
        // Do stuff
      }

      button.target.parentNode.style.backgroundColor = "#bdd0f6";
      document.getElementById('submitButton').disabled = false;
      document.getElementById('message').disabled = false;
      document.forms.namedItem("fileinfo").disabled = false;
      document.getElementById('chooseFile').disabled = false;
      document.getElementById('submitFile').disabled = false;
      var newChannel = button.target.innerHTML;

      currentChannel = newChannel;
      localStorage.setItem("channel", currentChannel);

      changeChannel();

    }

  });






  socket.on('createChannel', data => {
    const button = document.createElement('button');
    const span = document.createElement('span');
    const br = document.createElement('br');
    button.className = "channels__button";
    span.innerHTML = data.channelName;
    button.appendChild(span);
    sidebar = document.getElementById("channels");
    sidebar.appendChild(br);
    sidebar.appendChild(button);
});

  socket.on('showText', data => {
    if (data.currentChannel === localStorage.getItem("channel")){
      var messageBody = document.getElementById("messages");
      var messageElement = document.createElement('P');

      if (data.type === "text"){
        messageElement.innerHTML=`${data.username}: ${data.text}`;
        messageBody.appendChild(messageElement);
      }
      if (data.type === 'file'){
        messageElement.innerHTML=`${data.username}: ${data.text} (FILE)`;
        let messageAnchor = document.createElement('a');
        messageAnchor.setAttribute('file-name', data.text);
        messageAnchor.setAttribute('class',"files");
        messageAnchor.setAttribute('href','#');
        messageAnchor.appendChild(messageElement);
        messageBody.appendChild(messageAnchor);
      }

      messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight;


    }
  });



});

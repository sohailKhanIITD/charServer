window.onload = function () {
    var socket = io();
    var room = "room2";
    var sendButton = document.querySelector('#button');
    var chatRoom = document.querySelector('#chat_room');
    socket.emit('room', { room: room });
    sendButton.addEventListener("click", function () {
        var msg = document.querySelector('#chat_message').value;
        socket.emit('chat message', { msg: msg, room: room });
        return false;
    });
    socket.on('chat message', function (data) {
        console.log(data);
        chatRoom.innerHTML = chatRoom.innerHTML + "<p>MESSAGE: " + data["msg"] + "</p>";
    });
}
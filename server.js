/*
	asdfafsdasd
*/

// _______ CORE ____________

var _rooms = {}; // Conjunto de salas
var _message_queue = {}; // Mapa de filas de mensagens dos usuários
var _notification_queue = {}; // Mapa da fila de notificações

var PUSH_INTERVAL = 1000;

// Rooms manipulation

function CreateRoom(room){
	_rooms[room] = new Set();
};

function DeleteRoom(room){
	for (user in _rooms[room]){
		EnqueueMessageToUser("Room has closed", user);
	};
	delete _rooms[room];
};

function GetRooms(){
	return Object.keys(_rooms);
}

// Rooms activity

function UserJoinRoom(user, room){
	_rooms[room].add(user);
};

function UserLeavesRoom(user, room){
	_rooms[room].delete(user);
};

// User Activity

function GetUserQueue(user) {
	// função emula um defaultdict() 
    if (!(user in _queues)) {
        _message_queues[user] = [];
    }
    return _message_queues[user]
}


// Messages activity

function UserSendMessageToRoom(sender, message, room){
	message.room = room;
	message.sender = sender;

	// _rooms[room] retorna o Set() de usuários daquela sala
	_rooms[room].forEach(function(user){
		EnqueueMessageToUser(message, user);
	});
};

function GetUserMessages(user){
    queue = _message_queue[user];
    messages = [];
    // A linha abaixo tem problema de condição de corrida, mas isso é somente uma POC. 
    while(queue.length) messages.push(queue.pop());
    _notification_queue[user] = false;
    return messages;
};

function EnqueueMessagToUser(message, user){
	queue = GetUserQueue(user);
	queue.push(message);
};

// Itera o mapa de clients, verifica se existem mensagens e o notifica.
function NotifyMessageToUser() {
    for (var user in _message_queue) {
    	queue = GetUserQueue(user)
        if (queue.length > 0 && _notification_queue[user] == false) {
            // Notify client
            _notification_queue[user] == true;
            console.log("notifying ", user);
        }
    }
};

setInterval(NotifyMessageToUser, PUSH_INTERVAL);


// __________ API ______________

var express = require('express');
var app = express();
PORT = 5555;

// Get, consulta se o usuário tem mensagens. Note que as mensagens contém as informações de sala e remetente.
app.get('/read/:user', function (req, res) {
    user_id = req.params.user;
    message = GetUserMessages(user_id);
    if (message != undefined) {
        console.log("message read from " + user_id + ": " + message);
        res.send( message );
    }
});

// Post, manda mensagem para uma determinada sala.
app.post('/send/:room/:user', function (req, res) {
    user_id = req.params.user;
    room_id = req.params.room

    // http://blog.frankgrimm.net/2010/11/howto-access-http-message-body-post-data-in-node-js/
    message = ""
    req.on('data', function(chunk) {
      message += chunk.toString();
    });
    
    req.on('end', function() {
        console.log("new message to room " + room_id + ": " + message);
        UserSendMessageToRoom(user_id, message, room_id);
        res.send('OK');
    });    
});


app.get('/rooms/', function(req, res){
	res.send(GetRooms()) // Todo: Colocar os links tratados
});


// _____ Principal _____

console.log('listening in localhost:%d', PORT);

CreateRoom("Default");

app.listen(PORT);

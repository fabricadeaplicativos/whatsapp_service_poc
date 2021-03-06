﻿/*
    POC para fornecer um back-end simples para um sistema de troca de mensagens
    
    @author flaminio
    @date 2015-07-14
    
    DISCLAIMER: Este é meu primeiro código em node.js, favor relevar :)


___ USO ___

node server_queue.js

Para mandar uma mensagem para o usuário <user>:

POST http://host:port/<user>/  MESSAGE

Para ler uma mensagem do usuário <user>:

GET http://host:port/<user>/ 

Por hora é só isso.
*/

// Imports
var express = require('express');

// _____ Lógica principal da manipulação de filas _____

var _queues = {} // Mapa 'client' -> 'queue';
var _contacts = []; // Conjunto de users

// Contacts manipulation

function CreateContact(user){
    _contacts.push(user);
};

function DeleteContact(user){
    delete _contacts[user];
};

function GetContacts(){
    return _contacts;
}

// Função para emular um defaultdict(list)
function GetQueue(client) { 
    if (!(client in _queues)) {
        _queues[client] = [];
    }
    return _queues[client]
}

// Checa se o cliente tem mensagens não lidas
function CountUnreadMessages(client) { 
    queue = GetQueue(client);
    return queue.length;
}

// Retira a próxima mensagem da fila do cliente
function GetUnreadMessage(client) {
    queue = GetQueue(client);
    return queue.shift();
}

// Retira toda a fila de mensagens do cliente
function GetAllUnreadMessages(client) {
    queue = GetQueue(client);
    messages = [];
    // A linha abaixo tem problema de condição de corrida, mas isso é somente uma POC. 
    while(queue.length) messages.push(queue.pop());
    return messages;
}

// Envia uma mensagem a um cliente
function EnqueueMessageToClient(message, client) {
    queue = GetQueue(client);
    queue.push(message);
    // notify aqui?
}

// _____ API _____

var app = express();
PORT = 5555;

// Get, consulta se o usuário tem mensagens
app.get('/message/:id', function (req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    messages = [];
    user_id = req.params.id;
    message = GetUnreadMessage(user_id);
    while (message){
        console.log("message read from " + user_id + ": " + message);
        messages.push(message);
        message = GetUnreadMessage(user_id);
    }
    //if (message != undefined) {
        res.send( messages );
    //} else {
    //    res.status(404).send();
    //}
});

// Post, manda mensagem para o usuário
app.post('/message/:id', function (req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    user_id = req.params.id;

    // http://blog.frankgrimm.net/2010/11/howto-access-http-message-body-post-data-in-node-js/
    message = ""
    req.on('data', function(chunk) {
      message += chunk.toString();
    });
    
    req.on('end', function() {
        console.log("new message to " + user_id + ": " + message);
        EnqueueMessageToClient(message, user_id);
        res.send('OK');
    });    
});

// GET - Receber lista de contatos
app.get('/contact', function(req, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.send(GetContacts()) // Todo: Colocar os links tratados
});

// POST - Registra novo contato
app.post('/contact', function(req, res){
    message = ""
    req.on('data', function(chunk) {
        message += chunk.toString();
    });

    req.on('end', function() {
        console.log("novo contato: " + message);
        res.setHeader("Access-Control-Allow-Origin", "*");
        CreateContact(message);
        res.send('OK') // Todo: Colocar os links tratados
    }); 
});

// DELETE - Remove contato da lista
app.delete('/contact/:id', function(req, res){
    res.setHeader("Access-Control-Allow-Origin", "*");
    DeleteContact(req.params.id);
    res.send('OK') // Todo: Colocar os links tratados
});

// _____ Push Loop _____

// Itera o mapa de clients, verifica se existem mensagens e o notifica.
function push_messages() {
    for (var client in _queues) {
        if (CountUnreadMessages(client) > 0) {
            // Notify client
            // console.log("notifying ", client);
        }
    }
};
setInterval(push_messages, 1000);

// _____ Principal _____

console.log('listening in localhost:%d', PORT);
app.listen(PORT);

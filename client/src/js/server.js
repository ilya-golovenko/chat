
var Users = (function() {
    'use strict';

    var users = {
        'user1': { name: 'User1', gender: 'male', status: { text: 'ON-LINE' } },
        'user2': { name: 'User2', gender: 'female', status: { type: 'away', text: 'AWAY: 14:35' } },
        'walrus': { name: 'Walrus', gender: 'male', status: { type: 'join', text: 'ВХОД В ЧАТ' }, access: 1000 },
        'user4': { name: 'User4', gender: 'female', status: { text: 'ON-LINE' } },
        'user5': { name: 'User5', gender: 'male', status: { type: 'lost', text: 'НЕТ СВЯЗИ' } },
        'somelongusername': { name: 'SomeLongUserName', gender: 'female', status: { text: 'ON-LINE' } }
    };

    var passwords = {
        'walrus': 'test'
    };

    var styles = {
      'walrus': { image: { url: '../res/img/users/walrus.gif', width: 84, height: 28 }, text: { color: 'purple' } },
      'user1': { name: { color: 'olive', font: { family: 'Arial', size: '0.75em' } }, text: { color: 'darkgreen', font: { family: 'Arial', size: '0.75em' } } }
    };

    function loadOnlineUsers() {
        var users = sessionStorage.getItem('chat.server:online-users');

        if (users) {
            users = JSON.parse(users);
        }

        return users || [];
    }

    function saveOnlineUsers(users) {
        sessionStorage.setItem('chat.server:online-users', JSON.stringify(users));
    }

    return {
        findUser: function(name) {
            name = name.toLowerCase();

            if (users.hasOwnProperty(name)) {
                return users[name];
            }

            return undefined;
        },

        findUserStyle: function(name) {
            name = name.toLowerCase();

            if (styles.hasOwnProperty(name)) {
                return styles[name];
            }

            return undefined;
        },

        loginUser: function(name, password) {
            name = name.toLowerCase();

            if (passwords.hasOwnProperty(name)) {
                return passwords[name] === password;
            }

            return false;
        },

        getOnlineUsers: function() {
            return loadOnlineUsers();
        },

        addOnlineUser: function(name) {
            var user;

            name = name.toLowerCase();

            if (users.hasOwnProperty(name)) {
                var onlineUsers = loadOnlineUsers();
                onlineUsers.push(users[name]);
                saveOnlineUsers(onlineUsers);
                user = users[name];
            }

            return user;
        },

        removeOnlineUser: function(name) {
            var user;

            name = name.toLowerCase();

            var onlineUsers = loadOnlineUsers();

            for (var i = 0, n = onlineUsers.length; i < n; i += 1) {
                if (name === onlineUsers[i].name.toLowerCase()) {
                    user = onlineUsers[i];
                    onlineUsers.splice(i, 1);
                    saveOnlineUsers(onlineUsers);
                    break;
                }
            }

            return user;
        },

        addRandomOnlineUser: function() {

        },

        removeRandomOnlineUser: function() {
            if (onlineUsers.length > 0) {
                var random = Chat.Util.random(0, onlineUsers.length - 1);

            }
        }
    };
})();


var Messages = (function() {
    'use strict';

    function load() {
        var messages = sessionStorage.getItem('chat.server:messages');

        if (messages) {
            messages = JSON.parse(messages);
        }

        return messages || [];
    }

    function save(messages) {
        sessionStorage.setItem('chat.server:messages', JSON.stringify(messages));
    }

    return {
        add: function(message) {
            var messages = load();

            while (messages.length >= 30) {
                messages.shift();
            }

            messages.push(message);

            save(messages);
        },

        clear: function() {
            save([]);
        },

        getAll: function() {
            return load();
        }
    };
})();


var Simulator = (function() {
    function joinUser() {
    }

    function leaveUser() {
    }

    function sendPublicMessage() {
    }

    function sendPersonalMessage() {
    }


});


var Server = (function() {
    'use strict';

    // Private constants

    var alphabet = '0123456789ABCDEF';

    // Private members

    var lastMessageNum = 0;

    // Private methods

    function generateSession() {
        var session = '';

        for (var i = 0; i < 32; i += 1) {
            session += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
        }

        return session;
    }

    function addUserImageStyle(message, userStyle) {
        if (typeof userStyle.image === 'object') {
            message.nameImage = userStyle.image;
        }
    }

    function addUserNameStyle(message, userStyle) {
        var style = userStyle.name || userStyle.text;

        if (typeof style === 'object') {
            message.nameStyle = style;
        }
    }

    function addUserTextStyle(message, userStyle) {
        var style = userStyle.text || userStyle.name;

        if (typeof style === 'object') {
            message.textStyle = style;
        }
    }

    function addUserStyle(message, username) {
        var userStyle = Users.findUserStyle(username);

        if (userStyle) {
            switch (message.subtype) {
                case 'public':
                    addUserImageStyle(message, userStyle);
                    addUserNameStyle(message, userStyle);
                    addUserTextStyle(message, userStyle);
                    break;

                case 'personal':
                    addUserTextStyle(message, userStyle);
                    break;

                case 'join':
                case 'leave':
                    addUserImageStyle(message, userStyle);
                    break;
            }
        }
    }

    function publishServerEvent(event, data) {
        Chat.Events.publish('chat.server', event, data);
    }

    function sendMessage(message, username) {
        if (typeof username === 'string') {
            addUserStyle(message, username.toLowerCase());
        }

        if (message.subtype !== 'system') {
            Messages.add(message);
        }

        var session = sessionStorage.getItem('chat.server:user.session');

        if (session) {
            publishServerEvent('message', message);
        }
    }

    function sendPublicOrPrivateMessage() {
        var random = Math.random();
        var username = 'User1';

        var message = {
            subtype: 'public',
            username: username,
            timestamp: Date.now(),
            text: 'This is a ' + (random > 0.9 ? 'personal' : 'public') + ' message #' + lastMessageNum++
        };

        if (random < 0.1) {
            message.text = 'Walrus: ' + message.text;
        } else if (random > 0.9) {
            message.subtype = 'personal';
        }

        sendMessage(message, username);
    }

    function addOnlineUser(username) {
        var user = Users.addOnlineUser(username);

        if (typeof user === 'object') {
            publishServerEvent('users.join', user);

            sendJoinMessage(user.name);
        }
    }

    function removeOnlineUser(username) {
        var user = Users.removeOnlineUser(username);

        if (typeof user === 'object') {
            publishServerEvent('users.leave', user);
        }
    }

    function sendJoinMessage(username) {
        var message = {
            subtype: 'join',
            username: username,
            timestamp: Date.now(),
            text: 'Greetings to %username% who has just joined the chat room'
        };

        sendMessage(message, username);
    }

    function sendLeaveMessage(username) {
        var message = {
            subtype: 'leave',
            username: username,
            timestamp: Date.now(),
            text: '%username% has left the chat room'
        };

        sendMessage(message, username);
    }

    function sendUserList() {
        publishServerEvent('users', Users.getOnlineUsers());
    }

    function sendHistory() {
        var messages = Messages.getAll();

        if (messages.length > 0) {
            publishServerEvent('messages', messages);
        }
    }

    function processCommonMessage(message) {
        var username = sessionStorage.getItem('chat.server:user.name');

        message.username = message.username || username;
        message.timestamp = Date.now();
        message.sender = true;

        sendMessage(message, username);
    }

    function processSystemMessage(message) {
        var username = sessionStorage.getItem('chat.server:user.name');

        message.username = username;

        sendMessage(message);
    }

    // Client event listeners

    Chat.Events.subscribe('chat.client', 'user.session', function(e) {
        if (typeof e.data === 'object' &&
            typeof e.data.session === 'string') {

            var session = sessionStorage.getItem('chat.server:user.session');

            if (session === e.data.session) {
                publishServerEvent('user.session', { session: session });

                sendUserList();
                sendHistory();
            } else {
                publishServerEvent('user.session.error', { reason: 'invalid session' });
            }
        } else {
            publishServerEvent('user.session.error', { reason: 'session required' });
        }
    });

    Chat.Events.subscribe('chat.client', 'user.login', function(e) {
        if (typeof e.data === 'object' &&
            typeof e.data.username === 'string' &&
            typeof e.data.password === 'string') {

            var username = e.data.username;
            var password = e.data.password;

            if (Users.loginUser(username, password)) {
                var session = generateSession();

                sessionStorage.setItem('chat.server:user.session', session);
                sessionStorage.setItem('chat.server:user.name', username);

                addOnlineUser(username);

                publishServerEvent('user.login', { username: username, session: session });
            } else {
                publishServerEvent('user.login.error', { reason: 'invalid credentials' });
            }
        } else {
            publishServerEvent('user.login.error', { reason: 'credentials required' });
        }
    });

    Chat.Events.subscribe('chat.client', 'user.logout', function() {
        var session = sessionStorage.getItem('chat.server:user.session');
        var username = sessionStorage.getItem('chat.server:user.name');

        if (session) {
            sessionStorage.removeItem('chat.server:user.session');
            sessionStorage.removeItem('chat.server:user.name');

            removeOnlineUser(username);
            sendLeaveMessage(username);

            publishServerEvent('user.logout', { session: session });
        } else {
            publishServerEvent('user.logout.error', { reason: 'not logged in' });
        }
    });

    Chat.Events.subscribe('chat.client', 'message', function(e) {
        if (typeof e.data === 'object') {
            switch (e.data.subtype) {
                case 'public':
                case 'personal':
                    processCommonMessage(e.data);
                    break;

                case 'system':
                    processSystemMessage(e.data);
                    break;
            }
        }
    });

    // Initialization

    setInterval(sendPublicOrPrivateMessage, 20000);
    setTimeout(addOnlineUser.bind(null, 'user1'), 10000);
})();
